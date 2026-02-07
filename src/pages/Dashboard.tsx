import { useMemo } from 'react'
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
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import {
  CONTAINERS,
  TRANSACTIONS,
  getSubject,
  getContainer,
} from '@/lib/mockData'
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
  // Today's date in Italian format (e.g. "venerdi 7 febbraio 2026")
  const todayFormatted = formatDate(new Date(), "EEEE d MMMM yyyy")

  // -----------------------------------------------------------
  // 2. Summary stats computed from mock data
  // -----------------------------------------------------------
  const stats = useMemo(() => {
    // Patrimonio Totale: sum of all active EUR container initialBalances
    const patrimonio = CONTAINERS
      .filter((c) => c.isActive && c.currency === 'EUR')
      .reduce((sum, c) => sum + parseFloat(c.initialBalance || '0'), 0)

    // Determine the "current month" from the most recent transaction
    const sorted = [...TRANSACTIONS].sort((a, b) =>
      b.date.localeCompare(a.date),
    )
    const currentMonth = (sorted[0]?.date ?? new Date().toISOString().slice(0, 10)).slice(0, 7)

    // All transactions in the current month (excluding cancelled)
    const monthlyTx = TRANSACTIONS.filter(
      (t) => t.date.startsWith(currentMonth) && t.status !== 'cancelled',
    )

    // Entrate Mese: income transactions only
    const entrateMese = monthlyTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    // Uscite Mese: expense transactions only (absolute value)
    const usciteMese = monthlyTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

    // Netto Mese
    const nettoMese = entrateMese - usciteMese

    // Pending transactions
    const pendingTx = TRANSACTIONS.filter((t) => t.status === 'pending')

    const creditiPendenti = pendingTx
      .filter((t) => isInflow(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const debitiPendenti = pendingTx
      .filter((t) => !isInflow(t.type))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

    return {
      patrimonio,
      entrateMese,
      usciteMese,
      nettoMese,
      creditiPendenti,
      debitiPendenti,
    }
  }, [])

  // -----------------------------------------------------------
  // 3a. Top 10 containers by balance (descending)
  // -----------------------------------------------------------
  const topContainers = useMemo(
    () =>
      [...CONTAINERS]
        .filter((c) => c.isActive)
        .sort(
          (a, b) =>
            parseFloat(b.initialBalance || '0') -
            parseFloat(a.initialBalance || '0'),
        )
        .slice(0, 10),
    [],
  )

  // -----------------------------------------------------------
  // 3b. Summary by container type
  // -----------------------------------------------------------
  const typeSummary = useMemo(() => {
    const activeContainers = CONTAINERS.filter((c) => c.isActive)
    const typeMap = new Map<ContainerType, { count: number; total: number }>()

    for (const c of activeContainers) {
      const entry = typeMap.get(c.type) || { count: 0, total: 0 }
      entry.count += 1
      entry.total += parseFloat(c.initialBalance || '0')
      typeMap.set(c.type, entry)
    }

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [])

  // -----------------------------------------------------------
  // 4. Last 8 transactions (by date descending)
  // -----------------------------------------------------------
  const recentTransactions = useMemo(
    () =>
      [...TRANSACTIONS]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
    [],
  )

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
          value={formatCurrency(stats.patrimonio)}
          icon={Wallet}
        />
        <StatCard
          title="Entrate Mese"
          value={formatCurrency(stats.entrateMese)}
          icon={TrendingUp}
        />
        <StatCard
          title="Uscite Mese"
          value={formatCurrency(stats.usciteMese)}
          icon={TrendingDown}
        />
        <StatCard
          title="Netto Mese"
          value={formatCurrency(stats.nettoMese)}
          icon={ArrowUpDown}
        />
        <StatCard
          title="Crediti Pendenti"
          value={formatCurrency(stats.creditiPendenti)}
          icon={Clock}
        />
        <StatCard
          title="Debiti Pendenti"
          value={formatCurrency(stats.debitiPendenti)}
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
              const subject = getSubject(c.subjectId)
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
                      {subject && (
                        <p className="truncate text-xs text-zinc-500">
                          {subject.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="ml-4 whitespace-nowrap text-sm font-semibold text-zinc-100">
                    {formatCurrency(c.initialBalance, c.currency)}
                  </p>
                </div>
              )
            })}
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
              {recentTransactions.map((tx) => {
                const container = getContainer(tx.containerId)
                const amount = parseFloat(tx.amount)
                const inflow = isInflow(tx.type)
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
                          style={{
                            backgroundColor: container?.color || '#71717A',
                          }}
                        />
                        <span className="truncate text-zinc-400">
                          {container?.name ?? '\u2014'}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
