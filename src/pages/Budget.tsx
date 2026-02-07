import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'

// Types reference: BudgetPeriod, BudgetAllocation from @/types

// Placeholder budget allocations
const mockAllocations = [
  { category: 'Affitto', allocated: 950, actual: 950, percentage: 100 },
  { category: 'Bollette', allocated: 400, actual: 342, percentage: 85.5 },
  { category: 'Spesa alimentare', allocated: 500, actual: 437, percentage: 87.4 },
  { category: 'Trasporti', allocated: 200, actual: 185, percentage: 92.5 },
  { category: 'Ristorazione', allocated: 250, actual: 312, percentage: 124.8 },
  { category: 'Subscriptions', allocated: 150, actual: 128, percentage: 85.3 },
  { category: 'Salute', allocated: 100, actual: 45, percentage: 45 },
  { category: 'Abbigliamento', allocated: 150, actual: 89, percentage: 59.3 },
  { category: 'Tecnologia', allocated: 100, actual: 0, percentage: 0 },
  { category: 'Viaggi & Vacanze', allocated: 300, actual: 0, percentage: 0 },
  { category: 'Altro', allocated: 200, actual: 156, percentage: 78 },
]

const totalAllocated = mockAllocations.reduce((s, a) => s + a.allocated, 0)
const totalActual = mockAllocations.reduce((s, a) => s + a.actual, 0)

export function Budget() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Budget</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pianifica e monitora le allocazioni di spesa per periodo
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
          <Plus className="h-4 w-4" />
          Nuovo Periodo
        </button>
      </div>

      {/* Period selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-zinc-100">Febbraio 2026</h2>
            <p className="text-xs text-zinc-500">01/02/2026 — 28/02/2026</p>
          </div>
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Budget Totale Allocato</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">
            {'\u20AC'} {totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Speso Finora</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {'\u20AC'} {totalActual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {((totalActual / totalAllocated) * 100).toFixed(1)}% del budget
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Rimanente</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {'\u20AC'} {(totalAllocated - totalActual).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {(100 - (totalActual / totalAllocated) * 100).toFixed(1)}% disponibile
          </p>
        </div>
      </div>

      {/* Allocation table - Budget vs Actual */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Budget vs Consuntivo</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Confronto tra allocazione prevista e spesa effettiva per categoria
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-3 font-medium text-zinc-400">Categoria</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-right">Allocato</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-right">Consuntivo</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-right">Differenza</th>
                <th className="px-6 py-3 font-medium text-zinc-400 w-[200px]">Progresso</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {mockAllocations.map((row) => {
                const diff = row.allocated - row.actual
                const overBudget = row.percentage > 100
                return (
                  <tr key={row.category} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3 text-zinc-200 font-medium">{row.category}</td>
                    <td className="px-6 py-3 text-zinc-300 text-right">
                      {'\u20AC'} {row.allocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-zinc-300 text-right">
                      {'\u20AC'} {row.actual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{'\u20AC'} {diff.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-zinc-800">
                          <div
                            className={`h-2 rounded-full ${overBudget ? 'bg-red-500' : 'bg-energy-500'}`}
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-12 text-right">
                          {row.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {overBudget ? (
                        <AlertTriangle className="inline h-4 w-4 text-red-400" />
                      ) : row.percentage > 80 ? (
                        <TrendingUp className="inline h-4 w-4 text-amber-400" />
                      ) : (
                        <TrendingDown className="inline h-4 w-4 text-emerald-400" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-800/30">
                <td className="px-6 py-3 font-semibold text-zinc-100">Totale</td>
                <td className="px-6 py-3 text-zinc-100 text-right font-semibold">
                  {'\u20AC'} {totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3 text-zinc-100 text-right font-semibold">
                  {'\u20AC'} {totalActual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
                <td className={`px-6 py-3 text-right font-semibold ${totalAllocated - totalActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  +{'\u20AC'} {(totalAllocated - totalActual).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-energy-500"
                        style={{ width: `${Math.min((totalActual / totalAllocated) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 w-12 text-right">
                      {((totalActual / totalAllocated) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
