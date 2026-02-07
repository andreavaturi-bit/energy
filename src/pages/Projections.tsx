import {
  TrendingUp,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus,
  ChevronRight,
  AlertTriangle,
  Info,
} from 'lucide-react'

// Types reference: ProjectionItem from @/types

// Placeholder projection timeline
const mockProjections = [
  { date: '07/02/2026', description: 'Saldo attuale', amount: null, isEstimate: false, runningBalance: 42350, type: 'balance' as const },
  { date: '15/02/2026', description: 'Netflix', amount: -17.99, isEstimate: false, runningBalance: 42332.01, type: 'expense' as const },
  { date: '15/02/2026', description: 'Saldo Amex Platino', amount: -1200, isEstimate: false, runningBalance: 41132.01, type: 'expense' as const },
  { date: '22/02/2026', description: 'Spotify Family', amount: -17.99, isEstimate: false, runningBalance: 41114.02, type: 'expense' as const },
  { date: '27/02/2026', description: 'Stipendio Kairos SRLS', amount: 3200, isEstimate: false, runningBalance: 44314.02, type: 'income' as const },
  { date: '01/03/2026', description: 'Affitto Casa', amount: -950, isEstimate: false, runningBalance: 43364.02, type: 'expense' as const },
  { date: '01/03/2026', description: 'Rata MacBook Pro', amount: -333.25, isEstimate: false, runningBalance: 43030.77, type: 'expense' as const },
  { date: '15/03/2026', description: 'Netflix', amount: -17.99, isEstimate: false, runningBalance: 43012.78, type: 'expense' as const },
  { date: '16/03/2026', description: 'F24 IVA Q4 2025', amount: -2400, isEstimate: true, runningBalance: 40612.78, type: 'expense' as const },
  { date: '22/03/2026', description: 'Spotify Family', amount: -17.99, isEstimate: false, runningBalance: 40594.79, type: 'expense' as const },
  { date: '27/03/2026', description: 'Stipendio Kairos SRLS', amount: 3200, isEstimate: false, runningBalance: 43794.79, type: 'income' as const },
  { date: '01/04/2026', description: 'Affitto Casa', amount: -950, isEstimate: false, runningBalance: 42844.79, type: 'expense' as const },
  { date: '01/04/2026', description: 'Rata Assicurazione Auto', amount: -300, isEstimate: false, runningBalance: 42544.79, type: 'expense' as const },
  { date: '05/04/2026', description: 'Bolletta Enel (stima)', amount: -140, isEstimate: true, runningBalance: 42404.79, type: 'expense' as const },
]

export function Projections() {
  const minBalance = Math.min(...mockProjections.map((p) => p.runningBalance))
  const maxBalance = Math.max(...mockProjections.map((p) => p.runningBalance))

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
          <p className="text-xs text-zinc-500">Saldo Attuale</p>
          <p className="mt-1 text-xl font-bold text-zinc-100">
            {'\u20AC'} 42.350,00
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Saldo Previsto (3 mesi)</p>
          <p className="mt-1 text-xl font-bold text-energy-400">
            {'\u20AC'} {mockProjections[mockProjections.length - 1].runningBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Minimo Previsto</p>
          <p className="mt-1 text-xl font-bold text-amber-400">
            {'\u20AC'} {minBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Massimo Previsto</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {'\u20AC'} {maxBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Flusso di Cassa Previsto</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 h-64">
          <div className="text-center">
            <TrendingUp className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Grafico timeline flusso di cassa proiettato
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Placeholder per libreria grafici (Recharts / Chart.js)
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-900/50 bg-blue-500/5 px-4 py-3">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-300">
            Le proiezioni si basano sulle ricorrenze attive, le pendenze in scadenza e i piani rateali in corso.
          </p>
          <p className="text-xs text-blue-400/60 mt-1">
            I valori stimati sono indicati con il simbolo di approssimazione (~).
          </p>
        </div>
      </div>

      {/* Projection timeline table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <Calendar className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Timeline Dettagliata</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {mockProjections.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors ${
                item.type === 'balance' ? 'bg-zinc-800/20' : ''
              }`}
            >
              {/* Icon */}
              <div className="shrink-0">
                {item.type === 'balance' ? (
                  <Minus className="h-4 w-4 text-zinc-500" />
                ) : item.type === 'income' ? (
                  <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-red-400" />
                )}
              </div>

              {/* Date */}
              <div className="shrink-0 w-24">
                <p className="text-sm text-zinc-400">{item.date}</p>
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <p className={`text-sm truncate ${
                  item.type === 'balance' ? 'font-semibold text-zinc-200' : 'text-zinc-300'
                }`}>
                  {item.description}
                </p>
                {item.isEstimate && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-500">~stima</span>
                  </span>
                )}
              </div>

              {/* Amount */}
              <div className="shrink-0 w-28 text-right">
                {item.amount !== null && (
                  <p className={`text-sm font-medium ${
                    item.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {item.amount > 0 ? '+' : ''}{'\u20AC'} {Math.abs(item.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-3 w-3 text-zinc-700 shrink-0" />

              {/* Running balance */}
              <div className="shrink-0 w-36 text-right">
                <p className="text-sm font-semibold text-zinc-100">
                  {'\u20AC'} {item.runningBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
