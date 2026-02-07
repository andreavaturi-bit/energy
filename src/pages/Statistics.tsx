import {
  Filter,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Flame,
  Wallet,
} from 'lucide-react'

// Types reference: CategoryBreakdown, MonthlyTrend from @/types

// Placeholder category breakdown
const mockCategories = [
  { name: 'Affitto', amount: '€ 950,00', percentage: 27.3, color: '#ef4444' },
  { name: 'Bollette', amount: '€ 342,00', percentage: 9.8, color: '#f97316' },
  { name: 'Spesa alimentare', amount: '€ 437,00', percentage: 12.6, color: '#eab308' },
  { name: 'Trasporti', amount: '€ 185,00', percentage: 5.3, color: '#22c55e' },
  { name: 'Ristorazione', amount: '€ 312,00', percentage: 9.0, color: '#06b6d4' },
  { name: 'Subscriptions', amount: '€ 128,00', percentage: 3.7, color: '#8b5cf6' },
  { name: 'Altro', amount: '€ 1.126,00', percentage: 32.3, color: '#6b7280' },
]

// Placeholder monthly trend
const mockMonthlyTrend = [
  { month: 'Set 2025', income: 5100, expenses: 3200, net: 1900 },
  { month: 'Ott 2025', income: 5200, expenses: 3800, net: 1400 },
  { month: 'Nov 2025', income: 5200, expenses: 3500, net: 1700 },
  { month: 'Dic 2025', income: 6500, expenses: 4800, net: 1700 },
  { month: 'Gen 2026', income: 5200, expenses: 3480, net: 1720 },
  { month: 'Feb 2026', income: 2100, expenses: 1640, net: 460 },
]

export function Statistics() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Statistiche</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Analisi dettagliata delle tue finanze con grafici e indicatori
        </p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Calendar className="h-4 w-4 text-zinc-500" />
            Ultimi 6 mesi
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Wallet className="h-4 w-4 text-zinc-500" />
            Tutti i contenitori
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Filter className="h-4 w-4 text-zinc-500" />
            Tutti gli ambiti
          </button>
        </div>
      </div>

      {/* Equity Line chart placeholder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Equity Line</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-64">
          <div className="text-center">
            <TrendingUp className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Grafico equity line — andamento patrimonio netto nel tempo
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Placeholder per libreria grafici (Recharts / Chart.js)
            </p>
          </div>
        </div>
      </div>

      {/* Two column: Category breakdown + Monthly trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown (pie chart) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Ripartizione per Categoria</h2>
          </div>

          {/* Pie chart placeholder */}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-48 mb-4">
            <div className="text-center">
              <PieChart className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Grafico a torta</p>
            </div>
          </div>

          {/* Legend / breakdown list */}
          <div className="space-y-2">
            {mockCategories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 text-sm text-zinc-300">{cat.name}</span>
                <span className="text-sm text-zinc-400">{cat.amount}</span>
                <span className="text-xs text-zinc-500 w-12 text-right">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend (bar chart) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Trend Mensile</h2>
          </div>

          {/* Bar chart placeholder */}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-48 mb-4">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Grafico a barre mensile</p>
            </div>
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
                {mockMonthlyTrend.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2 text-zinc-400">{row.month}</td>
                    <td className="py-2 text-emerald-400 text-right">
                      {'\u20AC'} {row.income.toLocaleString('it-IT')}
                    </td>
                    <td className="py-2 text-red-400 text-right">
                      {'\u20AC'} {row.expenses.toLocaleString('it-IT')}
                    </td>
                    <td className={`py-2 text-right font-medium ${row.net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {'\u20AC'} {row.net.toLocaleString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Burning rate */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Burning Rate</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Spesa Media Giornaliera</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{'\u20AC'} 116,00</p>
            <p className="mt-0.5 text-xs text-zinc-500">Basata sugli ultimi 30 giorni</p>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Giorni di Autonomia</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">365</p>
            <p className="mt-0.5 text-xs text-zinc-500">Al tasso di spesa attuale</p>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Tasso di Risparmio</p>
            <p className="mt-1 text-2xl font-bold text-energy-400">33,1%</p>
            <p className="mt-0.5 text-xs text-zinc-500">Entrate vs Uscite (media 6 mesi)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
