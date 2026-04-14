import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase, ok, created, badRequest, notFound } from './supabase.js'

/**
 * Descrizione di un campo gestito dalla factory.
 *
 *   { column: 'legal_form' }                        -> camelCase 'legalForm' <-> snake_case 'legal_form'
 *   { column: 'country', default: 'IT' }            -> default applicato SOLO al create quando il campo non e' presente
 *   { column: 'is_active', default: true }          -> default applicato al create
 *
 * Tutti i campi elencati vengono:
 *   - copiati su create (con default quando assenti, altrimenti null)
 *   - aggiornati su update se presenti nel body (campi assenti non toccati)
 */
export interface FieldDef {
  column: string
  default?: unknown
}

export type FieldMap = Record<string, FieldDef>

/**
 * Config di un handler CRUD standard.
 */
export interface CrudConfig {
  /** Nome della tabella in DB (snake_case). */
  table: string
  /** Messaggio usato in notFound. */
  notFoundMessage: string
  /** Mappa dei campi camelCase -> { column, default? }. */
  fields: FieldMap
  /** Campi camelCase obbligatori alla create (validazione lato API). */
  requiredOnCreate?: string[]
  /** Ordinamento della lista. Piu' colonne possibili. Default: [{ column: 'name' }]. */
  orderBy?: Array<{ column: string; ascending?: boolean }>
  /**
   * Select custom per la list. Se omesso usa '*'.
   * Es: '*, subjects(name)' per joinare.
   */
  selectList?: string
  /**
   * Select custom per il get by id. Se omesso usa lo stesso di selectList.
   */
  selectById?: string
  /**
   * Trasforma una riga prima di restituirla (per liste e get by id).
   * Utile per appiattire join (es. subjects.name -> subject_name).
   */
  transformRow?: (row: Record<string, unknown>) => Record<string, unknown>
  /**
   * Post-processing della lista dopo il fetch iniziale (es. calcoli aggregati
   * che richiedono query aggiuntive, come sommare transazioni per riga).
   * Ritorna la lista finale di righe da restituire al client.
   */
  listPostProcess?: (
    sb: SupabaseClient,
    rows: Record<string, unknown>[],
  ) => Promise<Record<string, unknown>[]>
  /**
   * Controllo prima della delete. Se canDelete=false, ritorna badRequest con reason.
   */
  beforeDelete?: (sb: SupabaseClient, id: string) => Promise<{ canDelete: boolean; reason?: string }>
  /**
   * Hook dopo insert, prima di restituire la risposta. Permette side-effects
   * (es. generare rate automaticamente) e/o ri-fetchare con join.
   * Se ritorna un valore, quello viene usato come response data.
   */
  afterCreate?: (
    sb: SupabaseClient,
    created: Record<string, unknown>,
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | void>
  /**
   * Select usato per restituire la riga appena creata (se vuoi join anche in create).
   * Se omesso la create restituisce quanto arriva da Supabase.
   */
  selectAfterCreate?: string
}

function setTimestamp(obj: Record<string, unknown>, key: string) {
  obj[key] = new Date().toISOString()
}

function buildInsertPayload(body: Record<string, unknown>, fields: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [camelKey, def] of Object.entries(fields)) {
    if (body[camelKey] !== undefined) {
      out[def.column] = body[camelKey]
    } else if (def.default !== undefined) {
      out[def.column] = def.default
    } else {
      out[def.column] = null
    }
  }
  return out
}

function buildUpdatePayload(body: Record<string, unknown>, fields: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  setTimestamp(out, 'updated_at')
  for (const [camelKey, def] of Object.entries(fields)) {
    if (body[camelKey] !== undefined) {
      out[def.column] = body[camelKey]
    }
  }
  return out
}

function transformRows(
  rows: unknown[] | null | undefined,
  transform?: CrudConfig['transformRow'],
): unknown[] {
  if (!rows) return []
  if (!transform) return rows
  return rows.map((r) => transform(r as Record<string, unknown>))
}

/**
 * Genera un handler CRUD standard basato su CrudConfig.
 *
 * Gestisce:
 *   GET  /resource          -> list (con ordering + optional transform)
 *   GET  /resource/:id      -> get by id
 *   POST /resource          -> create (valida required, applica default)
 *   POST /resource + _action=update -> update (body deve contenere id)
 *   POST /resource + _action=delete -> delete (body deve contenere id, opzionale beforeDelete)
 *   PUT/PATCH /resource/:id -> update (legacy via path id)
 *   DELETE /resource/:id    -> delete (legacy via path id)
 *
 * Per azioni custom aggiuntive (es. 'pay-installment', 'auto-tag'),
 * usa `composeHandler` con un custom dispatcher prima del fallback alla factory.
 */
