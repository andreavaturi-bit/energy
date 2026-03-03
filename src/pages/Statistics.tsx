import { useState, useEffect } from 'react'
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Flame,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { statsApi, type TagBreakdownItem, type MonthlyTrendItem, type BurningRateStats } from '@/lib/api'
import { useContainers } from '@/lib/hooks'
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

export function Statistics() {
  const { data: containers = [] } = useContainers()
  const [containerId, setContainerId] = useState('')
  const [months, setMonths] = useState(6)
  const [direction, setDirection] = useState<'expense' | 'income'>('expense')

  // Stats state
  const [breakdown, setBreakdown] = useState<TagBreakdownItem[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [trend, setTrend] = useState<MonthlyTrendItem[]>([])
  const [burning, setBurning] = useState<BurningRateStats | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(true)
  const [loadingTrend, setLoadingTrend] = useState(true)
  const [loadingBurning, setLoadingBurning] = useState(true)

  // Compute date range from months
  const now = new Date()
  const dateFrom = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).toISOString().slice(0, 10)
  const dateTo = now.toISOString().slice(0, 10)

  // Fetch tag breakdown
  useEffect(() => {
    setLoadingBreakdown(true)
    statsApi.getByTag({
      dateFrom,
      dateTo,
      containerId: containerId || undefined,
      direction,
      tagType: 'category',
    }).then(data => {
      setBreakdown(data.breakdown || [])
      setGrandTotal(data.grandTotal || 0)
    }).catch(() => {
      setBreakdown([])
      setGrandTotal(0)
    }).finally(() => setLoadingBreakdown(false))
  }, [dateFrom, dateTo, containerId, direction])

  // Fetch monthly trend
  useEffect(() => {
    setLoadingTrend(true)
    statsApi.getMonthlyTrend({
      months,
      containerId: containerId || undefined,
    }).then(data => {
      setTrend(data.trend || [])
    }).catch(() => setTrend([]))
    .finally(() => setLoadingTrend(false))
  }, [months, containerId])

  // Fetch burning rate
  useEffect(() => {
    setLoadingBurning(true)
    statsApi.getBurningRate({ days: months * 30 }).then(data => {
      setBurning(data)
    }).catch(() => setBurning(null))
    .finally(() => setLoadingBurning(false))
  }, [months])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Statistiche</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Analisi dettagliata delle tue finanze per categoria, trend e burning rate
        </p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period */}
          <select
            value={months}
            onChange={e => setMonths(parseInt(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          >
            <option value={3}>Ultimi 3 mesi</option>
            <option value={6}>Ultimi 6 mesi</option>
            <option value={12}>Ultimo anno</option>
            <option value={24}>Ultimi 2 anni</option>
          </select>

          {/* Container */}
          <select
            value={containerId}
            onChange={e => setContainerId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          >
            <option value="">Tutti i contenitori</option>
            {containers.filter(c => c.isActive).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

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
              <h2 className="text-lg font-semibold text-zinc-100">Ripartizione per Categoria</h2>
            </div>
            {!loadingBreakdown && (
              <span className="text-sm text-zinc-500">
                Totale: {formatCurrency(grandTotal)}
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

      {/* Equity Line placeholder - keeping for future chart library */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Equity Line</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-48">
          <div className="text-center">
            <TrendingUp className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Grafico equity line — andamento patrimonio netto nel tempo
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Prossima implementazione con libreria grafici
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
