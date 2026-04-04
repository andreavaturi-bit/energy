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
        '*, containers(name, color, currency), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
        { count: 'exact' },
      )

    if (param('containerId')) query = query.eq('container_id', param('containerId')!)
    if (param('counterpartyId')) query = query.eq('counterparty_id', param('counterpartyId')!)
    if (param('beneficiarySubjectId')) query = query.eq('beneficiary_subject_id', param('beneficiarySubjectId')!)
    if (param('type')) query = query.eq('type', param('type')!)
    if (param('status')) query = query.eq('status', param('status')!)
    if (param('dateFrom')) query = query.gte('date', param('dateFrom')!)
    if (param('dateTo')) query = query.lte('date', param('dateTo')!)
    if (param('search')) {
      const s = param('search')!
      query = query.or(`description.ilike.%${s}%,notes.ilike.%${s}%`)
    }

    // Tag filter: if tagId is specified, filter transactions that have that tag
    const tagIdFilter = param('tagId')
    if (tagIdFilter) {
      const { data: taggedTxIds } = await sb
        .from('transaction_tags')
        .select('transaction_id')
        .eq('tag_id', tagIdFilter)
      const txIds = (taggedTxIds || []).map((r: Record<string, unknown>) => r.transaction_id as string)
      if (txIds.length === 0) {
        return ok(res, { rows: [], total: 0, limit, offset })
      }
      query = query.in('id', txIds)
    }

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Fetch tags for all returned transactions in one query
    const txIds = (data || []).map((r: Record<string, unknown>) => r.id as string)
    let tagsByTxId = new Map<string, Array<Record<string, unknown>>>()
    if (txIds.length > 0) {
      const { data: allTagRows } = await sb
        .from('transaction_tags')
        .select('transaction_id, tags(id, name, type, color)')
        .in('transaction_id', txIds)
      if (allTagRows) {
        for (const row of allTagRows as Array<Record<string, unknown>>) {
          const tid = row.transaction_id as string
          if (!tagsByTxId.has(tid)) tagsByTxId.set(tid, [])
          if (row.tags) tagsByTxId.get(tid)!.push(row.tags as Record<string, unknown>)
        }
      }
    }

    // Flatten joined objects
    const rows = (data || []).map((r: Record<string, unknown>) => {
      const row = { ...r } as Record<string, unknown>
      const containers = row.containers as { name?: string; color?: string; currency?: string } | null
      const counterparties = row.counterparties as { name?: string } | null
      const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
      row.container_name = containers?.name ?? null
      row.container_color = containers?.color ?? null
      row.container_currency = containers?.currency ?? null
      row.counterparty_name = counterparties?.name ?? null
      row.beneficiary_name = beneficiarySubject?.name ?? null
      row.tags = tagsByTxId.get(row.id as string) || []
      delete row.containers
      delete row.counterparties
      delete row.beneficiarySubject
      return row
    })

    // Load split children for parent-split transactions
    const splitParentIds = rows
      .filter((r: Record<string, unknown>) => r.status === 'split')
      .map((r: Record<string, unknown>) => r.id as string)

    if (splitParentIds.length > 0) {
      const { data: childRows } = await sb
        .from('transactions')
        .select('*, beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name), tags:transaction_tags(tags(id, name, color))')
        .in('split_parent_id', splitParentIds)
        .order('created_at')

      const childrenByParent = new Map<string, unknown[]>()
      for (const child of childRows || []) {
        const c = child as Record<string, unknown>
        // Flatten beneficiary
        const bs = c.beneficiarySubject as { name?: string } | null
        c.beneficiary_name = bs?.name ?? null
        delete c.beneficiarySubject
        // Flatten tags
        const rawTags = c.tags as Array<{ tags: Record<string, unknown> }> | null
        c.tags = (rawTags || []).map(t => t.tags).filter(Boolean)
        const pid = c.split_parent_id as string
        if (!childrenByParent.has(pid)) childrenByParent.set(pid, [])
        childrenByParent.get(pid)!.push(c)
      }
      for (const row of rows) {
        if ((row as Record<string, unknown>).status === 'split') {
          (row as Record<string, unknown>).split_children = childrenByParent.get((row as Record<string, unknown>).id as string) || []
        }
      }
    }

    return ok(res, { rows, total: count ?? 0, limit, offset })
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('transactions')
      .select(
        '*, containers(name, color), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
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
    const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.beneficiary_name = beneficiarySubject?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.beneficiarySubject

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
      beneficiary_subject_id: b.beneficiarySubjectId ?? null,
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

  // ── SPLIT ──────────────────────────────────────────────────────
  if (method === 'POST' && bodyAction === 'split') {
    const b = req.body as Record<string, unknown>
    const parentId = b.parentId as string
    const children = b.children as Array<{
      description?: string
      amount: string
      tagIds?: string[]
      beneficiarySubjectId?: string | null
      notes?: string | null
    }>

    if (!parentId || !children?.length) return badRequest(res, 'parentId e children sono obbligatori')

    const { data: parent, error: parentErr } = await sb
      .from('transactions').select('*').eq('id', parentId).single()
    if (parentErr || !parent) return notFound(res, 'Transazione non trovata')

    const p = parent as Record<string, unknown>
    const parentAmt = Math.abs(parseFloat(p.amount as string))
    const childrenSum = children.reduce((s, c) => s + Math.abs(parseFloat(c.amount)), 0)
    if (Math.abs(parentAmt - childrenSum) > 0.01) {
      return badRequest(res, `La somma delle imputazioni (${childrenSum.toFixed(2)}) non corrisponde all'importo (${parentAmt.toFixed(2)})`)
    }

    await sb.from('transactions')
      .update({ status: 'split', updated_at: new Date().toISOString() })
      .eq('id', parentId)

    const isOut = parseFloat(p.amount as string) < 0
    const createdChildren = []
    for (const child of children) {
      const childAmt = isOut ? -Math.abs(parseFloat(child.amount)) : Math.abs(parseFloat(child.amount))
      const { data: created, error: childErr } = await sb.from('transactions').insert({
        date: p.date,
        description: child.description || p.description,
        amount: childAmt.toFixed(4),
        currency: p.currency,
        container_id: p.container_id,
        type: p.type,
        status: 'completed',
        source: 'manual',
        split_parent_id: parentId,
        beneficiary_subject_id: child.beneficiarySubjectId ?? null,
        notes: child.notes ?? null,
      }).select().single()
      if (childErr || !created) continue
      createdChildren.push(created)
      if (child.tagIds?.length) {
        await sb.from('transaction_tags').insert(
          child.tagIds.map((tagId: string) => ({ transaction_id: (created as Record<string,unknown>).id, tag_id: tagId }))
        )
      }
    }
    return ok(res, { parent: { ...p, status: 'split' }, children: createdChildren })
  }

  // ── UNSPLIT ────────────────────────────────────────────────────
  if (method === 'POST' && bodyAction === 'unsplit') {
    const b = req.body as Record<string, unknown>
    const parentId = b.parentId as string
    if (!parentId) return badRequest(res, 'parentId e obbligatorio')
    await sb.from('transactions').delete().eq('split_parent_id', parentId)
    await sb.from('transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', parentId)
    return ok(res, { unsplit: true })
  }

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
        '*, containers(name, color), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
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
    const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.beneficiary_name = beneficiarySubject?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.beneficiarySubject

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
    if (b.beneficiarySubjectId !== undefined) update.beneficiary_subject_id = b.beneficiarySubjectId || null

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
        beneficiary_subject_id: b.beneficiarySubjectId ?? null,
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
      .neq('type', 'transfer_in')
      .neq('type', 'transfer_out')
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
  req: VercelRequest,
  res: VercelResponse,
  segments: string[],
) {
  const sb = getSupabase()
  const subRoute = segments[1] || ''

  // ── GET /stats/by-tag — breakdown per tag con somme e conteggi ──
  if (subRoute === 'by-tag') {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v }
    const dateFrom = param('dateFrom')
    const dateTo = param('dateTo')
    const containerId = param('containerId')
    const direction = param('direction') || 'expense' // expense or income

    // Build transaction query
    let txQuery = sb
      .from('transactions')
      .select('id, amount, date')
      .neq('status', 'cancelled')
      .neq('status', 'split')
      .neq('type', 'transfer_in')
      .neq('type', 'transfer_out')
    if (dateFrom) txQuery = txQuery.gte('date', dateFrom)
    if (dateTo) txQuery = txQuery.lte('date', dateTo)
    if (containerId) txQuery = txQuery.eq('container_id', containerId)
    if (direction === 'expense') {
      txQuery = txQuery.lt('amount', '0')
    } else {
      txQuery = txQuery.gt('amount', '0')
    }

    const { data: txs } = await txQuery
    const txMap = new Map<string, { amount: number; date: string }>()
    for (const tx of txs || []) {
      txMap.set(tx.id as string, { amount: parseFloat(tx.amount as string) || 0, date: tx.date as string })
    }

    // Get all transaction_tags for these transactions
    const txIds = [...txMap.keys()]
    const tagTotals = new Map<string, { total: number; count: number }>()
    let untaggedTotal = 0
    let untaggedCount = 0
    const taggedTxIds = new Set<string>()

    if (txIds.length > 0) {
      for (let i = 0; i < txIds.length; i += 500) {
        const chunk = txIds.slice(i, i + 500)
        const { data: ttRows } = await sb
          .from('transaction_tags')
          .select('transaction_id, tag_id')
          .in('transaction_id', chunk)

        for (const row of (ttRows || []) as Array<Record<string, unknown>>) {
          const tid = row.transaction_id as string
          const tagId = row.tag_id as string
          const txData = txMap.get(tid)
          if (!txData) continue
          taggedTxIds.add(tid)
          if (!tagTotals.has(tagId)) tagTotals.set(tagId, { total: 0, count: 0 })
          const entry = tagTotals.get(tagId)!
          entry.total += Math.abs(txData.amount)
          entry.count += 1
        }
      }
    }

    // Calculate untagged
    for (const [tid, txData] of txMap) {
      if (!taggedTxIds.has(tid)) {
        untaggedTotal += Math.abs(txData.amount)
        untaggedCount += 1
      }
    }

    const grandTotal = [...tagTotals.values()].reduce((s, e) => s + e.total, 0) + untaggedTotal

    // Fetch tag details for all found tags
    const tagIds = [...tagTotals.keys()]
    let tagInfoMap = new Map<string, { name: string; color: string }>()
    if (tagIds.length > 0) {
      const { data: tagRows } = await sb
        .from('tags')
        .select('id, name, color')
        .in('id', tagIds)
      for (const t of tagRows || []) {
        tagInfoMap.set(t.id as string, { name: t.name as string, color: t.color as string })
      }
    }

    // Build result from actual tag usage
    const breakdown = tagIds
      .map((tagId) => {
        const entry = tagTotals.get(tagId)!
        const info = tagInfoMap.get(tagId) || { name: 'Sconosciuto', color: '#6b7280' }
        return {
          tagId,
          tagName: info.name,
          tagColor: info.color,
          total: entry.total,
          count: entry.count,
          percentage: grandTotal > 0 ? (entry.total / grandTotal) * 100 : 0,
        }
      })
      .filter((b) => b.total > 0)
      .sort((a, b) => b.total - a.total)

    if (untaggedCount > 0) {
      breakdown.push({
        tagId: null as unknown as string,
        tagName: 'Non categorizzato',
        tagColor: '#6b7280',
        total: untaggedTotal,
        count: untaggedCount,
        percentage: grandTotal > 0 ? (untaggedTotal / grandTotal) * 100 : 0,
      })
    }

    return ok(res, { breakdown, grandTotal, transactionCount: txMap.size })
  }

  // ── GET /stats/monthly-trend — monthly income/expenses ──
  if (subRoute === 'monthly-trend') {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v }
    const dateFrom = param('dateFrom')
    const dateTo = param('dateTo')
    const containerId = param('containerId')

    // Fallback: if no dateFrom, use months param (backwards compat)
    let startStr: string
    let endStr: string | undefined
    if (dateFrom) {
      startStr = dateFrom
      endStr = dateTo || undefined
    } else {
      const months = parseInt(param('months') || '6')
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      startStr = startDate.toISOString().slice(0, 10)
    }

    let query = sb
      .from('transactions')
      .select('date, amount, type')
      .gte('date', startStr)
      .neq('status', 'cancelled')
      .neq('status', 'split')
    if (endStr) query = query.lte('date', endStr)
    if (containerId) query = query.eq('container_id', containerId)

    const { data: txs } = await query

    // Group by month
    const monthMap = new Map<string, { income: number; expenses: number }>()
    for (const tx of txs || []) {
      const month = (tx.date as string).slice(0, 7) // YYYY-MM
      if (!monthMap.has(month)) monthMap.set(month, { income: 0, expenses: 0 })
      const entry = monthMap.get(month)!
      const amt = parseFloat(tx.amount as string) || 0
      const type = tx.type as string
      // Exclude transfers from income/expense stats
      if (type === 'transfer_in' || type === 'transfer_out') continue
      if (amt > 0) entry.income += amt
      else entry.expenses += Math.abs(amt)
    }

    // Sort chronologically and format
    const trend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        net: Math.round((data.income - data.expenses) * 100) / 100,
      }))

    return ok(res, { trend })
  }

  // ── GET /stats/burning-rate — daily spending rate and autonomy ──
  if (subRoute === 'burning-rate') {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v }
    const days = parseInt(param('days') || '90')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startStr = startDate.toISOString().slice(0, 10)

    const { data: txs } = await sb
      .from('transactions')
      .select('amount, type')
      .gte('date', startStr)
      .eq('status', 'completed')
      .neq('type', 'transfer_in')
      .neq('type', 'transfer_out')

    let totalIncome = 0
    let totalExpenses = 0
    for (const tx of txs || []) {
      const amt = parseFloat(tx.amount as string) || 0
      if (amt > 0) totalIncome += amt
      else totalExpenses += Math.abs(amt)
    }

    const dailyExpense = totalExpenses / days
    const dailyIncome = totalIncome / days
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // Get total balance for autonomy calculation
    const { data: containers } = await sb
      .from('containers')
      .select('id, initial_balance')
      .eq('is_active', true)
    let totalBalance = 0
    const activeIds = (containers || []).map((c: Record<string, unknown>) => {
      totalBalance += parseFloat(c.initial_balance as string) || 0
      return c.id as string
    })
    if (activeIds.length > 0) {
      const { data: balanceTxs } = await sb
        .from('transactions')
        .select('amount')
        .in('container_id', activeIds)
        .neq('status', 'cancelled')
        .neq('status', 'split')
      for (const tx of balanceTxs || []) {
        totalBalance += parseFloat(tx.amount as string) || 0
      }
    }

    const autonomyDays = dailyExpense > 0 ? Math.round(totalBalance / dailyExpense) : 9999

    return ok(res, {
      dailyExpense: Math.round(dailyExpense * 100) / 100,
      dailyIncome: Math.round(dailyIncome * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
      autonomyDays: autonomyDays,
      totalBalance: Math.round(totalBalance * 100) / 100,
      periodDays: days,
    })
  }

  // ── Default: GET /stats — dashboard (original) ──

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
        .neq('status', 'split')
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
    .neq('status', 'split')

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
// SMART RULES - Auto-categorization rules
// ============================================================