export function createCrudHandler(config: CrudConfig) {
  const {
    table,
    notFoundMessage,
    fields,
    requiredOnCreate = [],
    orderBy = [{ column: 'name' }],
    selectList = '*',
    selectById,
    transformRow,
    beforeDelete,
    afterCreate,
    selectAfterCreate,
    listPostProcess,
  } = config

  const resolvedSelectById = selectById ?? selectList

  return async function handler(
    req: VercelRequest,
    res: VercelResponse,
    id: string | null,
  ) {
    const sb = getSupabase()
    const method = req.method

    // GET list
    if (method === 'GET' && !id) {
      let q = sb.from(table).select(selectList)
      for (const ord of orderBy) {
        q = q.order(ord.column, { ascending: ord.ascending ?? true })
      }
      const { data, error } = await q
      if (error) throw error
      let rows = transformRows(data, transformRow) as Record<string, unknown>[]
      if (listPostProcess) rows = await listPostProcess(sb, rows)
      return ok(res, rows)
    }

    // GET by id
    if (method === 'GET' && id) {
      const { data, error } = await sb.from(table).select(resolvedSelectById).eq('id', id).single()
      if (error || !data) return notFound(res, notFoundMessage)
      const row = transformRow ? transformRow(data as unknown as Record<string, unknown>) : data
      return ok(res, row)
    }

    const body = (req.body || {}) as Record<string, unknown>
    const bodyAction = body._action as string | undefined

    // POST _action=update
    if (method === 'POST' && bodyAction === 'update') {
      const rowId = body.id as string
      if (!rowId) return badRequest(res, 'id e obbligatorio')
      const update = buildUpdatePayload(body, fields)
      const { data, error } = await sb.from(table).update(update).eq('id', rowId).select().single()
      if (error || !data) return notFound(res, notFoundMessage)
      return ok(res, data)
    }

    // POST _action=delete
    if (method === 'POST' && bodyAction === 'delete') {
      const rowId = body.id as string
      if (!rowId) return badRequest(res, 'id e obbligatorio')
      if (beforeDelete) {
        const check = await beforeDelete(sb, rowId)
        if (!check.canDelete) return badRequest(res, check.reason || 'Eliminazione non consentita')
      }
      const { data, error } = await sb.from(table).delete().eq('id', rowId).select('id').single()
      if (error || !data) return notFound(res, notFoundMessage)
      return ok(res, { deleted: true, id: rowId })
    }

    // POST create (nessun _action)
    if (method === 'POST' && !bodyAction) {
      for (const reqField of requiredOnCreate) {
        if (body[reqField] === undefined || body[reqField] === null || body[reqField] === '') {
          return badRequest(res, `${requiredOnCreate.join(', ')} ${requiredOnCreate.length > 1 ? 'sono obbligatori' : 'e obbligatorio'}`)
        }
      }
      const insert = buildInsertPayload(body, fields)
      const q = sb.from(table).insert(insert)
      const selectStr = selectAfterCreate ?? '*'
      const { data, error } = await q.select(selectStr).single()
      if (error) throw error

      if (afterCreate) {
        const replaced = await afterCreate(sb, data as unknown as Record<string, unknown>, body)
        if (replaced) return created(res, replaced)
      }
      return created(res, data)
    }

    // PUT/PATCH legacy (path id)
    if ((method === 'PUT' || method === 'PATCH') && id) {
      const update = buildUpdatePayload(body, fields)
      const { data, error } = await sb.from(table).update(update).eq('id', id).select().single()
      if (error || !data) return notFound(res, notFoundMessage)
      return ok(res, data)
    }

    // DELETE legacy (path id)
    if (method === 'DELETE' && id) {
      if (beforeDelete) {
        const check = await beforeDelete(sb, id)
        if (!check.canDelete) return badRequest(res, check.reason || 'Eliminazione non consentita')
      }
      const { data, error } = await sb.from(table).delete().eq('id', id).select('id').single()
      if (error || !data) return notFound(res, notFoundMessage)
      return ok(res, { deleted: true, id })
    }

    return badRequest(res, `Metodo ${method} non supportato`)
  }
}

/**
 * Tipo dell'handler ritornato dalla factory.
 */
export type CrudHandler = ReturnType<typeof createCrudHandler>

/**
 * Compone un handler con azioni custom che hanno precedenza sulla factory.
 *
 * Esempio:
 *   composeHandler(crudHandler, async (req, res, id) => {
 *     const bodyAction = (req.body as any)?._action
 *     if (req.method === 'POST' && bodyAction === 'pay-installment') {
 *       // gestisci...
 *       return true  // flag che indica: ho gestito
 *     }
 *     return false  // flag che indica: passa alla factory
 *   })
 */
export function composeHandler(
  fallback: CrudHandler,
  custom: (req: VercelRequest, res: VercelResponse, id: string | null) => Promise<boolean>,
) {
  return async function handler(req: VercelRequest, res: VercelResponse, id: string | null) {
    const handled = await custom(req, res, id)
    if (handled) return
    return fallback(req, res, id)
  }
}
