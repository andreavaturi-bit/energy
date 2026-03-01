import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  setCors,
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from './_lib/supabase.js'

// ── Utility ─────────────────────────────────────────────────

function extractId(segments: string[], resource: string): string | null {
  const idx = segments.indexOf(resource)
  if (idx === -1 || idx + 1 >= segments.length) return null
  return segments[idx + 1] || null
}

// ============================================================
// SUBJECTS
// ============================================================

async function handleSubjects(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb.from('subjects').select('*').order('name')
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb.from('subjects').select('*').eq('id', id).single()
    if (error || !data) return notFound(res, 'Soggetto non trovato')
    return ok(res, data)
  }

  // POST-based actions (update/delete via POST to avoid Vercel multi-segment path 404)
  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const subjectId = b.id as string
    if (!subjectId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.type !== undefined) update.type = b.type
    if (b.name !== undefined) update.name = b.name
    if (b.legalForm !== undefined) update.legal_form = b.legalForm
    if (b.taxId !== undefined) update.tax_id = b.taxId
    if (b.country !== undefined) update.country = b.country
    if (b.role !== undefined) update.role = b.role
    if (b.parentSubjectId !== undefined) update.parent_subject_id = b.parentSubjectId
    if (b.notes !== undefined) update.notes = b.notes
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('subjects').update(update).eq('id', subjectId).select().single()
    if (error || !data) return notFound(res, 'Soggetto non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const subjectId = (req.body as Record<string, unknown>)?.id as string
    if (!subjectId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('subjects').delete().eq('id', subjectId).select('id').single()
    if (error || !data) return notFound(res, 'Soggetto non trovato')
    return ok(res, { deleted: true, id: subjectId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type) return badRequest(res, 'name e type sono obbligatori')
    const { data, error } = await sb
      .from('subjects')
      .insert({
        type: b.type,
        name: b.name,
        legal_form: b.legalForm ?? null,
        tax_id: b.taxId ?? null,
        country: b.country ?? 'IT',
        role: b.role ?? null,
        parent_subject_id: b.parentSubjectId ?? null,
        notes: b.notes ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.type !== undefined) update.type = b.type
    if (b.name !== undefined) update.name = b.name
    if (b.legalForm !== undefined) update.legal_form = b.legalForm
    if (b.taxId !== undefined) update.tax_id = b.taxId
    if (b.country !== undefined) update.country = b.country
    if (b.role !== undefined) update.role = b.role
    if (b.parentSubjectId !== undefined) update.parent_subject_id = b.parentSubjectId
    if (b.notes !== undefined) update.notes = b.notes
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('subjects').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Soggetto non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { data, error } = await sb.from('subjects').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Soggetto non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// CONTAINERS
// ============================================================

async function handleContainers(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb
      .from('containers')
      .select('*, subjects(name)')
      .order('sort_order')
      .order('name')
    if (error) throw error

    // Fetch transaction sums per container (non-cancelled)
    const { data: txSums } = await sb
      .from('transactions')
      .select('container_id, amount')
      .neq('status', 'cancelled')

    const sumMap = new Map<string, number>()
    for (const t of txSums || []) {
      const cid = t.container_id as string
      const amt = parseFloat(t.amount as string) || 0
      sumMap.set(cid, (sumMap.get(cid) || 0) + amt)
    }

    // Flatten: subjects.name → subject_name, add current_balance
    const rows = (data || []).map((r: Record<string, unknown>) => {
      const { subjects, ...rest } = r as Record<string, unknown> & { subjects?: { name: string } }
      const initialBal = parseFloat(rest.initial_balance as string) || 0
      const txSum = sumMap.get(rest.id as string) || 0
      return {
        ...rest,
        subject_name: subjects?.name ?? null,
        current_balance: (initialBal + txSum).toFixed(4),
      }
    })
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('containers')
      .select('*, subjects(name)')
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    const { subjects, ...rest } = data as Record<string, unknown> & { subjects?: { name: string } }
    return ok(res, { ...rest, subject_name: subjects?.name ?? null })
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const cId = b.id as string
    if (!cId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.subjectId !== undefined) update.subject_id = b.subjectId
    if (b.name !== undefined) update.name = b.name
    if (b.type !== undefined) update.type = b.type
    if (b.provider !== undefined) update.provider = b.provider
    if (b.currency !== undefined) update.currency = b.currency
    if (b.isMultiCurrency !== undefined) update.is_multi_currency = b.isMultiCurrency
    if (b.initialBalance !== undefined) update.initial_balance = b.initialBalance
    if (b.billingDay !== undefined) update.billing_day = b.billingDay
    if (b.linkedContainerId !== undefined) update.linked_container_id = b.linkedContainerId
    if (b.icon !== undefined) update.icon = b.icon
    if (b.color !== undefined) update.color = b.color
    if (b.sortOrder !== undefined) update.sort_order = b.sortOrder
    if (b.isPinned !== undefined) update.is_pinned = b.isPinned
    if (b.isActive !== undefined) update.is_active = b.isActive
    if (b.notes !== undefined) update.notes = b.notes

    const { data, error } = await sb.from('containers').update(update).eq('id', cId).select().single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const cId = (req.body as Record<string, unknown>)?.id as string
    if (!cId) return badRequest(res, 'id è obbligatorio')
    const { count } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('container_id', cId)
    if (count && count > 0) {
      return badRequest(res, `Impossibile eliminare: ci sono ${count} transazioni collegate a questo contenitore.`)
    }
    const { data, error } = await sb.from('containers').delete().eq('id', cId).select('id').single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    return ok(res, { deleted: true, id: cId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type || !b.subjectId) return badRequest(res, 'name, type e subjectId sono obbligatori')
    const { data, error } = await sb
      .from('containers')
      .insert({
        subject_id: b.subjectId,
        name: b.name,
        type: b.type,
        provider: b.provider ?? null,
        currency: b.currency ?? 'EUR',
        is_multi_currency: b.isMultiCurrency ?? false,
        initial_balance: b.initialBalance ?? '0',
        billing_day: b.billingDay ?? null,
        linked_container_id: b.linkedContainerId ?? null,
        goal_amount: b.goalAmount ?? null,
        goal_description: b.goalDescription ?? null,
        icon: b.icon ?? null,
        color: b.color ?? null,
        sort_order: b.sortOrder ?? 0,
        is_pinned: b.isPinned ?? false,
        is_active: b.isActive ?? true,
        notes: b.notes ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.subjectId !== undefined) update.subject_id = b.subjectId
    if (b.name !== undefined) update.name = b.name
    if (b.type !== undefined) update.type = b.type
    if (b.provider !== undefined) update.provider = b.provider
    if (b.currency !== undefined) update.currency = b.currency
    if (b.isMultiCurrency !== undefined) update.is_multi_currency = b.isMultiCurrency
    if (b.initialBalance !== undefined) update.initial_balance = b.initialBalance
    if (b.billingDay !== undefined) update.billing_day = b.billingDay
    if (b.linkedContainerId !== undefined) update.linked_container_id = b.linkedContainerId
    if (b.icon !== undefined) update.icon = b.icon
    if (b.color !== undefined) update.color = b.color
    if (b.sortOrder !== undefined) update.sort_order = b.sortOrder
    if (b.isPinned !== undefined) update.is_pinned = b.isPinned
    if (b.isActive !== undefined) update.is_active = b.isActive
    if (b.notes !== undefined) update.notes = b.notes

    const { data, error } = await sb.from('containers').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { count } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('container_id', id)
    if (count && count > 0) {
      return badRequest(res, `Impossibile eliminare: ci sono ${count} transazioni collegate a questo contenitore.`)
    }
    const { data, error } = await sb.from('containers').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// COUNTERPARTIES
// ============================================================

async function handleCounterparties(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb.from('counterparties').select('*').order('name')
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb.from('counterparties').select('*').eq('id', id).single()
    if (error || !data) return notFound(res, 'Controparte non trovata')
    return ok(res, data)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const cpId = b.id as string
    if (!cpId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.name !== undefined) update.name = b.name
    if (b.type !== undefined) update.type = b.type
    if (b.defaultCategory !== undefined) update.default_category = b.defaultCategory
    if (b.notes !== undefined) update.notes = b.notes
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('counterparties').update(update).eq('id', cpId).select().single()
    if (error || !data) return notFound(res, 'Controparte non trovata')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const cpId = (req.body as Record<string, unknown>)?.id as string
    if (!cpId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('counterparties').delete().eq('id', cpId).select('id').single()
    if (error || !data) return notFound(res, 'Controparte non trovata')
    return ok(res, { deleted: true, id: cpId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name) return badRequest(res, 'name è obbligatorio')
    const { data, error } = await sb
      .from('counterparties')
      .insert({
        name: b.name,
        type: b.type ?? null,
        default_category: b.defaultCategory ?? null,
        notes: b.notes ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.name !== undefined) update.name = b.name
    if (b.type !== undefined) update.type = b.type
    if (b.defaultCategory !== undefined) update.default_category = b.defaultCategory
    if (b.notes !== undefined) update.notes = b.notes
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('counterparties').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Controparte non trovata')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { data, error } = await sb.from('counterparties').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Controparte non trovata')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// TAGS
// ============================================================

async function handleTags(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb.from('tags').select('*').order('type').order('name')
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb.from('tags').select('*').eq('id', id).single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const tagId = b.id as string
    if (!tagId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.parentId !== undefined) update.parent_id = b.parentId
    if (b.type !== undefined) update.type = b.type
    if (b.color !== undefined) update.color = b.color
    if (b.icon !== undefined) update.icon = b.icon
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('tags').update(update).eq('id', tagId).select().single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const tagId = (req.body as Record<string, unknown>)?.id as string
    if (!tagId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('tags').delete().eq('id', tagId).select('id').single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, { deleted: true, id: tagId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type) return badRequest(res, 'name e type sono obbligatori')
    const { data, error } = await sb
      .from('tags')
      .insert({
        name: b.name,
        parent_id: b.parentId ?? null,
        type: b.type,
        color: b.color ?? null,
        icon: b.icon ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.parentId !== undefined) update.parent_id = b.parentId
    if (b.type !== undefined) update.type = b.type
    if (b.color !== undefined) update.color = b.color
    if (b.icon !== undefined) update.icon = b.icon
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('tags').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { data, error } = await sb.from('tags').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// TRANSACTIONS
// ============================================================

async function handleTransactions(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => {
      const v = params[k]
      return Array.isArray(v) ? v[0] : v
    }
    const limit = Math.min(parseInt(param('limit') || '200'), 1000)
    const offset = parseInt(param('offset') || '0')

    let query = sb
      .from('transactions')
      .select(
        '*, containers(name, color, currency), counterparties(name), subjects!transactions_shared_with_subject_id_subjects_id_fk(name)',
        { count: 'exact' },
      )

    if (param('containerId')) query = query.eq('container_id', param('containerId')!)
    if (param('type')) query = query.eq('type', param('type')!)
    if (param('status')) query = query.eq('status', param('status')!)
    if (param('dateFrom')) query = query.gte('date', param('dateFrom')!)
    if (param('dateTo')) query = query.lte('date', param('dateTo')!)
    if (param('search')) {
      const s = param('search')!
      query = query.or(`description.ilike.%${s}%,notes.ilike.%${s}%`)
    }

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Flatten joined objects
    const rows = (data || []).map((r: Record<string, unknown>) => {
      const row = { ...r } as Record<string, unknown>
      const containers = row.containers as { name?: string; color?: string; currency?: string } | null
      const counterparties = row.counterparties as { name?: string } | null
      const subjects = row.subjects as { name?: string } | null
      row.container_name = containers?.name ?? null
      row.container_color = containers?.color ?? null
      row.container_currency = containers?.currency ?? null
      row.counterparty_name = counterparties?.name ?? null
      row.shared_with_name = subjects?.name ?? null
      delete row.containers
      delete row.counterparties
      delete row.subjects
      return row
    })

    return ok(res, { rows, total: count ?? 0, limit, offset })
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('transactions')
      .select(
        '*, containers(name, color), counterparties(name), subjects!transactions_shared_with_subject_id_subjects_id_fk(name)',
      )
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    // Get tags through junction table
    const { data: tagRows } = await sb
      .from('transaction_tags')
      .select('tags(*)')
      .eq('transaction_id', id)
    const tags = (tagRows || []).map((r: Record<string, unknown>) => r.tags)

    // Flatten
    const row = { ...data } as Record<string, unknown>
    const containers = row.containers as { name?: string; color?: string } | null
    const counterparties = row.counterparties as { name?: string } | null
    const subjects = row.subjects as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.shared_with_name = subjects?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.subjects

    return ok(res, { ...row, tags })
  }

  // POST /transactions?action=batch — bulk import (chunked, with dedup)
  const params = (req.query || {}) as Record<string, string | string[]>
  const actionParam = Array.isArray(params.action) ? params.action[0] : params.action

  // POST /transactions?action=check-hashes — check which hashes already exist in DB
  if (method === 'POST' && actionParam === 'check-hashes') {
    const b = req.body || {}
    const containerId = b.containerId as string
    const hashes = b.hashes as string[]
    if (!containerId || !Array.isArray(hashes) || hashes.length === 0) {
      return badRequest(res, 'containerId e hashes[] sono obbligatori')
    }

    // Query in chunks of 500 to avoid query size limits
    const HASH_CHUNK = 500
    const existingHashes: string[] = []
    for (let i = 0; i < hashes.length; i += HASH_CHUNK) {
      const chunk = hashes.slice(i, i + HASH_CHUNK)
      const { data, error } = await sb
        .from('transactions')
        .select('external_hash')
        .eq('container_id', containerId)
        .in('external_hash', chunk)
      if (error) throw error
      if (data) {
        existingHashes.push(...data.map((r: { external_hash: string }) => r.external_hash))
      }
    }

    return ok(res, { existingHashes })
  }

  // POST /transactions?action=find-matches — find manual transactions matching imported ones
  if (method === 'POST' && actionParam === 'find-matches') {
    const b = req.body || {}
    const containerId = b.containerId as string
    const candidates = b.candidates as Array<{ date: string; amount: number; description: string }>
    if (!containerId || !Array.isArray(candidates) || candidates.length === 0) {
      return badRequest(res, 'containerId e candidates[] sono obbligatori')
    }

    // Find manual transactions in this container within ±5 days of any candidate date
    const allDates = candidates.map(c => c.date)
    const minDate = allDates.sort()[0]
    const maxDate = allDates.sort().reverse()[0]

    // Extend range by 5 days
    const fromDate = new Date(minDate)
    fromDate.setDate(fromDate.getDate() - 5)
    const toDate = new Date(maxDate)
    toDate.setDate(toDate.getDate() + 5)

    const { data: manualTxs, error } = await sb
      .from('transactions')
      .select('id, date, description, amount, currency, type, status, source, counterparty_id, container_id')
      .eq('container_id', containerId)
      .eq('source', 'manual')
      .neq('status', 'cancelled')
      .gte('date', fromDate.toISOString().slice(0, 10))
      .lte('date', toDate.toISOString().slice(0, 10))

    if (error) throw error

    // Return manual transactions for client-side matching
    return ok(res, { manualTransactions: manualTxs || [] })
  }

  // POST /transactions?action=reconcile — merge a manual transaction with an imported one
  if (method === 'POST' && actionParam === 'reconcile') {
    const b = req.body || {}
    const keepId = b.keepId as string
    const removeId = b.removeId as string
    if (!keepId || !removeId) return badRequest(res, 'keepId e removeId sono obbligatori')

    // Fetch the transaction to remove (to grab its external_hash/external_id)
    const { data: removeTx, error: fetchErr } = await sb
      .from('transactions')
      .select('external_hash, external_id, value_date')
      .eq('id', removeId)
      .single()
    if (fetchErr || !removeTx) return notFound(res, 'Transazione da rimuovere non trovata')

    // Update the kept transaction: copy dedup fields so future imports recognize it
    const keepUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (removeTx.external_hash) keepUpdate.external_hash = removeTx.external_hash
    if (removeTx.external_id) keepUpdate.external_id = removeTx.external_id
    if (removeTx.value_date) keepUpdate.value_date = removeTx.value_date

    const { error: updateErr } = await sb.from('transactions').update(keepUpdate).eq('id', keepId)
    if (updateErr) throw updateErr

    // Delete the removed transaction
    const { error: deleteErr } = await sb.from('transactions').delete().eq('id', removeId)
    if (deleteErr) throw deleteErr

    return ok(res, { reconciled: true, keptId: keepId, removedId: removeId })
  }

  // POST /transactions?action=reconcile-bulk — batch reconcile multiple pairs
  if (method === 'POST' && actionParam === 'reconcile-bulk') {
    const b = req.body || {}
    const pairs = b.pairs as Array<{ keepId: string; removeId: string }>
    if (!Array.isArray(pairs) || pairs.length === 0) {
      return badRequest(res, 'pairs[] è obbligatorio')
    }

    let reconciledCount = 0
    const errors: string[] = []

    for (const pair of pairs) {
      const { data: removeTx } = await sb
        .from('transactions')
        .select('external_hash, external_id, value_date')
        .eq('id', pair.removeId)
        .single()

      if (!removeTx) {
        errors.push(`Transazione ${pair.removeId} non trovata`)
        continue
      }

      const keepUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (removeTx.external_hash) keepUpdate.external_hash = removeTx.external_hash
      if (removeTx.external_id) keepUpdate.external_id = removeTx.external_id
      if (removeTx.value_date) keepUpdate.value_date = removeTx.value_date

      await sb.from('transactions').update(keepUpdate).eq('id', pair.keepId)
      await sb.from('transactions').delete().eq('id', pair.removeId)
      reconciledCount++
    }

    return ok(res, { reconciled: reconciledCount, errors: errors.length > 0 ? errors : undefined })
  }

  if (method === 'POST' && actionParam === 'batch') {
    const items = req.body?.transactions as unknown[]
    if (!Array.isArray(items) || items.length === 0) {
      return badRequest(res, 'transactions array is required and must not be empty')
    }

    const rows = items.map((item: unknown) => {
      const b = item as Record<string, unknown>
      return {
      date: b.date,
      value_date: b.valueDate ?? null,
      description: b.description ?? null,
      notes: b.notes ?? null,
      amount: b.amount,
      currency: b.currency ?? 'EUR',
      amount_eur: b.amountEur ?? null,
      exchange_rate: b.exchangeRate ?? null,
      container_id: b.containerId,
      counterparty_id: b.counterpartyId ?? null,
      type: b.type,
      transfer_linked_id: b.transferLinkedId ?? null,
      status: b.status ?? 'completed',
      source: b.source ?? 'manual',
      shared_with_subject_id: b.sharedWithSubjectId ?? null,
      share_percentage: b.sharePercentage ?? null,
      installment_plan_id: b.installmentPlanId ?? null,
      installment_number: b.installmentNumber ?? null,
      external_id: b.externalId ?? null,
      external_hash: (b.externalHash as string) ?? null,
    }})

    // Dedup server-side: filter out rows whose external_hash already exists
    const hashesToCheck = rows
      .map(r => r.external_hash)
      .filter((h): h is string => h !== null && h !== undefined)
    let existingHashSet = new Set<string>()

    if (hashesToCheck.length > 0) {
      const containerIds = [...new Set(rows.map(r => r.container_id).filter(Boolean))]
      for (const cid of containerIds) {
        const containerHashes = rows
          .filter(r => r.container_id === cid && r.external_hash)
          .map(r => r.external_hash as string)
        if (containerHashes.length === 0) continue
        for (let i = 0; i < containerHashes.length; i += 500) {
          const chunk = containerHashes.slice(i, i + 500)
          const { data } = await sb
            .from('transactions')
            .select('external_hash')
            .eq('container_id', cid)
            .in('external_hash', chunk)
          if (data) {
            data.forEach((r: { external_hash: string }) => existingHashSet.add(r.external_hash))
          }
        }
      }
    }

    // Filter out duplicates
    const dedupedRows = rows.filter(r => {
      if (r.external_hash && existingHashSet.has(r.external_hash)) return false
      return true
    })
    const skippedDuplicates = rows.length - dedupedRows.length

    // Insert in chunks to avoid timeouts and payload limits
    const CHUNK_SIZE = 50
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < dedupedRows.length; i += CHUNK_SIZE) {
      const chunk = dedupedRows.slice(i, i + CHUNK_SIZE)
      const { error } = await sb
        .from('transactions')
        .insert(chunk)
      if (error) {
        errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`)
      } else {
        insertedCount += chunk.length
      }
    }

    if (errors.length > 0 && insertedCount === 0 && dedupedRows.length > 0) {
      return res.status(500).json({
        error: 'Import failed',
        message: errors.join('; '),
        data: { inserted: 0, failed: dedupedRows.length, skippedDuplicates, errors },
      })
    }

    return created(res, {
      inserted: insertedCount,
      failed: dedupedRows.length - insertedCount,
      skippedDuplicates,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  }

  // POST transfer — create a linked transfer pair
  // Detect via query ?action=transfer OR body _action:'transfer'
  const bodyAction = (req.body as Record<string, unknown>)?._action
  if (method === 'POST' && (actionParam === 'transfer' || bodyAction === 'transfer')) {
    const b = req.body || {}
    if (!b.date || !b.amount || !b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'date, amount, fromContainerId e toContainerId sono obbligatori')
    }

    const absAmount = Math.abs(parseFloat(b.amount)).toFixed(4)

    // 1. Create transfer_out (negative amount, source container)
    const { data: outTx, error: outErr } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: `-${absAmount}`,
        currency: b.currency ?? 'EUR',
        container_id: b.fromContainerId,
        type: 'transfer_out',
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
      })
      .select()
      .single()
    if (outErr) throw outErr

    // 2. Create transfer_in (positive amount, destination container)
    const { data: inTx, error: inErr } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount,
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
      })
      .select()
      .single()
    if (inErr) throw inErr

    // 3. Cross-link via transfer_linked_id
    await sb.from('transactions').update({ transfer_linked_id: inTx.id }).eq('id', outTx.id)
    await sb.from('transactions').update({ transfer_linked_id: outTx.id }).eq('id', inTx.id)

    return created(res, {
      transferOut: { ...outTx, transfer_linked_id: inTx.id },
      transferIn: { ...inTx, transfer_linked_id: outTx.id },
    })
  }

  // POST update-transfer — update both sides of a transfer pair
  // Uses POST instead of PUT to avoid Vercel routing issues with multi-segment paths
  if (method === 'POST' && bodyAction === 'update-transfer') {
    const b = req.body || {}
    const txId = b.id as string
    if (!txId || !b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'id, fromContainerId e toContainerId sono obbligatori')
    }

    const now = new Date().toISOString()
    const absAmount = b.amount ? Math.abs(parseFloat(b.amount)).toFixed(4) : undefined

    // Fetch the existing transaction to find its linked pair
    const { data: existingTx, error: fetchErr } = await sb
      .from('transactions')
      .select('id, type, transfer_linked_id')
      .eq('id', txId)
      .single()
    if (fetchErr || !existingTx) return notFound(res, 'Transazione non trovata')

    // Determine which side is transfer_out and which is transfer_in
    let outId: string | null = null
    let inId: string | null = null
    if (existingTx.type === 'transfer_out') {
      outId = txId
      inId = existingTx.transfer_linked_id
    } else if (existingTx.type === 'transfer_in') {
      inId = txId
      outId = existingTx.transfer_linked_id
    } else {
      // Converting a non-transfer to transfer: this becomes transfer_out
      outId = txId
    }

    // Build common fields
    const commonFields: Record<string, unknown> = { updated_at: now }
    if (b.date !== undefined) commonFields.date = b.date
    if (b.description !== undefined) commonFields.description = b.description
    if (b.currency !== undefined) commonFields.currency = b.currency
    if (b.status !== undefined) commonFields.status = b.status
    if (b.notes !== undefined) commonFields.notes = b.notes

    // Update transfer_out side
    if (outId) {
      const outUpdate = {
        ...commonFields,
        container_id: b.fromContainerId,
        type: 'transfer_out',
        ...(absAmount ? { amount: `-${absAmount}` } : {}),
      }
      const { error } = await sb.from('transactions').update(outUpdate).eq('id', outId)
      if (error) throw error
    }

    // Update or create transfer_in side
    if (inId) {
      const inUpdate = {
        ...commonFields,
        container_id: b.toContainerId,
        type: 'transfer_in',
        ...(absAmount ? { amount: absAmount } : {}),
      }
      const { error } = await sb.from('transactions').update(inUpdate).eq('id', inId)
      if (error) throw error
    } else {
      // No linked transaction exists — create the transfer_in side
      const inInsert: Record<string, unknown> = {
        date: b.date ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ?? '0',
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: outId,
      }
      // Fill date from the existing out-side if not provided
      if (!inInsert.date && outId) {
        const { data: outData } = await sb.from('transactions').select('date').eq('id', outId).single()
        inInsert.date = outData?.date ?? new Date().toISOString().slice(0, 10)
      }
      const { data: newIn, error } = await sb.from('transactions').insert(inInsert).select().single()
      if (error) throw error
      // Link the out side to the new in side
      await sb.from('transactions').update({ transfer_linked_id: newIn.id }).eq('id', outId!)
    }

    return ok(res, { updated: true })
  }

  // POST get-by-id — fetch a single transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'get') {
    const txId = (req.body as Record<string, unknown>)?.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    const { data, error } = await sb
      .from('transactions')
      .select(
        '*, containers(name, color), counterparties(name), subjects!transactions_shared_with_subject_id_subjects_id_fk(name)',
      )
      .eq('id', txId)
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    const { data: tagRows } = await sb
      .from('transaction_tags')
      .select('tags(*)')
      .eq('transaction_id', txId)
    const tags = (tagRows || []).map((r: Record<string, unknown>) => r.tags)

    const row = { ...data } as Record<string, unknown>
    const containers = row.containers as { name?: string; color?: string } | null
    const counterparties = row.counterparties as { name?: string } | null
    const subjects = row.subjects as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.shared_with_name = subjects?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.subjects

    return ok(res, { ...row, tags })
  }

  // POST update — update a transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const txId = b.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.date !== undefined) update.date = b.date
    if (b.valueDate !== undefined) update.value_date = b.valueDate
    if (b.description !== undefined) update.description = b.description
    if (b.notes !== undefined) update.notes = b.notes
    if (b.amount !== undefined) update.amount = b.amount
    if (b.currency !== undefined) update.currency = b.currency
    if (b.amountEur !== undefined) update.amount_eur = b.amountEur
    if (b.exchangeRate !== undefined) update.exchange_rate = b.exchangeRate
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.transferLinkedId !== undefined) update.transfer_linked_id = b.transferLinkedId
    if (b.status !== undefined) update.status = b.status
    if (b.sharedWithSubjectId !== undefined) update.shared_with_subject_id = b.sharedWithSubjectId
    if (b.sharePercentage !== undefined) update.share_percentage = b.sharePercentage

    const { data, error } = await sb
      .from('transactions')
      .update(update)
      .eq('id', txId)
      .select()
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sb.from('transaction_tags').delete().eq('transaction_id', txId)
      if (tagIds.length > 0) {
        await sb.from('transaction_tags').insert(
          tagIds.map((tagId: string) => ({ transaction_id: txId, tag_id: tagId })),
        )
      }
    }

    return ok(res, data)
  }

  // POST delete — delete a transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'delete') {
    const txId = (req.body as Record<string, unknown>)?.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    // If this is part of a transfer pair, delete the linked side too
    const { data: txToDelete } = await sb
      .from('transactions')
      .select('transfer_linked_id')
      .eq('id', txId)
      .single()
    if (txToDelete?.transfer_linked_id) {
      await sb.from('transactions').delete().eq('id', txToDelete.transfer_linked_id)
    }

    const { data, error } = await sb.from('transactions').delete().eq('id', txId).select('id').single()
    if (error || !data) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id: txId, linkedDeleted: !!txToDelete?.transfer_linked_id })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.date || !b.amount || !b.containerId || !b.type) {
      return badRequest(res, 'date, amount, containerId e type sono obbligatori')
    }

    const { data, error } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        value_date: b.valueDate ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: b.amount,
        currency: b.currency ?? 'EUR',
        amount_eur: b.amountEur ?? null,
        exchange_rate: b.exchangeRate ?? null,
        container_id: b.containerId,
        counterparty_id: b.counterpartyId ?? null,
        type: b.type,
        transfer_linked_id: b.transferLinkedId ?? null,
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
        shared_with_subject_id: b.sharedWithSubjectId ?? null,
        share_percentage: b.sharePercentage ?? null,
        installment_plan_id: b.installmentPlanId ?? null,
        installment_number: b.installmentNumber ?? null,
        external_id: b.externalId ?? null,
        external_hash: b.externalHash ?? null,
      })
      .select()
      .single()
    if (error) throw error

    // Handle tags
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds && tagIds.length > 0 && data) {
      await sb.from('transaction_tags').insert(
        tagIds.map((tagId: string) => ({ transaction_id: data.id, tag_id: tagId })),
      )
    }

    return created(res, data)
  }

  // PUT transfer — update both sides of a transfer pair
  // Detect via query ?action=transfer OR body _action:'transfer'
  const putBodyAction = (req.body as Record<string, unknown>)?._action
  if ((method === 'PUT' || method === 'PATCH') && id && (actionParam === 'transfer' || putBodyAction === 'transfer')) {
    const b = req.body || {}
    if (!b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'fromContainerId e toContainerId sono obbligatori')
    }

    const now = new Date().toISOString()
    const absAmount = b.amount ? Math.abs(parseFloat(b.amount)).toFixed(4) : undefined

    // Fetch the existing transaction to find its linked pair
    const { data: existingTx, error: fetchErr } = await sb
      .from('transactions')
      .select('id, type, transfer_linked_id')
      .eq('id', id)
      .single()
    if (fetchErr || !existingTx) return notFound(res, 'Transazione non trovata')

    // Determine which side is transfer_out and which is transfer_in
    let outId: string | null = null
    let inId: string | null = null
    if (existingTx.type === 'transfer_out') {
      outId = id
      inId = existingTx.transfer_linked_id
    } else if (existingTx.type === 'transfer_in') {
      inId = id
      outId = existingTx.transfer_linked_id
    } else {
      // Converting a non-transfer to transfer: this becomes transfer_out
      outId = id
    }

    // Build common fields
    const commonFields: Record<string, unknown> = { updated_at: now }
    if (b.date !== undefined) commonFields.date = b.date
    if (b.description !== undefined) commonFields.description = b.description
    if (b.currency !== undefined) commonFields.currency = b.currency
    if (b.status !== undefined) commonFields.status = b.status
    if (b.notes !== undefined) commonFields.notes = b.notes

    // Update transfer_out side
    if (outId) {
      const outUpdate = {
        ...commonFields,
        container_id: b.fromContainerId,
        type: 'transfer_out',
        ...(absAmount ? { amount: `-${absAmount}` } : {}),
      }
      const { error } = await sb.from('transactions').update(outUpdate).eq('id', outId)
      if (error) throw error
    }

    // Update or create transfer_in side
    if (inId) {
      const inUpdate = {
        ...commonFields,
        container_id: b.toContainerId,
        type: 'transfer_in',
        ...(absAmount ? { amount: absAmount } : {}),
      }
      const { error } = await sb.from('transactions').update(inUpdate).eq('id', inId)
      if (error) throw error
    } else {
      // No linked transaction exists — create the transfer_in side
      const inInsert: Record<string, unknown> = {
        date: b.date ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ?? '0',
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: outId,
      }
      // Fill date from the existing out-side if not provided
      if (!inInsert.date && outId) {
        const { data: outData } = await sb.from('transactions').select('date').eq('id', outId).single()
        inInsert.date = outData?.date ?? new Date().toISOString().slice(0, 10)
      }
      const { data: newIn, error } = await sb.from('transactions').insert(inInsert).select().single()
      if (error) throw error
      // Link the out side to the new in side
      await sb.from('transactions').update({ transfer_linked_id: newIn.id }).eq('id', outId!)
    }

    // If we converted a non-transfer, create the out side link
    if (!outId && inId) {
      const outInsert: Record<string, unknown> = {
        date: b.date ?? new Date().toISOString().slice(0, 10),
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ? `-${absAmount}` : '0',
        currency: b.currency ?? 'EUR',
        container_id: b.fromContainerId,
        type: 'transfer_out',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: inId,
      }
      const { data: newOut, error } = await sb.from('transactions').insert(outInsert).select().single()
      if (error) throw error
      await sb.from('transactions').update({ transfer_linked_id: newOut.id }).eq('id', inId)
    }

    return ok(res, { updated: true })
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.date !== undefined) update.date = b.date
    if (b.valueDate !== undefined) update.value_date = b.valueDate
    if (b.description !== undefined) update.description = b.description
    if (b.notes !== undefined) update.notes = b.notes
    if (b.amount !== undefined) update.amount = b.amount
    if (b.currency !== undefined) update.currency = b.currency
    if (b.amountEur !== undefined) update.amount_eur = b.amountEur
    if (b.exchangeRate !== undefined) update.exchange_rate = b.exchangeRate
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.transferLinkedId !== undefined) update.transfer_linked_id = b.transferLinkedId
    if (b.status !== undefined) update.status = b.status
    if (b.sharedWithSubjectId !== undefined) update.shared_with_subject_id = b.sharedWithSubjectId
    if (b.sharePercentage !== undefined) update.share_percentage = b.sharePercentage

    const { data, error } = await sb
      .from('transactions')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    // Update tags if provided
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sb.from('transaction_tags').delete().eq('transaction_id', id)
      if (tagIds.length > 0) {
        await sb.from('transaction_tags').insert(
          tagIds.map((tagId: string) => ({ transaction_id: id, tag_id: tagId })),
        )
      }
    }

    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    // If this is part of a transfer pair, delete the linked side too
    const { data: txToDelete } = await sb
      .from('transactions')
      .select('transfer_linked_id')
      .eq('id', id)
      .single()
    if (txToDelete?.transfer_linked_id) {
      await sb.from('transactions').delete().eq('id', txToDelete.transfer_linked_id)
    }

    const { data, error } = await sb.from('transactions').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id, linkedDeleted: !!txToDelete?.transfer_linked_id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// RECURRENCES
// ============================================================

async function handleRecurrences(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  // POST /recurrences { _action: 'detect' } — auto-detect recurring patterns from transactions
  const bodyActionRec = (req.body as Record<string, unknown>)?._action
  if (method === 'POST' && bodyActionRec === 'detect') {
    const b = req.body || {}
    const dateFrom = (b.dateFrom as string) || null
    const dateTo = (b.dateTo as string) || null
    const containerId = (b.containerId as string) || null
    const minOccurrences = (b.minOccurrences as number) || 3

    // Fetch completed transactions (non-transfer, non-cancelled)
    let query = sb
      .from('transactions')
      .select('id, date, description, amount, currency, type, container_id, counterparty_id, source')
      .neq('status', 'cancelled')
      .not('type', 'in', '("transfer_in","transfer_out")')
      .order('date', { ascending: true })

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
    if (containerId) query = query.eq('container_id', containerId)

    const { data: transactions, error } = await query
    if (error) throw error

    // Fetch container and counterparty names for display
    const { data: allContainers } = await sb.from('containers').select('id, name')
    const { data: allCounterparties } = await sb.from('counterparties').select('id, name')
    const containerMap = new Map((allContainers || []).map((c: { id: string; name: string }) => [c.id, c.name]))
    const counterpartyMap = new Map((allCounterparties || []).map((c: { id: string; name: string }) => [c.id, c.name]))

    // --- Pattern detection algorithm ---
    const txs = transactions || []

    // Step 1: Group by similarity key
    type TxRecord = typeof txs[number]
    const groups = new Map<string, TxRecord[]>()

    for (const tx of txs) {
      // Grouping priority: counterparty > normalized description
      let key: string
      if (tx.counterparty_id) {
        key = `cp:${tx.counterparty_id}:${tx.container_id}:${parseFloat(tx.amount as string) >= 0 ? 'in' : 'out'}`
      } else {
        // Normalize description: lowercase, remove numbers/dates, trim
        const desc = ((tx.description as string) || '')
          .toLowerCase()
          .replace(/\d{2}[/\-.]\d{2}[/\-.]\d{2,4}/g, '') // remove dates
          .replace(/\d+[,.]?\d*/g, '')                      // remove numbers
          .replace(/\s+/g, ' ')
          .trim()
        key = `desc:${desc}:${tx.container_id}:${parseFloat(tx.amount as string) >= 0 ? 'in' : 'out'}`
      }
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    }

    // Step 2: Analyze each group
    interface DetectedPattern {
      description: string
      counterpartyId: string | null
      counterpartyName: string | null
      containerId: string
      containerName: string | null
      type: string
      frequency: string
      dayOfMonth: number | null
      dayOfWeek: number | null
      avgAmount: number
      medianAmount: number
      amountVariance: number
      amountIsEstimate: boolean
      confidence: number
      occurrences: number
      transactionIds: string[]
      lastDate: string
    }

    const patterns: DetectedPattern[] = []

    for (const [, groupTxs] of groups) {
      if (groupTxs.length < minOccurrences) continue

      // Calculate timespan
      const dates = groupTxs.map(t => new Date(t.date as string).getTime()).sort((a, b) => a - b)
      const timespanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
      if (timespanDays < 20) continue // Too short to detect patterns

      // Calculate intervals between consecutive transactions
      const intervals: number[] = []
      for (let i = 1; i < dates.length; i++) {
        intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
      }

      if (intervals.length === 0) continue

      const medianInterval = intervals.slice().sort((a, b) => a - b)[Math.floor(intervals.length / 2)]
      const meanInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
      const intervalStddev = Math.sqrt(intervals.reduce((s, v) => s + (v - meanInterval) ** 2, 0) / intervals.length)
      const intervalCV = meanInterval > 0 ? intervalStddev / meanInterval : 999

      // Classify frequency
      let frequency: string | null = null
      if (intervalCV < 0.35) {
        if (medianInterval >= 5 && medianInterval <= 9) frequency = 'weekly'
        else if (medianInterval >= 12 && medianInterval <= 16) frequency = 'biweekly'
        else if (medianInterval >= 25 && medianInterval <= 35) frequency = 'monthly'
        else if (medianInterval >= 55 && medianInterval <= 65) frequency = 'bimonthly'
        else if (medianInterval >= 80 && medianInterval <= 100) frequency = 'quarterly'
        else if (medianInterval >= 170 && medianInterval <= 195) frequency = 'semi_annual'
        else if (medianInterval >= 350 && medianInterval <= 380) frequency = 'annual'
      }

      if (!frequency) continue // Can't determine frequency

      // Analyze amounts
      const amounts = groupTxs.map(t => Math.abs(parseFloat(t.amount as string)))
      const sortedAmounts = amounts.slice().sort((a, b) => a - b)
      const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length
      const medianAmount = sortedAmounts[Math.floor(sortedAmounts.length / 2)]
      const amountStddev = Math.sqrt(amounts.reduce((s, v) => s + (v - avgAmount) ** 2, 0) / amounts.length)
      const amountCV = avgAmount > 0 ? amountStddev / avgAmount : 0
      const amountIsEstimate = amountCV > 0.05

      // Determine day of month/week
      let dayOfMonth: number | null = null
      let dayOfWeek: number | null = null

      if (['monthly', 'bimonthly', 'quarterly', 'semi_annual', 'annual'].includes(frequency)) {
        const days = groupTxs.map(t => new Date(t.date as string).getDate())
        const dayCounts = new Map<number, number>()
        days.forEach(d => dayCounts.set(d, (dayCounts.get(d) || 0) + 1))
        dayOfMonth = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      }
      if (['weekly', 'biweekly'].includes(frequency)) {
        const wdays = groupTxs.map(t => new Date(t.date as string).getDay())
        const wdayCounts = new Map<number, number>()
        wdays.forEach(d => wdayCounts.set(d, (wdayCounts.get(d) || 0) + 1))
        dayOfWeek = [...wdayCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      }

      // Calculate confidence score
      let confidence = 0
      if (groupTxs.length >= 6) confidence += 30
      else if (groupTxs.length >= 4) confidence += 20
      else confidence += 10

      if (intervalCV < 0.1) confidence += 30
      else if (intervalCV < 0.2) confidence += 20
      else if (intervalCV < 0.3) confidence += 10

      if (amountCV < 0.01) confidence += 20
      else if (amountCV < 0.05) confidence += 15
      else if (amountCV < 0.15) confidence += 5

      if (groupTxs[0].counterparty_id) confidence += 10

      // Check recency (last occurrence within 45 days)
      const lastDate = new Date(dates[dates.length - 1])
      const daysSinceLast = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLast <= 45) confidence += 10

      const firstTx = groupTxs[0]
      const isIncome = parseFloat(firstTx.amount as string) >= 0

      patterns.push({
        description: (groupTxs
          .map(t => (t.description as string) || '')
          .sort((a, b) => a.length - b.length)[Math.floor(groupTxs.length / 2)]) || 'Senza descrizione',
        counterpartyId: (firstTx.counterparty_id as string) || null,
        counterpartyName: firstTx.counterparty_id ? (counterpartyMap.get(firstTx.counterparty_id as string) || null) : null,
        containerId: firstTx.container_id as string,
        containerName: containerMap.get(firstTx.container_id as string) || null,
        type: isIncome ? 'income' : 'expense',
        frequency,
        dayOfMonth,
        dayOfWeek,
        avgAmount: isIncome ? avgAmount : -avgAmount,
        medianAmount: isIncome ? medianAmount : -medianAmount,
        amountVariance: Math.round(amountCV * 100),
        amountIsEstimate,
        confidence: Math.min(confidence, 100),
        occurrences: groupTxs.length,
        transactionIds: groupTxs.map(t => t.id as string),
        lastDate: lastDate.toISOString().slice(0, 10),
      })
    }

    // Sort by confidence descending
    patterns.sort((a, b) => b.confidence - a.confidence)

    return ok(res, { patterns })
  }

  // POST /recurrences { _action: 'create-batch' } — create multiple recurrences from detection
  if (method === 'POST' && bodyActionRec === 'create-batch') {
    const b = req.body || {}
    const recurrences = b.recurrences as Array<Record<string, unknown>>
    if (!Array.isArray(recurrences) || recurrences.length === 0) {
      return badRequest(res, 'recurrences[] è obbligatorio')
    }

    const insertedIds: string[] = []
    const errors: string[] = []

    for (const rec of recurrences) {
      const { data, error } = await sb
        .from('recurrences')
        .insert({
          description: rec.description,
          frequency: rec.frequency,
          day_of_month: rec.dayOfMonth ?? null,
          day_of_week: rec.dayOfWeek ?? null,
          business_days_only: false,
          amount: rec.amount ?? null,
          amount_is_estimate: rec.amountIsEstimate ?? false,
          currency: rec.currency ?? 'EUR',
          container_id: rec.containerId ?? null,
          counterparty_id: rec.counterpartyId ?? null,
          type: rec.type,
          start_date: rec.startDate ?? new Date().toISOString().slice(0, 10),
          is_active: true,
        })
        .select('id')
        .single()

      if (error) {
        errors.push(`${rec.description}: ${error.message}`)
      } else if (data) {
        insertedIds.push(data.id)

        // Link historical transactions to this recurrence
        const txIds = rec.transactionIds as string[] | undefined
        if (txIds && txIds.length > 0) {
          await sb
            .from('transactions')
            .update({ recurrence_id: data.id })
            .in('id', txIds)
        }
      }
    }

    return created(res, { created: insertedIds.length, ids: insertedIds, errors: errors.length > 0 ? errors : undefined })
  }

  if (method === 'GET' && !id) {
    const { data, error } = await sb
      .from('recurrences')
      .select('*, containers(name, color), counterparties(name)')
      .order('is_active', { ascending: false })
      .order('description')
    if (error) throw error

    const rows = (data || []).map((r: Record<string, unknown>) => {
      const row = { ...r } as Record<string, unknown>
      const containers = row.containers as { name?: string; color?: string } | null
      const counterparties = row.counterparties as { name?: string } | null
      row.container_name = containers?.name ?? null
      row.container_color = containers?.color ?? null
      row.counterparty_name = counterparties?.name ?? null
      delete row.containers
      delete row.counterparties
      return row
    })
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('recurrences')
      .select('*, containers(name), counterparties(name)')
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Ricorrenza non trovata')
    const row = { ...data } as Record<string, unknown>
    const containers = row.containers as { name?: string } | null
    const counterparties = row.counterparties as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.counterparty_name = counterparties?.name ?? null
    delete row.containers
    delete row.counterparties
    return ok(res, row)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const recId = b.id as string
    if (!recId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.description !== undefined) update.description = b.description
    if (b.frequency !== undefined) update.frequency = b.frequency
    if (b.intervalDays !== undefined) update.interval_days = b.intervalDays
    if (b.dayOfMonth !== undefined) update.day_of_month = b.dayOfMonth
    if (b.dayOfWeek !== undefined) update.day_of_week = b.dayOfWeek
    if (b.businessDaysOnly !== undefined) update.business_days_only = b.businessDaysOnly
    if (b.amount !== undefined) update.amount = b.amount
    if (b.amountIsEstimate !== undefined) update.amount_is_estimate = b.amountIsEstimate
    if (b.currency !== undefined) update.currency = b.currency
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.sharedWithSubjectId !== undefined) update.shared_with_subject_id = b.sharedWithSubjectId
    if (b.sharePercentage !== undefined) update.share_percentage = b.sharePercentage
    if (b.startDate !== undefined) update.start_date = b.startDate
    if (b.endDate !== undefined) update.end_date = b.endDate
    if (b.reminderDaysBefore !== undefined) update.reminder_days_before = b.reminderDaysBefore
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('recurrences').update(update).eq('id', recId).select().single()
    if (error || !data) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const recId = (req.body as Record<string, unknown>)?.id as string
    if (!recId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('recurrences').delete().eq('id', recId).select('id').single()
    if (error || !data) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, { deleted: true, id: recId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.description || !b.frequency || !b.type || !b.startDate) {
      return badRequest(res, 'description, frequency, type e startDate sono obbligatori')
    }
    const { data, error } = await sb
      .from('recurrences')
      .insert({
        description: b.description,
        frequency: b.frequency,
        interval_days: b.intervalDays ?? null,
        day_of_month: b.dayOfMonth ?? null,
        day_of_week: b.dayOfWeek ?? null,
        business_days_only: b.businessDaysOnly ?? false,
        amount: b.amount ?? null,
        amount_is_estimate: b.amountIsEstimate ?? false,
        currency: b.currency ?? 'EUR',
        container_id: b.containerId ?? null,
        counterparty_id: b.counterpartyId ?? null,
        type: b.type,
        shared_with_subject_id: b.sharedWithSubjectId ?? null,
        share_percentage: b.sharePercentage ?? null,
        start_date: b.startDate,
        end_date: b.endDate ?? null,
        reminder_days_before: b.reminderDaysBefore ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.description !== undefined) update.description = b.description
    if (b.frequency !== undefined) update.frequency = b.frequency
    if (b.intervalDays !== undefined) update.interval_days = b.intervalDays
    if (b.dayOfMonth !== undefined) update.day_of_month = b.dayOfMonth
    if (b.dayOfWeek !== undefined) update.day_of_week = b.dayOfWeek
    if (b.businessDaysOnly !== undefined) update.business_days_only = b.businessDaysOnly
    if (b.amount !== undefined) update.amount = b.amount
    if (b.amountIsEstimate !== undefined) update.amount_is_estimate = b.amountIsEstimate
    if (b.currency !== undefined) update.currency = b.currency
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.sharedWithSubjectId !== undefined) update.shared_with_subject_id = b.sharedWithSubjectId
    if (b.sharePercentage !== undefined) update.share_percentage = b.sharePercentage
    if (b.startDate !== undefined) update.start_date = b.startDate
    if (b.endDate !== undefined) update.end_date = b.endDate
    if (b.reminderDaysBefore !== undefined) update.reminder_days_before = b.reminderDaysBefore
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('recurrences').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { data, error } = await sb.from('recurrences').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// BUDGET (Periods + Allocations)
// ============================================================

async function handleBudget(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[],
) {
  const sb = getSupabase()
  const method = req.method

  // /api/budget/allocations/:id → PUT/DELETE
  if (segments.length >= 3 && segments[1] === 'allocations' && segments[2]) {
    const allocId = segments[2]

    if (method === 'DELETE') {
      const { data, error } = await sb
        .from('budget_allocations')
        .delete()
        .eq('id', allocId)
        .select('id')
        .single()
      if (error || !data) return notFound(res, 'Allocazione non trovata')
      return ok(res, { deleted: true, id: allocId })
    }

    if (method === 'PUT' || method === 'PATCH') {
      const b = req.body || {}
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (b.tagId !== undefined) update.tag_id = b.tagId
      if (b.subjectId !== undefined) update.subject_id = b.subjectId
      if (b.allocatedAmount !== undefined) update.allocated_amount = b.allocatedAmount
      if (b.currency !== undefined) update.currency = b.currency
      if (b.notes !== undefined) update.notes = b.notes

      const { data, error } = await sb
        .from('budget_allocations')
        .update(update)
        .eq('id', allocId)
        .select()
        .single()
      if (error || !data) return notFound(res, 'Allocazione non trovata')
      return ok(res, data)
    }
  }

  // /api/budget/allocations → POST
  if (segments.length >= 2 && segments[1] === 'allocations' && method === 'POST') {
    const b = req.body || {}
    if (!b.periodId || !b.allocatedAmount) return badRequest(res, 'periodId e allocatedAmount sono obbligatori')
    const { data, error } = await sb
      .from('budget_allocations')
      .insert({
        period_id: b.periodId,
        tag_id: b.tagId ?? null,
        subject_id: b.subjectId ?? null,
        allocated_amount: b.allocatedAmount,
        currency: b.currency ?? 'EUR',
        notes: b.notes ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  // /api/budget/:id
  const periodId = segments.length >= 2 && segments[1] !== 'allocations' ? segments[1] : null

  if (method === 'GET' && !periodId) {
    // List all periods with allocations
    const { data: periods, error: pErr } = await sb
      .from('budget_periods')
      .select('*')
      .order('start_date', { ascending: false })
    if (pErr) throw pErr

    const { data: allocations, error: aErr } = await sb
      .from('budget_allocations')
      .select('*, tags(name, color)')
      .order('created_at')
    if (aErr) throw aErr

    // Flatten tag info and group by period
    const flatAllocs = (allocations || []).map((a: Record<string, unknown>) => {
      const tags = a.tags as { name?: string; color?: string } | null
      const { tags: _, ...rest } = a
      return { ...rest, tag_name: tags?.name ?? null, tag_color: tags?.color ?? null }
    })

    const result = (periods || []).map((p: Record<string, unknown>) => ({
      ...p,
      allocations: flatAllocs.filter((a: Record<string, unknown>) => a.period_id === p.id),
    }))
    return ok(res, result)
  }

  if (method === 'GET' && periodId) {
    const { data: period, error: pErr } = await sb
      .from('budget_periods')
      .select('*')
      .eq('id', periodId)
      .single()
    if (pErr || !period) return notFound(res, 'Periodo non trovato')

    const { data: allocations, error: aErr } = await sb
      .from('budget_allocations')
      .select('*, tags(name, color)')
      .eq('period_id', periodId)
      .order('created_at')
    if (aErr) throw aErr

    const flatAllocs = (allocations || []).map((a: Record<string, unknown>) => {
      const tags = a.tags as { name?: string; color?: string } | null
      const { tags: _, ...rest } = a
      return { ...rest, tag_name: tags?.name ?? null, tag_color: tags?.color ?? null }
    })

    return ok(res, { ...period, allocations: flatAllocs })
  }

  // POST-based actions for budget (update/delete via POST to avoid Vercel multi-segment path 404)
  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const pId = b.id as string
    if (!pId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.startDate !== undefined) update.start_date = b.startDate
    if (b.endDate !== undefined) update.end_date = b.endDate
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('budget_periods').update(update).eq('id', pId).select().single()
    if (error || !data) return notFound(res, 'Periodo non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const pId = (req.body as Record<string, unknown>)?.id as string
    if (!pId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('budget_periods').delete().eq('id', pId).select('id').single()
    if (error || !data) return notFound(res, 'Periodo non trovato')
    return ok(res, { deleted: true, id: pId })
  }

  if (method === 'POST' && bodyAction === 'delete-allocation') {
    const allocId = (req.body as Record<string, unknown>)?.id as string
    if (!allocId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('budget_allocations').delete().eq('id', allocId).select('id').single()
    if (error || !data) return notFound(res, 'Allocazione non trovata')
    return ok(res, { deleted: true, id: allocId })
  }

  if (method === 'POST' && !periodId && !bodyAction) {
    const b = req.body || {}
    if (!b.name || !b.startDate || !b.endDate) return badRequest(res, 'name, startDate e endDate sono obbligatori')
    const { data, error } = await sb
      .from('budget_periods')
      .insert({
        name: b.name,
        start_date: b.startDate,
        end_date: b.endDate,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && periodId) {
    const b = req.body || {}
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.startDate !== undefined) update.start_date = b.startDate
    if (b.endDate !== undefined) update.end_date = b.endDate
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('budget_periods').update(update).eq('id', periodId).select().single()
    if (error || !data) return notFound(res, 'Periodo non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && periodId) {
    const { data, error } = await sb.from('budget_periods').delete().eq('id', periodId).select('id').single()
    if (error || !data) return notFound(res, 'Periodo non trovato')
    return ok(res, { deleted: true, id: periodId })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// STATS - Dashboard aggregations
// ============================================================

async function handleStats(
  _req: VercelRequest,
  res: VercelResponse,
) {
  const sb = getSupabase()

  // 1) Balances by currency (active containers + their transactions)
  const { data: containers } = await sb
    .from('containers')
    .select('id, currency, initial_balance')
    .eq('is_active', true)

  // Fetch transaction sums per container (non-cancelled)
  const activeIds = (containers || []).map((c) => c.id as string)
  const { data: txSums } = activeIds.length > 0
    ? await sb
        .from('transactions')
        .select('container_id, amount')
        .in('container_id', activeIds)
        .neq('status', 'cancelled')
    : { data: [] }

  const txSumMap = new Map<string, number>()
  for (const t of txSums || []) {
    const cid = t.container_id as string
    const amt = parseFloat(t.amount as string) || 0
    txSumMap.set(cid, (txSumMap.get(cid) || 0) + amt)
  }

  const balanceMap = new Map<string, number>()
  for (const c of containers || []) {
    const cur = c.currency as string
    const initialBal = parseFloat(c.initial_balance as string) || 0
    const txSum = txSumMap.get(c.id as string) || 0
    balanceMap.set(cur, (balanceMap.get(cur) || 0) + initialBal + txSum)
  }
  const balances = Array.from(balanceMap.entries()).map(([currency, total]) => ({
    currency,
    total: total.toString(),
  }))

  // 2) Monthly income/expenses (current month)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth =
    now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`

  const { data: monthTx } = await sb
    .from('transactions')
    .select('type, amount')
    .gte('date', monthStart)
    .lt('date', nextMonth)
    .neq('status', 'cancelled')

  let monthlyIncome = 0
  let monthlyExpenses = 0
  let txCount = 0
  for (const t of monthTx || []) {
    txCount++
    const amt = parseFloat(t.amount as string) || 0
    if (t.type === 'income') monthlyIncome += amt
    if (t.type === 'expense') monthlyExpenses += Math.abs(amt)
  }

  // 3) Pending transactions
  const { data: pendingTx } = await sb
    .from('transactions')
    .select('amount')
    .eq('status', 'pending')

  let pendingCredits = 0
  let pendingDebits = 0
  for (const t of pendingTx || []) {
    const amt = parseFloat(t.amount as string) || 0
    if (amt > 0) pendingCredits += amt
    else pendingDebits += Math.abs(amt)
  }

  // 4) Recent transactions (last 10)
  const { data: recent } = await sb
    .from('transactions')
    .select('*, containers(name, color)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  const recentRows = (recent || []).map((r: Record<string, unknown>) => {
    const row = { ...r } as Record<string, unknown>
    const ct = row.containers as { name?: string; color?: string } | null
    row.container_name = ct?.name ?? null
    row.container_color = ct?.color ?? null
    delete row.containers
    return row
  })

  // 5) Active container count
  const { count } = await sb
    .from('containers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  return ok(res, {
    balances,
    monthly: {
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      transaction_count: txCount,
    },
    pending: {
      pending_credits: pendingCredits,
      pending_debits: pendingDebits,
    },
    recentTransactions: recentRows,
    activeContainers: count ?? 0,
  })
}

// ============================================================
// MAIN ROUTER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Extract path segments from catch-all query param
  const pathParam = req.query.path
  let segments: string[]

  if (pathParam) {
    segments = Array.isArray(pathParam) ? pathParam : [pathParam]
  } else {
    // Fallback: parse from req.url (needed for non-Next.js Vercel projects
    // where req.query.path may not be populated by the catch-all route)
    const url = req.url || ''
    const pathPart = url.split('?')[0]
    const apiPath = pathPart.replace(/^\/api\/?/, '')
    segments = apiPath ? apiPath.split('/').filter(Boolean) : []
  }

  const resource = segments[0] || ''

  try {
    switch (resource) {
      case 'subjects':
        return await handleSubjects(req, res, segments[1] || null)
      case 'containers':
        return await handleContainers(req, res, segments[1] || null)
      case 'counterparties':
        return await handleCounterparties(req, res, segments[1] || null)
      case 'tags':
        return await handleTags(req, res, segments[1] || null)
      case 'transactions':
        return await handleTransactions(req, res, segments[1] || null)
      case 'recurrences':
        return await handleRecurrences(req, res, segments[1] || null)
      case 'budget':
        return await handleBudget(req, res, segments)
      case 'stats':
        return await handleStats(req, res)
      case 'health':
        return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
      case '':
        return res.status(200).json({
          status: 'ok',
          endpoints: ['subjects', 'containers', 'counterparties', 'tags', 'transactions', 'recurrences', 'budget', 'stats', 'health'],
        })
      default:
        return res.status(404).json({ error: 'Not Found', message: `Nessun handler per: /${segments.join('/')}` })
    }
  } catch (err) {
    return serverError(res, err)
  }
}
