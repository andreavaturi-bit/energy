import { Link } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock,
  ArrowRight,
  Landmark,
  CreditCard,
  Smartphone,
  Banknote,
  PiggyBank,
  Bitcoin,
  Ticket,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { useDashboardStats, useContainers, useSubjects } from '@/lib/hooks'
import {
  formatCurrency,
  formatDate,
  containerTypeLabel,
  isInflow,
} from '@/lib/utils'
import type { ContainerType } from '@/types'

// Map container types to lucide-react icon components
const containerTypeIcons: Record<ContainerType, React.ComponentType<{ className?: string }>> = {
  bank_account: Landmark,
  credit_card: CreditCard,
  trading: TrendingUp,
  crypto: Bitcoin,
  payment_service: Smartphone,
  cash: Banknote,
  savings: PiggyBank,
  voucher: Ticket,
  other: Wallet,
}

export function Dashboard() {
  const todayFormatted = formatDate(new Date(), "EEEE d MMMM yyyy")

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: containers = [], isLoading: containersLoading } = useContainers()
  const { data: subjects = [] } = useSubjects()

  const isLoading = statsLoading || containersLoading

  // Patrimonio from balances
  const patrimonio = stats?.balances
    ?.filter((b) => b.currency === 'EUR')
    .reduce((sum, b) => sum + parseFloat(b.total), 0) ?? 0

  const entrateMese = stats?.monthly?.monthlyIncome ?? 0
  const usciteMese = stats?.monthly?.monthlyExpenses ?? 0
  const nettoMese = entrateMese - usciteMese
  const creditiPendenti = stats?.pending?.pendingCredits ?? 0
  const debitiPendenti = stats?.pending?.pendingDebits ?? 0

  // Top containers by balance
  const topContainers = [...containers]
    .filter((c) => c.isActive)
    .sort(
      (a, b) =>
        parseFloat(b.currentBalance ?? b.initialBalance ?? '0') -
        parseFloat(a.currentBalance ?? a.initialBalance ?? '0'),
    )
    .slice(0, 10)

  // Type summary
  const typeSummary = (() => {
    const activeContainers = containers.filter((c) => c.isActive)
    const typeMap = new Map<ContainerType, { count: number; total: number }>()

    for (const c of activeContainers) {
      const entry = typeMap.get(c.type) || { count: 0, total: 0 }
      entry.count += 1
      entry.total += parseFloat(c.currentBalance ?? c.initialBalance ?? '0')
      typeMap.set(c.type, entry)
    }

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total)
  })()

  // Recent transactions from stats
  const recentTransactions = stats?.recentTransactions ?? []

  function getSubjectName(subjectId: string): string | undefined {
    return subjects.find((s) => s.id === subjectId)?.name
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
        <span className="ml-3 text-zinc-400">Caricamento dashboard...</span>
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-sm">Errore nel caricamento dei dati.</p>
        <p className="text-xs text-zinc-500 mt-1">
          {statsError instanceof Error ? statsError.message : 'Errore sconosciuto'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Greeting header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Ciao Andrea</h1>
        <p className="mt-1 text-sm text-zinc-400 capitalize">
          {todayFormatted}
        </p>
      </div>

      {/* 2. Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Patrimonio Totale"
          value={formatCurrency(patrimonio)}
          icon={Wallet}
        />
        <StatCard
          title="Entrate Mese"
          value={formatCurrency(entrateMese)}
          icon={TrendingUp}
        />
        <StatCard
          title="Uscite Mese"
          value={formatCurrency(usciteMese)}
          icon={TrendingDown}
        />
        <StatCard
          title="Netto Mese"
          value={formatCurrency(nettoMese)}
          icon={ArrowUpDown}
        />
        <StatCard
          title="Crediti Pendenti"
          value={formatCurrency(creditiPendenti)}
          icon={Clock}
        />
        <StatCard
          title="Debiti Pendenti"
          value={formatCurrency(debitiPendenti)}
          icon={Clock}
        />
      </div>

      {/* 3. Container balances section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Conti Principali - top 10 by balance */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Conti Principali
          </h2>
          <div className="space-y-2">
            {topContainers.map((c) => {
              const subjectName = getSubjectName(c.subjectId)
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color || '#71717A' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {c.name}
                      </p>
                      {subjectName && (
                        <p className="truncate text-xs text-zinc-500">
                          {subjectName}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="ml-4 whitespace-nowrap text-sm font-semibold text-zinc-100">
                    {formatCurrency(c.currentBalance ?? c.initialBalance, c.currency)}
                  </p>
                </div>
              )
            })}
            {topContainers.length === 0 && (
              <p className="text-sm text-zinc-500 py-4 text-center">Nessun contenitore trovato</p>
            )}
          </div>
        </div>

        {/* Right: Per Tipologia */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Per Tipologia
          </h2>
          <div className="space-y-2">
            {typeSummary.map(({ type, count, total }) => {
              const Icon = containerTypeIcons[type]
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {containerTypeLabel(type)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {count} contenitor{count === 1 ? 'e' : 'i'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {formatCurrency(total)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Recent transactions (last 8) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            Transazioni Recenti
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-energy-400 transition-colors hover:text-energy-300"
          >
            Vedi tutte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="pb-2 text-left font-medium">Data</th>
                <th className="pb-2 text-left font-medium">Descrizione</th>
                <th className="pb-2 text-left font-medium hidden sm:table-cell">
                  Contenitore
                </th>
                <th className="pb-2 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentTransactions.slice(0, 8).map((tx) => {
                const amount = parseFloat(tx.amount)
                const inflow = isInflow(tx.type)
                // The API flattens container info into the transaction object
                const txAny = tx as unknown as Record<string, unknown>
                const cName = (txAny.containerName as string) ?? '\u2014'
                const cColor = (txAny.containerColor as string) ?? '#71717A'
                return (
                  <tr key={tx.id} className="text-sm">
                    <td className="whitespace-nowrap py-3 pr-4 text-zinc-400">
                      {formatDate(tx.date)}
                    </td>
                    <td className="max-w-[200px] truncate py-3 pr-4 text-zinc-200">
                      {tx.description}
                    </td>
                    <td className="hidden whitespace-nowrap py-3 pr-4 sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cColor }}
                        />
                        <span className="truncate text-zinc-400">
                          {cName}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`whitespace-nowrap py-3 text-right font-semibold ${
                        inflow ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {inflow ? '+ ' : '- '}
                      {formatCurrency(Math.abs(amount), tx.currency)}
                    </td>
                  </tr>
                )
              })}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                    Nessuna transazione recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