async function handleSmartRules(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  // GET list — all rules with joined tag/counterparty/container names
  if (method === 'GET' && !id) {
    const { data, error } = await sb
      .from('smart_rules')
      .select('*, tags!smart_rules_assign_tag_id_tags_id_fk(id, name, color, type), counterparties(name), containers(name)')
      .order('priority', { ascending: false })
      .order('name')
    if (error) throw error

    const rows = (data || []).map((r: Record<string, unknown>) => {
      const row = { ...r } as Record<string, unknown>
      const tag = row.tags as Record<string, unknown> | null
      const cp = row.counterparties as { name?: string } | null
      const ct = row.containers as { name?: string } | null
      row.assign_tag = tag
      row.counterparty_name = cp?.name ?? null
      row.container_name = ct?.name ?? null
      delete row.tags
      delete row.counterparties
      delete row.containers
      return row
    })
    return ok(res, rows)
  }

  // POST-based actions
  const bodyAction = (req.body as Record<string, unknown>)?._action

  // POST create
  if (method === 'POST' && !bodyAction) {
    const b = req.body || {}
    const { data, error } = await sb.from('smart_rules').insert({
      name: b.name,
      description_pattern: b.descriptionPattern ?? null,
      counterparty_id: b.counterpartyId ?? null,
      container_id: b.containerId ?? null,
      amount_min: b.amountMin ?? null,
      amount_max: b.amountMax ?? null,
      transaction_type: b.transactionType ?? null,
      assign_tag_id: b.assignTagId,
      priority: b.priority ?? 0,
      is_active: b.isActive ?? true,
      auto_apply: b.autoApply ?? true,
    }).select().single()
    if (error) throw error
    return created(res, data)
  }

  // POST update
  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const ruleId = b.id as string
    if (!ruleId) return badRequest(res, 'id è obbligatorio')

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.name !== undefined) update.name = b.name
    if (b.descriptionPattern !== undefined) update.description_pattern = b.descriptionPattern
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.amountMin !== undefined) update.amount_min = b.amountMin
    if (b.amountMax !== undefined) update.amount_max = b.amountMax
    if (b.transactionType !== undefined) update.transaction_type = b.transactionType
    if (b.assignTagId !== undefined) update.assign_tag_id = b.assignTagId
    if (b.priority !== undefined) update.priority = b.priority
    if (b.isActive !== undefined) update.is_active = b.isActive
    if (b.autoApply !== undefined) update.auto_apply = b.autoApply

    const { error } = await sb.from('smart_rules').update(update).eq('id', ruleId)
    if (error) throw error
    return ok(res, { updated: true })
  }

  // POST delete
  if (method === 'POST' && bodyAction === 'delete') {
    const ruleId = (req.body as Record<string, unknown>)?.id as string
    if (!ruleId) return badRequest(res, 'id è obbligatorio')
    const { error } = await sb.from('smart_rules').delete().eq('id', ruleId)
    if (error) throw error
    return ok(res, { deleted: true })
  }

  // POST auto-tag — apply all active rules to untagged transactions
  if (method === 'POST' && bodyAction === 'auto-tag') {
    const b = req.body || {}
    const dryRun = !!b.dryRun
    const limit = parseInt(b.limit as string) || 500

    // 1. Get all active rules, ordered by priority desc
    const { data: rules } = await sb
      .from('smart_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (!rules || rules.length === 0) {
      return ok(res, { applied: 0, matches: [], message: 'Nessuna regola attiva' })
    }

    // 2. Get untagged transactions (those with no entry in transaction_tags)
    // First get all transaction IDs that have at least one tag
    const { data: taggedIds } = await sb
      .from('transaction_tags')
      .select('transaction_id')
    const taggedSet = new Set((taggedIds || []).map((r: Record<string, unknown>) => r.transaction_id as string))

    // Get recent transactions
    const { data: txs } = await sb
      .from('transactions')
      .select('id, description, counterparty_id, container_id, amount, type')
      .neq('status', 'cancelled')
      .order('date', { ascending: false })
      .limit(limit * 3) // Fetch more to filter for untagged

    const untaggedTxs = (txs || []).filter((t: Record<string, unknown>) => !taggedSet.has(t.id as string)).slice(0, limit)

    // 3. Match rules against untagged transactions
    const matches: Array<{ transactionId: string; ruleId: string; ruleName: string; tagId: string; description: string }> = []

    for (const tx of untaggedTxs) {
      for (const rule of rules as Array<Record<string, unknown>>) {
        let matched = true

        // Check description pattern
        if (rule.description_pattern) {
          const pattern = (rule.description_pattern as string).toLowerCase()
          const desc = ((tx.description as string) || '').toLowerCase()
          if (!desc.includes(pattern)) {
            // Try regex
            try {
              const regex = new RegExp(pattern, 'i')
              if (!regex.test(desc)) matched = false
            } catch {
              matched = false
            }
          }
        }

        // Check counterparty
        if (matched && rule.counterparty_id && tx.counterparty_id !== rule.counterparty_id) {
          matched = false
        }

        // Check container
        if (matched && rule.container_id && tx.container_id !== rule.container_id) {
          matched = false
        }

        // Check amount range
        if (matched && rule.amount_min) {
          const txAmt = Math.abs(parseFloat(tx.amount as string))
          if (txAmt < parseFloat(rule.amount_min as string)) matched = false
        }
        if (matched && rule.amount_max) {
          const txAmt = Math.abs(parseFloat(tx.amount as string))
          if (txAmt > parseFloat(rule.amount_max as string)) matched = false
        }

        // Check transaction type
        if (matched && rule.transaction_type && tx.type !== rule.transaction_type) {
          matched = false
        }

        if (matched) {
          matches.push({
            transactionId: tx.id as string,
            ruleId: rule.id as string,
            ruleName: rule.name as string,
            tagId: rule.assign_tag_id as string,
            description: (tx.description as string) || '(nessuna descrizione)',
          })
          break // First matching rule wins (highest priority)
        }
      }
    }

    // 4. Apply tags (if not dry run)
    if (!dryRun && matches.length > 0) {
      const inserts = matches.map(m => ({
        transaction_id: m.transactionId,
        tag_id: m.tagId,
      }))
      // Insert in chunks
      for (let i = 0; i < inserts.length; i += 100) {
        const chunk = inserts.slice(i, i + 100)
        await sb.from('transaction_tags').upsert(chunk, {
          onConflict: 'transaction_id,tag_id',
          ignoreDuplicates: true,
        })
      }
    }

    return ok(res, {
      applied: dryRun ? 0 : matches.length,
      matches,
      dryRun,
      totalUntagged: untaggedTxs.length,
      totalRules: rules.length,
    })
  }

  // POST suggest-rules — analyze tagged transactions and suggest new rules
  if (method === 'POST' && bodyAction === 'suggest-rules') {
    // Fetch transactions that already have tags, with their counterparties and descriptions
    const { data: taggedTxs } = await sb
      .from('transaction_tags')
      .select('transaction_id, tag_id, tags(id, name, color, type)')
      .limit(2000)

    if (!taggedTxs || taggedTxs.length === 0) {
      return ok(res, { suggestions: [], message: 'Nessuna transazione taggata trovata per analisi' })
    }

    // Get the transactions themselves
    const txIds = [...new Set((taggedTxs as Array<Record<string, unknown>>).map(r => r.transaction_id as string))]
    const txMap = new Map<string, Record<string, unknown>>()
    for (let i = 0; i < txIds.length; i += 500) {
      const chunk = txIds.slice(i, i + 500)
      const { data: txs } = await sb
        .from('transactions')
        .select('id, description, counterparty_id, container_id, amount, type, counterparties(name)')
        .in('id', chunk)
      for (const tx of txs || []) {
        txMap.set(tx.id as string, tx as Record<string, unknown>)
      }
    }

    // Build a map: tagId -> array of transactions
    const tagTxMap = new Map<string, Array<{ tx: Record<string, unknown>; tagName: string; tagColor: string }>>()
    for (const row of taggedTxs as Array<Record<string, unknown>>) {
      const tagId = row.tag_id as string
      const tag = row.tags as Record<string, unknown> | null
      const tx = txMap.get(row.transaction_id as string)
      if (!tx || !tag) continue
      if (!tagTxMap.has(tagId)) tagTxMap.set(tagId, [])
      tagTxMap.get(tagId)!.push({ tx, tagName: tag.name as string, tagColor: (tag.color as string) || '#6b7280' })
    }

    // For each tag, find common patterns
    const suggestions: Array<{
      tagId: string
      tagName: string
      tagColor: string
      type: string // 'counterparty' | 'keyword' | 'amount_range'
      pattern: string
      confidence: number
      exampleCount: number
      ruleName: string
    }> = []

    // Get existing rules to avoid duplicates
    const { data: existingRules } = await sb.from('smart_rules').select('description_pattern, counterparty_id, assign_tag_id')
    const existingRuleKeys = new Set(
      (existingRules || []).map((r: Record<string, unknown>) =>
        `${r.description_pattern || ''}_${r.counterparty_id || ''}_${r.assign_tag_id}`,
      ),
    )

    for (const [tagId, entries] of tagTxMap) {
      if (entries.length < 2) continue // Need at least 2 transactions to suggest a pattern
      const { tagName, tagColor } = entries[0]

      // Pattern 1: Same counterparty
      const counterpartyCounts = new Map<string, { count: number; name: string }>()
      for (const { tx } of entries) {
        const cpId = tx.counterparty_id as string | null
        if (!cpId) continue
        const cpObj = tx.counterparties as { name?: string } | null
        if (!counterpartyCounts.has(cpId)) counterpartyCounts.set(cpId, { count: 0, name: cpObj?.name || 'Sconosciuto' })
        counterpartyCounts.get(cpId)!.count++
      }
      for (const [cpId, { count, name }] of counterpartyCounts) {
        if (count < 2) continue
        const ruleKey = `_${cpId}_${tagId}`
        if (existingRuleKeys.has(ruleKey)) continue
        suggestions.push({
          tagId,
          tagName,
          tagColor,
          type: 'counterparty',
          pattern: cpId,
          confidence: Math.min(95, 50 + count * 10),
          exampleCount: count,
          ruleName: `${name} → ${tagName}`,
        })
      }

      // Pattern 2: Common keywords in descriptions
      const wordCounts = new Map<string, number>()
      const stopWords = new Set(['di', 'del', 'della', 'il', 'la', 'le', 'lo', 'un', 'una', 'per', 'con', 'da', 'in', 'su', 'a', 'e', 'o', 'che', 'non', 'and', 'the', 'for', 'from', 'to', '-', '/', 'nr', 'n', 'pagamento', 'payment'])
      for (const { tx } of entries) {
        const desc = ((tx.description as string) || '').toLowerCase()
        const words = desc.split(/[\s,;.:()\-/]+/).filter(w => w.length > 3 && !stopWords.has(w))
        const uniqueWords = new Set(words)
        for (const word of uniqueWords) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        }
      }
      for (const [word, count] of wordCounts) {
        if (count < 3 || count / entries.length < 0.5) continue // At least 50% of transactions have this keyword
        const ruleKey = `${word}__${tagId}`
        if (existingRuleKeys.has(ruleKey)) continue
        suggestions.push({
          tagId,
          tagName,
          tagColor,
          type: 'keyword',
          pattern: word,
          confidence: Math.min(90, 40 + count * 8),
          exampleCount: count,
          ruleName: `"${word}" → ${tagName}`,
        })
      }
    }

    // Sort by confidence desc, limit to top 20
    suggestions.sort((a, b) => b.confidence - a.confidence)

    return ok(res, { suggestions: suggestions.slice(0, 20) })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// SEED — import real categories/tags/counterparties from Notion data
