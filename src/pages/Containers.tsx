import {
  Plus,
  Landmark,
  CreditCard,
  TrendingUp,
  Bitcoin,
  Smartphone,
  Banknote,
  PiggyBank,
  Ticket,
  Wallet,
} from 'lucide-react'

// Types reference: Container, ContainerType from @/types

// Map container type to icon
const typeIcons: Record<string, typeof Landmark> = {
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

// Placeholder container groups
const containerGroups = [
  {
    type: 'Conti Correnti',
    typeKey: 'bank_account',
    containers: [
      { id: '1', name: 'Intesa Sanpaolo', provider: 'Intesa Sanpaolo', balance: '€ 18.200,00', subject: 'Andrea V.', color: '#3b82f6', isActive: true },
      { id: '2', name: 'Unicredit Conto', provider: 'Unicredit', balance: '€ 12.450,00', subject: 'Andrea V.', color: '#ef4444', isActive: true },
      { id: '3', name: 'ING Conto Arancio', provider: 'ING', balance: '€ 3.100,00', subject: 'Andrea V.', color: '#f97316', isActive: true },
    ],
  },
  {
    type: 'Carte di Credito',
    typeKey: 'credit_card',
    containers: [
      { id: '4', name: 'Amex Platino', provider: 'American Express', balance: '- € 1.200,00', subject: 'Andrea V.', color: '#a78bfa', isActive: true },
      { id: '5', name: 'Visa Unicredit', provider: 'Unicredit', balance: '- € 340,00', subject: 'Andrea V.', color: '#ef4444', isActive: true },
    ],
  },
  {
    type: 'Trading',
    typeKey: 'trading',
    containers: [
      { id: '6', name: 'Directa Trading', provider: 'Directa SIM', balance: '€ 8.500,00', subject: 'Andrea V.', color: '#10b981', isActive: true },
    ],
  },
  {
    type: 'Crypto',
    typeKey: 'crypto',
    containers: [
      { id: '7', name: 'Binance', provider: 'Binance', balance: '€ 2.300,00', subject: 'Andrea V.', color: '#eab308', isActive: true },
    ],
  },
  {
    type: 'Servizi di Pagamento',
    typeKey: 'payment_service',
    containers: [
      { id: '8', name: 'PayPal', provider: 'PayPal', balance: '€ 450,00', subject: 'Andrea V.', color: '#3b82f6', isActive: true },
      { id: '9', name: 'Satispay', provider: 'Satispay', balance: '€ 120,00', subject: 'Andrea V.', color: '#ef4444', isActive: true },
    ],
  },
  {
    type: 'Contanti',
    typeKey: 'cash',
    containers: [
      { id: '10', name: 'Contanti Portafoglio', provider: '—', balance: '€ 350,00', subject: 'Andrea V.', color: '#a3a3a3', isActive: true },
    ],
  },
  {
    type: 'Risparmio',
    typeKey: 'savings',
    containers: [
      { id: '11', name: 'Conto Deposito ING', provider: 'ING', balance: '€ 12.550,00', subject: 'Andrea V.', color: '#f97316', isActive: true },
    ],
  },
]

export function Containers() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contenitori</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestisci conti, carte, wallet e tutti i contenitori finanziari
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
          <Plus className="h-4 w-4" />
          Nuovo Contenitore
        </button>
      </div>

      {/* Container groups */}
      <div className="space-y-8">
        {containerGroups.map((group) => {
          const TypeIcon = typeIcons[group.typeKey] || Wallet
          return (
            <div key={group.typeKey}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <TypeIcon className="h-5 w-5 text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-200">
                  {group.type}
                </h2>
                <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  {group.containers.length}
                </span>
              </div>

              {/* Container cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.containers.map((container) => (
                  <div
                    key={container.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: container.color }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {container.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {container.provider}
                          </p>
                        </div>
                      </div>
                      {container.isActive && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          Attivo
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-zinc-500">Saldo attuale</p>
                      <p className={`text-xl font-bold ${
                        container.balance.startsWith('-')
                          ? 'text-red-400'
                          : 'text-zinc-100'
                      }`}>
                        {container.balance}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-500">
                        Soggetto: <span className="text-zinc-400">{container.subject}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
