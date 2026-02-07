import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Banknote,
  PiggyBank,
} from 'lucide-react'

// Summary card data (placeholder)
// Types reference: DashboardSummary from @/types

const summaryCards = [
  {
    title: 'Saldo Totale',
    value: '€ 42.350,00',
    icon: Wallet,
    color: 'text-energy-400',
    bgColor: 'bg-energy-500/10',
  },
  {
    title: 'Entrate Mensili',
    value: '€ 5.200,00',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    title: 'Uscite Mensili',
    value: '€ 3.480,00',
    icon: TrendingDown,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    title: 'Netto Mensile',
    value: '€ 1.720,00',
    icon: ArrowUpDown,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Crediti Pendenti',
    value: '€ 1.500,00',
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: 'Debiti Pendenti',
    value: '€ 800,00',
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
]

// Placeholder container balances
// Types reference: Container from @/types
const containerBalances = [
  { name: 'Intesa Sanpaolo', type: 'Conto Corrente', icon: Landmark, balance: '€ 18.200,00' },
  { name: 'Unicredit', type: 'Conto Corrente', icon: Landmark, balance: '€ 12.450,00' },
  { name: 'Amex Platino', type: 'Carta di Credito', icon: CreditCard, balance: '- € 1.200,00' },
  { name: 'Contanti', type: 'Contanti', icon: Banknote, balance: '€ 350,00' },
  { name: 'Conto Risparmio', type: 'Risparmio', icon: PiggyBank, balance: '€ 12.550,00' },
]

// Placeholder recent transactions
// Types reference: Transaction from @/types
const recentTransactions = [
  { date: '07/02/2026', description: 'Stipendio Febbraio', amount: '+ € 3.200,00', type: 'income' as const },
  { date: '06/02/2026', description: 'Spesa Esselunga', amount: '- € 87,50', type: 'expense' as const },
  { date: '05/02/2026', description: 'Bolletta Enel', amount: '- € 142,00', type: 'expense' as const },
  { date: '05/02/2026', description: 'Bonifico da Marco R.', amount: '+ € 500,00', type: 'income' as const },
  { date: '04/02/2026', description: 'Abbonamento Netflix', amount: '- € 17,99', type: 'expense' as const },
  { date: '03/02/2026', description: 'Trasferimento a Risparmio', amount: '- € 1.000,00', type: 'expense' as const },
  { date: '02/02/2026', description: 'Affitto Febbraio', amount: '- € 950,00', type: 'expense' as const },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Panoramica generale delle tue finanze
        </p>
      </div>

      {/* Summary cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 truncate">{card.title}</p>
                <p className={`text-lg font-semibold ${card.color}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Container balances & Recent transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Container balances */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Saldi Contenitori
            </h2>
            <span className="text-xs text-zinc-500">
              {containerBalances.length} contenitori attivi
            </span>
          </div>
          <div className="space-y-3">
            {containerBalances.map((container) => (
              <div
                key={container.name}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <container.icon className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {container.name}
                    </p>
                    <p className="text-xs text-zinc-500">{container.type}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  {container.balance}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Transazioni Recenti
            </h2>
            <button className="flex items-center gap-1 text-xs text-energy-400 hover:text-energy-300 transition-colors">
              <ArrowLeftRight className="h-3 w-3" />
              Vedi tutte
            </button>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-zinc-500">{tx.date}</p>
                </div>
                <p
                  className={`ml-4 text-sm font-semibold whitespace-nowrap ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tx.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