// ============================================================

const NOTION_AREAS: Record<string, string[]> = {
  'Casa e dintorni': ['Affitto','Bollette','Box','Pulizie casalinghe','Lavori, manutenzione e riparazioni','Mobili, arredamenti e simili','Elettrodomestici'],
  'Mangiare e dintorni': ['Panetteria','Bar','Pizzeria','Torte, dolci, pasticcini, etc','Sushi','Ristorante','Supermercato, mercato o spesa','Home delivery','Fruttivendolo, mercato, etc','Pub, locali, drink, etc','Fast food e dintorni','Acqua'],
  'Figli, famiglia e amici': ['Assicurazioni','Giocattoli','Vacanze e villeggiature','Regali','Cancelleria','Massimo','Sarah','Samuele','Valeria','Scuola','Nonna Paola','Attività varie bambini (sport, extrascolastiche, etc)','Baby Sitter'],
  'Trasporti e spostamenti vari': ['Riparazione auto','Lavaggio auto','Noleggio Auto','Mezzi pubblici','Monopattini','Parcheggi','Hotel','Carburante','Voli aerei','Treni','Car sharing','Taxi','Pedaggi autostradali','Additivi x auto e simili','Rata Automobile'],
  'Abbigliamento e dintorni': ['Abbigliamento e vestiti','Scarpe','Attrezzature varie','Tintoria'],
  'Tech e hardware': ['Accessori e tecnologia','Telefonia'],
  'Formazione e crescita': ['Corsi','Newsletter e membership finanziarie','Libri'],
  'Healthcare & esthetics': ['Visite mediche','Estetista','Farmacia e terapie varie','Barbiere','Fisioterapia, osteopatia e massaggi','Igiene e cura della persona','Integratori','Capelli'],
  'Spese aziendali': ['Lavoro online (UpWork, Fiverr, etc)','Spese aziendali x Kairòs','Spese aziendali x Shuffle','Finanziamento Soci'],
  'Sport e fitness': ['Fitness, palestra e Calisthenics','Tennis, ping pong, padel e simili','Sci, snowboard, snowskates, etc'],
  'Media': ['Film','Musica','Abbonamenti TV'],
  'App e software': ['Software e App','Domini, hosting e VPS'],
  'Divertimento e hobby': ['Feste','Teatro, spettacoli e simili','Piscine, funivie, parchi divertimenti e simili','Cinema','Hobby'],
  'Contributi': ['F24','Tasse','Beneficenza'],
  'Errori e inefficienze': ['Spese legali','Multe'],
  'Costi finanziari': ['Commercialista','Spese bancarie e commissioni','Documenti, marche da bollo, etc'],
  'Varie & eventuali': ['Costi di spedizione','Acquisti online','Boh!'],
  'Pendenze e compensazioni': ['Prestito','Compensazioni, residui, restituzioni e movimenti vari'],
}

