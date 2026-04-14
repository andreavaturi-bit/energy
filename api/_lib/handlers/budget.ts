import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
  created,
  badRequest,
  notFound,
} from '../supabase.js'

export async function handleBudget(
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
