import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Flame,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react'
import { statsApi, type TagBreakdownItem, type MonthlyTrendItem, type BurningRateStats } from '@/lib/api'
import { useContainers } from '@/lib/hooks'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { formatCurrency } from '@/lib/utils'

const monthLabels: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
  '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `${monthLabels[m] || m} ${y}`
}

// ── Date presets ────────────────────────────────────────────

function getPresetDates(preset: string): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
    }
    case 'this-quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      const from = new Date(now.getFullYear(), q, 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'last-quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      const from = new Date(now.getFullYear(), q - 3, 1)
      const to = new Date(now.getFullYear(), q, 0)
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
    }
    case '3m': {
      const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case '6m': {
      const from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'this-year': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'last-year': {
      const from = new Date(now.getFullYear() - 1, 0, 1)
      const to = new Date(now.getFullYear() - 1, 11, 31)
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
    }
    case '2y': {
      const from = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'all': {
      return { from: '2000-01-01', to: today }
    }
    default: // 1y
      const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return { from: from.toISOString().slice(0, 10), to: today }
  }
}

const presets = [
  { value: 'this-month', label: 'Mese corrente' },
  { value: 'last-month', label: 'Mese scorso' },
  { value: 'this-quarter', label: 'Trimestre corrente' },
  { value: 'last-quarter', label: 'Trimestre scorso' },
  { value: '3m', label: 'Ultimi 3 mesi' },
  { value: '6m', label: 'Ultimi 6 mesi' },
  { value: 'this-year', label: 'Anno corrente' },
  { value: 'last-year', label: 'Anno scorso' },
  { value: '1y', label: 'Ultimo anno' },
  { value: '2y', label: 'Ultimi 2 anni' },
  { value: 'all', label: 'Tutto lo storico' },
]

// ── Component ───────────────────────────────────────────────

export function Statistics() {
  const { data: containers = [] } = useContainers()
  const [containerId, setContainerId] = useState('')
  const [direction, setDirection] = useState<'expense' | 'income'>('expense')
  const [preset, setPreset] = useState('all')

  // Date range — initialized from preset, but user can override with custom dates
  const presetDates = useMemo(() => getPresetDates(preset), [preset])
  const [dateFrom, setDateFrom] = useState(presetDates.from)
  const [dateTo, setDateTo] = useState(presetDates.to)

  // Sync dates when preset changes
  useEffect(() => {
    const d = getPresetDates(preset)
    setDateFrom(d.from)
    setDateTo(d.to)
  }, [preset])

  // Compute months count for trend endpoint
  const monthsCount = useMemo(() => {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
  }, [dateFrom, dateTo])

  // Stats state
  const [breakdown, setBreakdown] = useState<TagBreakdownItem[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [txCount, setTxCount] = useState(0)
  const [trend, setTrend] = useState<MonthlyTrendItem[]>([])
  const [burning, setBurning] = useState<BurningRateStats | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(true)
  const [loadingTrend, setLoadingTrend] = useState(true)
  const [loadingBurning, setLoadingBurning] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  // Fetch tag breakdown
  useEffect(() => {
    setLoadingBreakdown(true)
    setErrors([])
    statsApi.getByTag({
      dateFrom,
      dateTo,
      containerId: containerId || undefined,
      direction,
    }).then(data => {
      setBreakdown(data.breakdown || [])
      setGrandTotal(data.grandTotal || 0)
      setTxCount(data.transactionCount || 0)
    }).catch((err) => {
      console.error('Stats by-tag error:', err)
      setErrors(prev => [...prev, `Breakdown: ${err.message}`])
      setBreakdown([])
      setGrandTotal(0)
      setTxCount(0)
    }).finally(() => setLoadingBreakdown(false))
  }, [dateFrom, dateTo, containerId, direction])

  // Fetch monthly trend
  useEffect(() => {
    setLoadingTrend(true)
    statsApi.getMonthlyTrend({
      months: monthsCount,
      containerId: containerId || undefined,
    }).then(data => {
      setTrend(data.trend || [])
    }).catch((err) => {
      console.error('Stats monthly-trend error:', err)
      setErrors(prev => [...prev, `Trend: ${err.message}`])
      setTrend([])
    })
    .finally(() => setLoadingTrend(false))
  }, [monthsCount, containerId])

  // Fetch burning rate
  useEffect(() => {
    setLoadingBurning(true)
    const days = Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000)))
    statsApi.getBurningRate({ days }).then(data => {
      setBurning(data)
    }).catch((err) => {
      console.error('Stats burning-rate error:', err)
      setErrors(prev => [...prev, `Burning rate: ${err.message}`])
      setBurning(null)
    })
    .finally(() => setLoadingBurning(false))
  }, [dateFrom, dateTo])

  // Trend totals
  const trendTotals = useMemo(() => {
    return trend.reduce((acc, row) => ({
      income: acc.income + row.income,
      expenses: acc.expenses + row.expenses,
      net: acc.net + row.net,
    }), { income: 0, expenses: 0, net: 0 })
  }, [trend])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Statistiche</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Analisi dettagliata delle tue finanze per categoria, trend e burning rate
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm font-medium text-red-400 mb-1">Errori nel caricamento delle statistiche:</p>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400/80">{e}</p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset selector */}
          <SearchableSelect
            value={preset}
            onChange={setPreset}
            options={presets}
            placeholder="Periodo..."
            className="min-w-[170px]"
          />

          {/* Custom date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPreset('') }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 [color-scheme:dark]"
            />
            <span className="text-xs text-zinc-500">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPreset('') }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 [color-scheme:dark]"
            />
          </div>

          {/* Container */}
          <SearchableSelect
            value={containerId}
            onChange={setContainerId}
            options={containers.filter(c => c.isActive).map(c => ({ value: c.id, label: c.name, color: c.color }))}
            placeholder="Contenitore"
            allowEmpty
            emptyLabel="Tutti i contenitori"
            className="min-w-[160px]"
          />

          {/* Direction for breakdown */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setDirection('expense')}
              className={`px-3 py-2 text-sm transition-colors ${direction === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            >
              <ArrowDownRight className="h-4 w-4 inline mr-1" />
              Uscite
            </button>
            <button
              onClick={() => setDirection('income')}
              className={`px-3 py-2 text-sm transition-colors ${direction === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            >
              <ArrowUpRight className="h-4 w-4 inline mr-1" />
              Entrate
            </button>
          </div>
        </div>
      </div>

      {/* Two column: Category breakdown + Monthly trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Ripartizione per Tag</h2>
            </div>
            {!loadingBreakdown && (
              <span className="text-sm text-zinc-500">
                Totale: {formatCurrency(grandTotal)} ({txCount} tx)
              </span>
            )}
          </div>

          {loadingBreakdown ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-energy-400" />
            </div>
          ) : breakdown.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">Nessun dato per il periodo selezionato</p>
            </div>
          ) : (
            <>
              {/* Visual bar breakdown */}
              <div className="flex h-6 rounded-full overflow-hidden mb-4">
                {breakdown.map((cat, i) => (
                  <div
                    key={cat.tagId || `untagged-${i}`}
                    className="h-full transition-all"
                    style={{
                      backgroundColor: cat.tagColor || '#6b7280',
                      width: `${Math.max(cat.percentage, 1)}%`,
                    }}
                    title={`${cat.tagName}: ${cat.percentage.toFixed(1)}%`}
                  />
                ))}
              </div>

              {/* Legend / breakdown list */}
              <div className="space-y-2">
                {breakdown.map((cat, i) => (
                  <div key={cat.tagId || `untagged-${i}`} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.tagColor || '#6b7280' }}
                    />
                    <span className="flex-1 text-sm text-zinc-300">{cat.tagName}</span>
                    <span className="text-xs text-zinc-500">{cat.count} tx</span>
                    <span className="text-sm text-zinc-400 w-24 text-right">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="text-xs text-zinc-500 w-12 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Monthly trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Trend Mensile</h2>
          </div>

          {loadingTrend ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-energy-400" />
            </div>
          ) : trend.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">Nessun dato per il periodo selezionato</p>
            </div>
          ) : (
            <>
              {/* Visual bar chart */}
              <div className="flex items-end gap-1 h-48 mb-4 px-2">
                {trend.map(row => {
                  const maxVal = Math.max(...trend.map(t => Math.max(t.income, t.expenses)))
                  const incH = maxVal > 0 ? (row.income / maxVal) * 100 : 0
                  const expH = maxVal > 0 ? (row.expenses / maxVal) * 100 : 0
                  return (
                    <div key={row.month} className="flex-1 flex items-end gap-0.5" title={formatMonth(row.month)}>
                      <div
                        className="flex-1 bg-emerald-500/40 rounded-t transition-all"
                        style={{ height: `${incH}%`, minHeight: row.income > 0 ? '4px' : '0' }}
                      />
                      <div
                        className="flex-1 bg-red-500/40 rounded-t transition-all"
                        style={{ height: `${expH}%`, minHeight: row.expenses > 0 ? '4px' : '0' }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1 px-2 mb-4">
                {trend.map(row => (
                  <div key={row.month} className="flex-1 text-center text-[10px] text-zinc-500">
                    {formatMonth(row.month).split(' ')[0]}
                  </div>
                ))}
              </div>

              {/* Trend data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="pb-2 font-medium text-zinc-500">Mese</th>
                      <th className="pb-2 font-medium text-emerald-500 text-right">Entrate</th>
                      <th className="pb-2 font-medium text-red-500 text-right">Uscite</th>
                      <th className="pb-2 font-medium text-blue-500 text-right">Netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {trend.map(row => (
                      <tr key={row.month}>
                        <td className="py-2 text-zinc-400">{formatMonth(row.month)}</td>
                        <td className="py-2 text-emerald-400 text-right">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="py-2 text-red-400 text-right">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td className={`py-2 text-right font-medium ${row.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          {formatCurrency(row.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700">
                      <td className="py-2 text-zinc-300 font-semibold">Totale</td>
                      <td className="py-2 text-emerald-400 text-right font-semibold">
                        {formatCurrency(trendTotals.income)}
                      </td>
                      <td className="py-2 text-red-400 text-right font-semibold">
                        {formatCurrency(trendTotals.expenses)}
                      </td>
                      <td className={`py-2 text-right font-bold ${trendTotals.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {formatCurrency(trendTotals.net)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Burning rate */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Burning Rate</h2>
        </div>

        {loadingBurning ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-energy-400" />
          </div>
        ) : burning ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div className="rounded-xl bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Spesa Media Giornaliera</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">
                {formatCurrency(burning.dailyExpense)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Ultimi {burning.periodDays} giorni</p>
            </div>
            <div className="rounded-xl bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Giorni di Autonomia</p>
              <p className={`mt-1 text-2xl font-bold ${burning.autonomyDays > 365 ? 'text-emerald-400' : burning.autonomyDays > 90 ? 'text-amber-400' : 'text-red-400'}`}>
                {burning.autonomyDays > 9000 ? '∞' : burning.autonomyDays.toLocaleString('it-IT')}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Al tasso di spesa attuale</p>
            </div>
            <div className="rounded-xl bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Tasso di Risparmio</p>
              <p className={`mt-1 text-2xl font-bold ${burning.savingsRate > 20 ? 'text-energy-400' : burning.savingsRate > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {burning.savingsRate.toFixed(1)}%
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Entrate vs Uscite</p>
            </div>
            <div className="rounded-xl bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Patrimonio Netto</p>
              <p className={`mt-1 text-2xl font-bold ${burning.totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(burning.totalBalance)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Saldo totale contenitori attivi</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-8">Dati non disponibili</p>
        )}
      </div>
    </div>
  )
}