const NOTION_UNASSIGNED_CATEGORIES = ['Spese aziendali x Gruppo VS','Spese x Coreografia','Viaggi, gite, escursioni, etc','Pocket Money']

const NOTION_AREA_COLORS: Record<string, string> = {
  'Casa e dintorni': '#3b82f6',
  'Mangiare e dintorni': '#f97316',
  'Figli, famiglia e amici': '#ec4899',
  'Trasporti e spostamenti vari': '#6366f1',
  'Abbigliamento e dintorni': '#8b5cf6',
  'Tech e hardware': '#06b6d4',
  'Formazione e crescita': '#14b8a6',
  'Healthcare & esthetics': '#ef4444',
  'Spese aziendali': '#64748b',
  'Sport e fitness': '#22c55e',
  'Media': '#a855f7',
  'App e software': '#0ea5e9',
  'Divertimento e hobby': '#f59e0b',
  'Contributi': '#dc2626',
  'Errori e inefficienze': '#b91c1c',
  'Costi finanziari': '#78716c',
  'Varie & eventuali': '#9ca3af',
  'Pendenze e compensazioni': '#d97706',
}

const NOTION_COUNTERPARTIES = [
  'Ace of Diamonds SRL','Alessandro Liberatore','Alessia Tornaghi','Alex Zlatkov','Alexandra Odman',
  'Alexia Paganini','Ana Sofia Beschea','Antena TV','Awe Sport','Black SRL','Brunico',
  'Bulgaria - Club Velichkova','CUS Torino','Chiara Salducco','Cliente VS/Opz',
  'Club di pattinaggio Bellinzona','Comitato Regionale Veneto','Corona Brașov','Danilo Gelao',
  'Daria Troi','David Cipolleschi','Davide Biocchi',
  'Deutsche Eislauf-Union | Federazione tedesca','Diana Lapierre','Dreaming Ice ASD',
  'EFFENNE SRL','Eis Club Gardena','Elisa Brunico','FISG','Giada Romiti','Gianluca De Risi',
  'Gioia Fiori','INPS','Ice Angels - Feltre','Ice Club Arau (Annette)','Ice Emotion',
  'Il Gatto e la Volpe nel web','Irene D\'Auria','Irma Caldara e Riccardo Maglio',
  'Julia Grabowski','Kai Jagoda','Kairòs SRLS','Leasys','Liri','Louis Weissert',
  'Luca Fuenfert','Lukas Britschgi','Léa Serna','MBA Mutua','Mamma','Marco Viotto',
  'Massimo','Milla Ruud & Nikolaj Majorov','Mirko Castignani','Nicole Schott','Noah Bodenstein',
  'POLSKI ZWIĄZEK | Federazione polacca','Papà','Pietro Mazzetti','Ramona Andreea Voicu',
  'Rotelle','Scacco Matto SRLS','Seregno 2012','Shuffle SRL','Simo','Stefano Russo',
  'Unfair Advantage SRL','Vale','Valentina Russo','Varie ed eventuali','Zio Gigio','iceDOME',
]

