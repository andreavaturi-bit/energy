import {
  TrendingUp,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus,
  ChevronRight,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react'
import { useContainers } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'

export function Projections() {
  const { data: containers = [], isLoading } = useContainers()

  // Compute total balance across all active EUR containers
  const totalBalance = containers
    .filter((c) => c.isActive && c.currency === 'EUR')
    .reduce((sum, c) => sum + parseFloat(c.currentBalance ?? c.initialBalance ?? '0'), 0)

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
          <p className="mt-1 text-xl font-bold text-zinc-500">—</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Minimo Previsto</p>
          <p className="mt-1 text-xl font-bold text-zinc-500">—</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Massimo Previsto</p>
          <p className="mt-1 text-xl font-bold text-zinc-500">—</p>
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
              Le proiezioni verranno calcolate automaticamente
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              dalle ricorrenze attive, pendenze e piani rateali
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
            Configura le ricorrenze nella sezione dedicata per vedere le proiezioni.
          </p>
        </div>
      </div>

      {/* Empty timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <Calendar className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Timeline Dettagliata</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Calendar className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Nessuna proiezione disponibile</p>
          <p className="text-xs text-zinc-600 mt-1">
            Le proiezioni appariranno quando saranno configurate ricorrenze e pendenze
          </p>
        </div>
      </div>
    </div>
  )
}
