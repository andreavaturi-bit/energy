import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
  created,
  badRequest,
  notFound,
} from '../supabase.js'

export async function handleRecurrences(
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