const NOTION_ACTIVITIES = [
  { name: 'Performance', ambito: 'PATTINAGGIO' },
  { name: 'Direzione artistica', ambito: 'PATTINAGGIO' },
  { name: 'Coreografia/Insegnamento', ambito: 'PATTINAGGIO' },
  { name: 'Vantaggio Sleale / Opzionetika', ambito: 'FINANZA' },
  { name: 'Ghiaccio_Spettacolo', ambito: 'PATTINAGGIO' },
  { name: 'Speakeraggio e Presentazione', ambito: 'PATTINAGGIO' },
  { name: 'Locali', ambito: 'ALTRO' },
  { name: 'Restituzione prestiti, anticipi e rimborsi', ambito: 'ALTRO' },
  { name: 'Assicurazioni', ambito: 'ALTRO' },
  { name: 'Music editing', ambito: 'PATTINAGGIO' },
  { name: 'Assistenza', ambito: 'ALTRO' },
]

async function handleSeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return badRequest(res, 'Use POST to seed data')

  const sb = getSupabase()
  const results: string[] = []

  // 1. Delete existing tags that are NOT linked to any transaction
  const { data: usedTagIds } = await sb.from('transaction_tags').select('tag_id')
  const usedSet = new Set((usedTagIds || []).map((r: { tag_id: string }) => r.tag_id))

  const { data: existingTags } = await sb.from('tags').select('id, name')
  const tagsToDelete = (existingTags || []).filter((t: { id: string }) => !usedSet.has(t.id))
  if (tagsToDelete.length > 0) {
    const ids = tagsToDelete.map((t: { id: string }) => t.id)
    // Also clean recurrence_tags
    await sb.from('recurrence_tags').delete().in('tag_id', ids)
    await sb.from('tags').delete().in('id', ids)
    results.push(`Deleted ${tagsToDelete.length} unused tags`)
  }

  // 2. Create Area tags (type = 'category', parent)
  const areaIdMap = new Map<string, string>()

  for (const [areaName, color] of Object.entries(NOTION_AREA_COLORS)) {
    // Check if already exists
    const { data: existing } = await sb.from('tags').select('id').eq('name', areaName).eq('type', 'category').limit(1)
    if (existing && existing.length > 0) {
      areaIdMap.set(areaName, existing[0].id)
      continue
    }
    const { data: created, error } = await sb.from('tags').insert({
      name: areaName,
      type: 'category',
      color,
      is_active: true,
    }).select('id').single()
    if (error) {
      results.push(`Error creating area "${areaName}": ${error.message}`)
    } else if (created) {
      areaIdMap.set(areaName, created.id)
    }
  }
  results.push(`Created/found ${areaIdMap.size} areas`)

  // 3. Create Category tags (type = 'purpose', with parentId)
  let catCount = 0
  for (const [areaName, categories] of Object.entries(NOTION_AREAS)) {
    const parentId = areaIdMap.get(areaName) || null
    for (const catName of categories) {
      const { data: existing } = await sb.from('tags').select('id').eq('name', catName).eq('type', 'purpose').limit(1)
      if (existing && existing.length > 0) continue
      const { error } = await sb.from('tags').insert({
        name: catName,
        type: 'purpose',
        parent_id: parentId,
        is_active: true,
      })
      if (!error) catCount++
      else results.push(`Error creating cat "${catName}": ${error.message}`)
    }
  }

  // Unassigned categories (no parent area)
  for (const catName of NOTION_UNASSIGNED_CATEGORIES) {
    const { data: existing } = await sb.from('tags').select('id').eq('name', catName).eq('type', 'purpose').limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('tags').insert({ name: catName, type: 'purpose', is_active: true })
    if (!error) catCount++
  }
  results.push(`Created ${catCount} categories`)

  // 4. Create Activity tags (type = 'scope')
  let actCount = 0
  for (const act of NOTION_ACTIVITIES) {
    const { data: existing } = await sb.from('tags').select('id').eq('name', act.name).eq('type', 'scope').limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('tags').insert({
      name: act.name,
      type: 'scope',
      is_active: true,
    })
    if (!error) actCount++
  }
  results.push(`Created ${actCount} activities (scope tags)`)

  // 5. Delete existing counterparties that are NOT linked to any transaction
  const { data: usedCpIds } = await sb.from('transactions').select('counterparty_id').not('counterparty_id', 'is', null)
  const usedCpSet = new Set((usedCpIds || []).map((r: { counterparty_id: string }) => r.counterparty_id))
  const { data: existingCps } = await sb.from('counterparties').select('id, name')
  const cpsToDelete = (existingCps || []).filter((c: { id: string }) => !usedCpSet.has(c.id))
  if (cpsToDelete.length > 0) {
    await sb.from('counterparties').delete().in('id', cpsToDelete.map((c: { id: string }) => c.id))
    results.push(`Deleted ${cpsToDelete.length} unused counterparties`)
  }

  // 6. Create counterparties from Notion data
  let cpCount = 0
  for (const name of NOTION_COUNTERPARTIES) {
    const { data: existing } = await sb.from('counterparties').select('id').eq('name', name).limit(1)
    if (existing && existing.length > 0) continue
    const { error } = await sb.from('counterparties').insert({ name, is_active: true })
    if (!error) cpCount++
  }
  results.push(`Created ${cpCount} counterparties`)

  return ok(res, { message: 'Seed completed', results })
}

