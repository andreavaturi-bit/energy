import { useMemo } from 'react'
import {
  TrendingUp,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useContainers, useRecurrences, useTransactions } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'
import type { Recurrence } from '@/types'

interface ProjectionEvent {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  source: 'recurrence' | 'pending'
  runningBalance: number
}

const INCOME_TYPES = ['income', 'transfer_in', 'loan_in', 'repayment_in']
const PROJECTION_DAYS = 90

function getNextOccurrences(rec: Recurrence, startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const recStart = new Date(rec.startDate)
  const recEnd = rec.endDate ? new Date(rec.endDate) : null

  if (recEnd && recEnd < startDate) return dates

  switch (rec.frequency) {
    case 'daily': {
      const d = new Date(Math.max(recStart.getTime(), startDate.getTime()))
      while (d <= endDate) {
        if (!recEnd || d <= recEnd) dates.push(new Date(d))
        d.setDate(d.getDate() + 1)
      }
      break
    }
    case 'weekly': {
      const d = new Date(recStart)
      while (d <= endDate) {
        if (d >= startDate && (!recEnd || d <= recEnd)) dates.push(new Date(d))
        d.setDate(d.getDate() + 7)
      }
      break
    }
    case 'biweekly': {
      const d = new Date(recStart)
      while (d <= endDate) {
        if (d >= startDate && (!recEnd || d <= recEnd)) dates.push(new Date(d))
        d.setDate(d.getDate() + 14)
      }
      break
    }
    case 'monthly': {
      const dayOfMonth = rec.dayOfMonth ?? recStart.getDate()
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      for (let i = 0; i < PROJECTION_DAYS / 28 + 2; i++) {
        const month = new Date(d.getFullYear(), d.getMonth() + i, 1)
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        const actualDay = Math.min(dayOfMonth, lastDay)
        const target = new Date(month.getFullYear(), month.getMonth(), actualDay)
        if (target >= startDate && target <= endDate && (!recEnd || target <= recEnd)) {
          dates.push(target)
        }
      }
      break
    }
    case 'bimonthly': {
      const dayOfMonth = rec.dayOfMonth ?? recStart.getDate()
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      for (let i = 0; i < PROJECTION_DAYS / 28 + 2; i += 2) {
        const month = new Date(d.getFullYear(), d.getMonth() + i, 1)
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        const actualDay = Math.min(dayOfMonth, lastDay)
        const target = new Date(month.getFullYear(), month.getMonth(), actualDay)
        if (target >= startDate && target <= endDate && (!recEnd || target <= recEnd)) {
          dates.push(target)
        }
      }
      break
    }
    case 'quarterly': {
      const dayOfMonth = rec.dayOfMonth ?? recStart.getDate()
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      for (let i = 0; i < PROJECTION_DAYS / 28 + 6; i += 3) {
        const month = new Date(d.getFullYear(), d.getMonth() + i, 1)
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        const actualDay = Math.min(dayOfMonth, lastDay)
        const target = new Date(month.getFullYear(), month.getMonth(), actualDay)
        if (target >= startDate && target <= endDate && (!recEnd || target <= recEnd)) {
          dates.push(target)
        }
      }
      break
    }
    case 'semi_annual': {
      const dayOfMonth = rec.dayOfMonth ?? recStart.getDate()
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      for (let i = 0; i < PROJECTION_DAYS / 28 + 12; i += 6) {
        const month = new Date(d.getFullYear(), d.getMonth() + i, 1)
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        const actualDay = Math.min(dayOfMonth, lastDay)
        const target = new Date(month.getFullYear(), month.getMonth(), actualDay)
        if (target >= startDate && target <= endDate && (!recEnd || target <= recEnd)) {
          dates.push(target)
        }
      }
      break
    }
    case 'annual': {
      const d = new Date(recStart)
      for (let y = startDate.getFullYear(); y <= endDate.getFullYear() + 1; y++) {
        const target = new Date(y, d.getMonth(), d.getDate())
        if (target >= startDate && target <= endDate && (!recEnd || target <= recEnd)) {
          dates.push(target)
        }
      }
      break
    }
  }

  return dates
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function Projections() {
  const { data: containers = [], isLoading: containersLoading } = useContainers()
  const { data: recurrences = [], isLoading: recurrencesLoading } = useRecurrences()
  const { data: pendingData, isLoading: pendingLoading } = useTransactions({ status: 'pending', limit: '200' })

  const totalBalance = containers
    .filter((c) => c.isActive && c.currency === 'EUR')
    .reduce((sum, c) => sum + parseFloat(c.currentBalance ?? c.initialBalance ?? '0'), 0)

  const pendingTransactions = pendingData?.rows ?? []
  const activeRecurrences = recurrences.filter((r) => r.isActive)

  const { events, projectedBalance, minBalance, maxBalance } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + PROJECTION_DAYS)

    const rawEvents: Omit<ProjectionEvent, 'runningBalance'>[] = []

    // Add events from recurrences
    for (const rec of activeRecurrences) {
      const isIncome = INCOME_TYPES.includes(rec.type)
      const amount = rec.amount ? parseFloat(rec.amount) : 0
      if (amount === 0) continue

      const occurrences = getNextOccurrences(rec, today, endDate)
      for (const date of occurrences) {
        rawEvents.push({
          date: toDateStr(date),
          description: rec.description,
          amount: isIncome ? Math.abs(amount) : -Math.abs(amount),
          type: isIncome ? 'income' : 'expense',
          source: 'recurrence',
        })
      }
    }

    // Add pending transactions (using their date as due date)
    for (const tx of pendingTransactions) {
      const txDate = new Date(tx.date)
      if (txDate >= today && txDate <= endDate) {
        const isIncome = INCOME_TYPES.includes(tx.type)
        const amount = parseFloat(tx.amount)
        rawEvents.push({
          date: tx.date,
          description: tx.description || 'Transazione pendente',
          amount: isIncome ? Math.abs(amount) : -Math.abs(amount),
          type: isIncome ? 'income' : 'expense',
          source: 'pending',
        })
      }
    }

    // Sort by date
    rawEvents.sort((a, b) => a.date.localeCompare(b.date))

    // Calculate running balance
    let balance = totalBalance
    let min = totalBalance
    let max = totalBalance

    const eventsWithBalance: ProjectionEvent[] = rawEvents.map((e) => {
      balance += e.amount
      min = Math.min(min, balance)
      max = Math.max(max, balance)
      return { ...e, runningBalance: balance }
    })

    return {
      events: eventsWithBalance,
      projectedBalance: balance,
      minBalance: min,
      maxBalance: max,
    }
  }, [activeRecurrences, pendingTransactions, totalBalance])

  const isLoading = containersLoading || recurrencesLoading || pendingLoading
  const hasData = events.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Proiezioni</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Flusso di cassa previsto basato su ricorrenze, pendenze e piani rateali
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Saldo Attuale (EUR)</p>
          <p className="mt-1 text-xl font-bold text-zinc-100">
            {formatCurrency(totalBalance, 'EUR')}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Saldo Previsto (3 mesi)</p>
          <p className={`mt-1 text-xl font-bold ${hasData ? (projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
            {hasData ? formatCurrency(projectedBalance, 'EUR') : '-'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Minimo Previsto</p>
          <p className={`mt-1 text-xl font-bold ${hasData ? (minBalance >= 0 ? 'text-zinc-100' : 'text-red-400') : 'text-zinc-500'}`}>
            {hasData ? formatCurrency(minBalance, 'EUR') : '-'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Massimo Previsto</p>
          <p className={`mt-1 text-xl font-bold ${hasData ? 'text-zinc-100' : 'text-zinc-500'}`}>
            {hasData ? formatCurrency(maxBalance, 'EUR') : '-'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Flusso di Cassa Previsto</h2>
        </div>

        {!hasData ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-64">
            <div className="text-center">
              <TrendingUp className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Nessun dato per le proiezioni</p>
              <p className="text-xs text-zinc-600 mt-1">
                Configura ricorrenze o aggiungi pendenze per vedere le proiezioni
              </p>
            </div>
          </div>
        ) : (
          <ProjectionChart
            events={events}
            startBalance={totalBalance}
            minBalance={minBalance}
            maxBalance={maxBalance}
          />
        )}
      </div>

      {/* Info banner */}
      {activeRecurrences.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-900/50 bg-blue-500/5 px-4 py-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300">
              Nessuna ricorrenza attiva configurata.
            </p>
            <p className="text-xs text-blue-400/60 mt-1">
              Configura le ricorrenze nella sezione dedicata per ottenere proiezioni piu accurate.
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <Calendar className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Timeline Dettagliata</h2>
          <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {events.length} eventi
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nessuna proiezione disponibile</p>
            <p className="text-xs text-zinc-600 mt-1">
              Le proiezioni appariranno quando saranno configurate ricorrenze e pendenze
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50 max-h-[600px] overflow-y-auto">
            {events.map((event, i) => (
              <div key={`${event.date}-${event.description}-${i}`} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="shrink-0 w-20">
                  <p className="text-xs text-zinc-400">
                    {new Date(event.date).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="shrink-0">
                  {event.type === 'income' ? (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{event.description}</p>
                  <span className="text-xs text-zinc-600">
                    {event.source === 'recurrence' ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Ricorrenza
                      </span>
                    ) : (
                      'Pendenza'
                    )}
                  </span>
                </div>
                <p className={`shrink-0 text-sm font-semibold min-w-[100px] text-right ${event.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {event.amount >= 0 ? '+' : ''}{formatCurrency(event.amount)}
                </p>
                <p className="shrink-0 text-sm text-zinc-400 min-w-[120px] text-right font-mono">
                  {formatCurrency(event.runningBalance)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SVG Projection Chart ───────────────────────────────────

function ProjectionChart({
  events,
  startBalance,
  minBalance,
  maxBalance,
}: {
  events: ProjectionEvent[]
  startBalance: number
  minBalance: number
  maxBalance: number
}) {
  const svgW = 1000
  const svgH = 300
  const padL = 10
  const padR = 10
  const padT = 20
  const padB = 20
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const range = maxBalance - minBalance || 1

  // Build data points: start + each event
  const points: Array<{ x: number; y: number; balance: number }> = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + PROJECTION_DAYS)
  const totalMs = endDate.getTime() - today.getTime()

  // Start point
  points.push({
    x: padL,
    y: padT + chartH - ((startBalance - minBalance) / range) * chartH,
    balance: startBalance,
  })

  for (const event of events) {
    const eventDate = new Date(event.date)
    const ms = eventDate.getTime() - today.getTime()
    const xFrac = Math.max(0, Math.min(1, ms / totalMs))
    const x = padL + xFrac * chartW
    const y = padT + chartH - ((event.runningBalance - minBalance) / range) * chartH

    points.push({ x, y, balance: event.runningBalance })
  }

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Area fill path
  const areaPath = `M${padL},${padT + chartH} L${polylinePoints.replace(/,/g, ' ').split(' ').reduce((acc, val, i) => {
    if (i % 2 === 0) return acc + ` L${val},`
    return acc + val
  }, '').slice(2)} L${points[points.length - 1].x},${padT + chartH} Z`

  // Simplified area path
  const areaPoints = points.map((p) => `${p.x},${p.y}`).join(' L')
  const areaD = `M${padL},${padT + chartH} L${areaPoints} L${points[points.length - 1].x},${padT + chartH} Z`

  const lastBalance = points[points.length - 1]?.balance ?? startBalance
  const lineColor = lastBalance >= 0 ? '#22c55e' : '#ef4444'

  // Zero line position
  const showZeroLine = minBalance < 0 && maxBalance > 0
  const zeroY = padT + chartH - ((0 - minBalance) / range) * chartH

  return (
    <div className="w-full h-56">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Zero line */}
        {showZeroLine && (
          <line x1={padL} y1={zeroY} x2={svgW - padR} y2={zeroY} stroke="#52525b" strokeWidth="1" strokeDasharray="4,4" />
        )}

        {/* Area fill */}
        <path d={areaD} fill="url(#projGradient)" opacity="0.3" />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Start and end dots */}
        {points.length > 0 && (
          <>
            <circle cx={points[0].x} cy={points[0].y} r="4" fill={lineColor} vectorEffect="non-scaling-stroke" />
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={lineColor} vectorEffect="non-scaling-stroke" />
          </>
        )}

        <defs>
          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
