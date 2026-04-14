import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
} from '../supabase.js'

export async function handleStats(
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