// ============================================================
// INSTALLMENT PLANS
// ============================================================

async function handleInstallmentPlans(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb
      .from('installment_plans')
      .select('*, installments(*), counterparties(name), containers(name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('installment_plans')
      .select('*, installments(*), counterparties(name), containers(name)')
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Piano rateale non trovato')
    return ok(res, data)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const planId = b.id as string
    if (!planId) return badRequest(res, 'id e obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.description !== undefined) update.description = b.description
    if (b.totalAmount !== undefined) update.total_amount = b.totalAmount
    if (b.currency !== undefined) update.currency = b.currency
    if (b.numberOfInstallments !== undefined) update.number_of_installments = b.numberOfInstallments
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.reminderDaysBefore !== undefined) update.reminder_days_before = b.reminderDaysBefore
    if (b.notes !== undefined) update.notes = b.notes
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('installment_plans').update(update).eq('id', planId).select().single()
    if (error || !data) return notFound(res, 'Piano rateale non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const planId = (req.body as Record<string, unknown>)?.id as string
    if (!planId) return badRequest(res, 'id e obbligatorio')
    // Delete installments first, then the plan
    await sb.from('installments').delete().eq('plan_id', planId)
    const { data, error } = await sb.from('installment_plans').delete().eq('id', planId).select('id').single()
    if (error || !data) return notFound(res, 'Piano rateale non trovato')
    return ok(res, { deleted: true, id: planId })
  }

  if (method === 'POST' && bodyAction === 'pay-installment') {
    const installmentId = (req.body as Record<string, unknown>)?.installmentId as string
    const transactionId = (req.body as Record<string, unknown>)?.transactionId as string | undefined
    if (!installmentId) return badRequest(res, 'installmentId e obbligatorio')
    const update: Record<string, unknown> = {
      status: 'paid',
      updated_at: new Date().toISOString(),
    }
    if (transactionId) update.transaction_id = transactionId
    const { data, error } = await sb.from('installments').update(update).eq('id', installmentId).select().single()
    if (error || !data) return notFound(res, 'Rata non trovata')
    return ok(res, data)
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.description || !b.totalAmount || !b.numberOfInstallments)
      return badRequest(res, 'description, totalAmount e numberOfInstallments sono obbligatori')

    const { data: plan, error: planError } = await sb
      .from('installment_plans')
      .insert({
        description: b.description,
        total_amount: b.totalAmount,
        currency: b.currency ?? 'EUR',
        number_of_installments: b.numberOfInstallments,
        counterparty_id: b.counterpartyId ?? null,
        container_id: b.containerId ?? null,
        reminder_days_before: b.reminderDaysBefore ?? null,
        notes: b.notes ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (planError || !plan) throw planError

    // Auto-generate installments if startDate provided
    if (b.startDate && b.numberOfInstallments) {
      const numInst = parseInt(b.numberOfInstallments as string, 10)
      const instAmount = (parseFloat(b.totalAmount as string) / numInst).toFixed(2)
      const installments = []
      for (let i = 0; i < numInst; i++) {
        const dueDate = new Date(b.startDate as string)
        dueDate.setMonth(dueDate.getMonth() + i)
        installments.push({
          plan_id: plan.id,
          installment_number: i + 1,
          amount: instAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
        })
      }
      await sb.from('installments').insert(installments)
    }

    // Re-fetch with joins
    const { data: full } = await sb
      .from('installment_plans')
      .select('*, installments(*), counterparties(name), containers(name)')
      .eq('id', plan.id)
      .single()

    return created(res, full || plan)
  }

  return badRequest(res, `Metodo ${method} non supportato per installment-plans`)
}

// ============================================================
// IMPORT PROFILES
// ============================================================

async function handleImportProfiles(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb
      .from('import_profiles')
      .select('*, containers(name)')
      .order('name')
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('import_profiles')
      .select('*, containers(name)')
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Profilo di import non trovato')
    return ok(res, data)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const profileId = b.id as string
    if (!profileId) return badRequest(res, 'id e obbligatorio')
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.name !== undefined) update.name = b.name
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.fileType !== undefined) update.file_type = b.fileType
    if (b.delimiter !== undefined) update.delimiter = b.delimiter
    if (b.encoding !== undefined) update.encoding = b.encoding
    if (b.dateFormat !== undefined) update.date_format = b.dateFormat
    if (b.decimalSeparator !== undefined) update.decimal_separator = b.decimalSeparator
    if (b.thousandsSeparator !== undefined) update.thousands_separator = b.thousandsSeparator
    if (b.skipRows !== undefined) update.skip_rows = b.skipRows
    if (b.columnMapping !== undefined) update.column_mapping = b.columnMapping
    if (b.amountInverted !== undefined) update.amount_inverted = b.amountInverted
    if (b.separateAmountColumns !== undefined) update.separate_amount_columns = b.separateAmountColumns
    if (b.incomeColumn !== undefined) update.income_column = b.incomeColumn
    if (b.expenseColumn !== undefined) update.expense_column = b.expenseColumn
    if (b.notes !== undefined) update.notes = b.notes

    const { data, error } = await sb.from('import_profiles').update(update).eq('id', profileId).select().single()
    if (error || !data) return notFound(res, 'Profilo di import non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const profileId = (req.body as Record<string, unknown>)?.id as string
    if (!profileId) return badRequest(res, 'id e obbligatorio')
    const { data, error } = await sb.from('import_profiles').delete().eq('id', profileId).select('id').single()
    if (error || !data) return notFound(res, 'Profilo di import non trovato')
    return ok(res, { deleted: true, id: profileId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.containerId) return badRequest(res, 'name e containerId sono obbligatori')

    const { data, error } = await sb
      .from('import_profiles')
      .insert({
        name: b.name,
        container_id: b.containerId,
        file_type: b.fileType ?? 'csv',
        delimiter: b.delimiter ?? ',',
        encoding: b.encoding ?? 'UTF-8',
        date_format: b.dateFormat ?? 'DD/MM/YYYY',
        decimal_separator: b.decimalSeparator ?? ',',
        thousands_separator: b.thousandsSeparator ?? '.',
        skip_rows: b.skipRows ?? 0,
        column_mapping: b.columnMapping ?? {},
        amount_inverted: b.amountInverted ?? false,
        separate_amount_columns: b.separateAmountColumns ?? false,
        income_column: b.incomeColumn ?? null,
        expense_column: b.expenseColumn ?? null,
        notes: b.notes ?? null,
      })
      .select('*, containers(name)')
      .single()
    if (error) throw error
    return created(res, data)
  }

  return badRequest(res, `Metodo ${method} non supportato per import-profiles`)
}

// ============================================================
// MAIN ROUTER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Extract path segments — always parse from req.url for reliability
  // (Vercel rewrites can alter req.query.path, making it unreliable)
  const url = req.url || ''
  const pathPart = url.split('?')[0]
  const apiPath = pathPart.replace(/^\/api\/?/, '')
  const segments = apiPath ? apiPath.split('/').filter(Boolean) : []

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
      case 'smart-rules':
        return await handleSmartRules(req, res, segments[1] || null)
      case 'installment-plans':
        return await handleInstallmentPlans(req, res, segments[1] || null)
      case 'import-profiles':
        return await handleImportProfiles(req, res, segments[1] || null)
      case 'stats':
        return await handleStats(req, res, segments)
      case 'seed':
        return await handleSeed(req, res)
      case 'health':
        return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
      case '':
        return res.status(200).json({
          status: 'ok',
          endpoints: ['subjects', 'containers', 'counterparties', 'tags', 'transactions', 'recurrences', 'budget', 'installment-plans', 'import-profiles', 'stats', 'health'],
        })
      default:
        return res.status(404).json({ error: 'Not Found', message: `Nessun handler per: /${segments.join('/')}` })
    }
  } catch (err) {
    return serverError(res, err)
  }
}
