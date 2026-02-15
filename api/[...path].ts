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

    const { data, error } = await sb
      .from('subjects')
      .update(update)
      .eq('id', id)
      .select()
      .single()
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
    if (b.isActive !== undefined) update.is_active = b.isActive
    if (b.notes !== undefined) update.notes = b.notes

    const { data, error } = await sb
      .from('containers')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) return notFound(res, 'Contenitore non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    // Check for linked transactions first
    const { count } = await sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('container_id', id)
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

    const { data, error } = await sb
      .from('counterparties')
      .update(update)
      .eq('id', id)
      .select()
      .single()
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

    const { data, error } = await sb
      .from('tags')
      .update(update)
      .eq('id', id)
      .select()
      .single()
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
    const { data, error } = await sb.from('transactions').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id })
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

    const { data, error } = await sb
      .from('recurrences')
      .update(update)
      .eq('id', id)
      .select()
      .single()
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

  if (method === 'POST' && !periodId) {
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

    const { data, error } = await sb
      .from('budget_periods')
      .update(update)
      .eq('id', periodId)
      .select()
      .single()
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
