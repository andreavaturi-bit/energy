import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
} from '../supabase.js'

/**
 * Statistiche calcolate con funzioni SQL (RPC) per evitare il limite
 * righe di PostgREST: mai scaricare le transazioni e sommarle in JS.
 *
 * Multi-valuta: gli endpoint che restituiscono un numero unico
 * (by-tag, monthly-trend, burning-rate, totali mensili dashboard)
 * filtrano per valuta (default EUR, override con ?currency=).
 * I saldi della dashboard restano separati per valuta.
 */

const DEFAULT_CURRENCY = 'EUR'

export async function handleStats(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[],
) {
  const sb = getSupabase()
  const subRoute = segments[1] || ''

  const params = (req.query || {}) as Record<string, string | string[]>
  const param = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v }

  // ── GET /stats/by-tag — breakdown per tag con somme e conteggi ──
  if (subRoute === 'by-tag') {
    const dateFrom = param('dateFrom') || null
    const dateTo = param('dateTo') || null
    const containerId = param('containerId') || null
    const direction = param('direction') || 'expense' // expense or income
    const currency = param('currency') || DEFAULT_CURRENCY

    const { data: rows, error } = await sb.rpc('tag_breakdown', {
      p_direction: direction,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_container_id: containerId,
      p_currency: currency,
    })
    if (error) throw error

    const entries = (rows || []) as Array<{ tag_id: string | null; total: number | string; tx_count: number }>

    // Conteggio transazioni distinte (una tx con N tag conta 1 qui,
    // mentre nel breakdown compare sotto ognuno degli N tag)
    let countQuery = sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'cancelled')
      .neq('status', 'split')
      .neq('type', 'transfer_in')
      .neq('type', 'transfer_out')
      .eq('currency', currency)
    if (direction === 'expense') countQuery = countQuery.lt('amount', 0)
    else countQuery = countQuery.gt('amount', 0)
    if (dateFrom) countQuery = countQuery.gte('date', dateFrom)
    if (dateTo) countQuery = countQuery.lte('date', dateTo)
    if (containerId) countQuery = countQuery.eq('container_id', containerId)
    const { count: transactionCount } = await countQuery

    const grandTotal = entries.reduce((s, e) => s + (Number(e.total) || 0), 0)

    // Dettagli tag
    const tagIds = entries.map((e) => e.tag_id).filter((t): t is string => !!t)
    const tagInfoMap = new Map<string, { name: string; color: string }>()
    if (tagIds.length > 0) {
      const { data: tagRows } = await sb
        .from('tags')
        .select('id, name, color')
        .in('id', tagIds)
      for (const t of tagRows || []) {
        tagInfoMap.set(t.id as string, { name: t.name as string, color: t.color as string })
      }
    }

    const breakdown = entries
      .map((e) => {
        const total = Number(e.total) || 0
        const info = e.tag_id
          ? (tagInfoMap.get(e.tag_id) || { name: 'Sconosciuto', color: '#6b7280' })
          : { name: 'Non categorizzato', color: '#6b7280' }
        return {
          tagId: e.tag_id,
          tagName: info.name,
          tagColor: info.color,
          total,
          count: Number(e.tx_count) || 0,
          percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        }
      })
      .filter((b) => b.total > 0)
      .sort((a, b) => {
        // "Non categorizzato" sempre in fondo, il resto per totale decrescente
        if (a.tagId === null) return 1
        if (b.tagId === null) return -1
        return b.total - a.total
      })

    return ok(res, { breakdown, grandTotal, transactionCount: transactionCount ?? 0 })
  }

  // ── GET /stats/monthly-trend — monthly income/expenses ──
  if (subRoute === 'monthly-trend') {
    const dateFrom = param('dateFrom')
    const dateTo = param('dateTo')
    const containerId = param('containerId') || null
    const currency = param('currency') || DEFAULT_CURRENCY

    // Fallback: if no dateFrom, use months param (backwards compat)
    let startStr: string
    let endStr: string | null
    if (dateFrom) {
      startStr = dateFrom
      endStr = dateTo || null
    } else {
      const months = parseInt(param('months') || '6')
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      startStr = startDate.toISOString().slice(0, 10)
      endStr = null
    }

    const { data: rows, error } = await sb.rpc('monthly_flows', {
      p_date_from: startStr,
      p_date_to: endStr,
      p_container_id: containerId,
      p_currency: currency,
    })
    if (error) throw error

    const trend = ((rows || []) as Array<{ month: string; income: number | string; expenses: number | string }>)
      .map((r) => {
        const income = Math.round((Number(r.income) || 0) * 100) / 100
        const expenses = Math.round((Number(r.expenses) || 0) * 100) / 100
        return {
          month: r.month,
          income,
          expenses,
          net: Math.round((income - expenses) * 100) / 100,
        }
      })

    return ok(res, { trend })
  }

  // ── GET /stats/burning-rate — daily spending rate and autonomy ──
  if (subRoute === 'burning-rate') {
    const days = parseInt(param('days') || '90')
    const currency = param('currency') || DEFAULT_CURRENCY

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startStr = startDate.toISOString().slice(0, 10)

    const [{ data: flowRows, error: flowErr }, { data: balanceRows, error: balErr }] = await Promise.all([
      sb.rpc('flows_summary', {
        p_date_from: startStr,
        p_currency: currency,
        p_only_completed: true,
      }),
      sb.rpc('balances_by_currency'),
    ])
    if (flowErr) throw flowErr
    if (balErr) throw balErr

    const flow = ((flowRows || []) as Array<{ income: number | string; expenses: number | string }>)[0]
    const totalIncome = Number(flow?.income) || 0
    const totalExpenses = Number(flow?.expenses) || 0

    const dailyExpense = totalExpenses / days
    const dailyIncome = totalIncome / days
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // Autonomia calcolata sul patrimonio della stessa valuta dei flussi
    const balanceEntry = ((balanceRows || []) as Array<{ currency: string; total: number | string }>)
      .find((b) => b.currency === currency)
    const totalBalance = Number(balanceEntry?.total) || 0

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

  // ── Default: GET /stats — dashboard ──

  const currency = param('currency') || DEFAULT_CURRENCY

  // Mese corrente (per i totali mensili)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${monthStart.slice(0, 8)}${String(lastDay).padStart(2, '0')}`

  const [
    { data: balanceRows, error: balErr },
    { data: monthRows, error: monthErr },
    { data: pendingRows, error: pendErr },
    { data: recent },
    { count: activeCount },
  ] = await Promise.all([
    // 1) Saldi per valuta (contenitori attivi, SQL-side)
    sb.rpc('balances_by_currency'),
    // 2) Entrate/uscite del mese corrente (trasferimenti esclusi, SQL-side)
    sb.rpc('flows_summary', {
      p_date_from: monthStart,
      p_date_to: monthEnd,
      p_currency: currency,
    }),
    // 3) Transazioni pendenti per valuta (SQL-side)
    sb.rpc('pending_totals'),
    // 4) Ultime 10 transazioni
    sb
      .from('transactions')
      .select('*, containers(name, color)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    // 5) Conteggio contenitori attivi
    sb
      .from('containers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])
  if (balErr) throw balErr
  if (monthErr) throw monthErr
  if (pendErr) throw pendErr

  const balances = ((balanceRows || []) as Array<{ currency: string; total: number | string }>)
    .map((b) => ({ currency: b.currency, total: String(b.total) }))

  const month = ((monthRows || []) as Array<{ income: number | string; expenses: number | string; tx_count: number }>)[0]
  const pendingEntry = ((pendingRows || []) as Array<{ currency: string; credits: number | string; debits: number | string }>)
    .find((p) => p.currency === currency)

  const recentRows = (recent || []).map((r: Record<string, unknown>) => {
    const row = { ...r } as Record<string, unknown>
    const ct = row.containers as { name?: string; color?: string } | null
    row.container_name = ct?.name ?? null
    row.container_color = ct?.color ?? null
    delete row.containers
    return row
  })

  return ok(res, {
    balances,
    monthly: {
      monthly_income: Number(month?.income) || 0,
      monthly_expenses: Number(month?.expenses) || 0,
      transaction_count: Number(month?.tx_count) || 0,
    },
    pending: {
      pending_credits: Number(pendingEntry?.credits) || 0,
      pending_debits: Number(pendingEntry?.debits) || 0,
    },
    recentTransactions: recentRows,
    activeContainers: activeCount ?? 0,
  })
}
