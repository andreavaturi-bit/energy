import {
  Plus,
  Search,
  Filter,
  Calendar,
  Wallet,
  Tag,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Types reference: Transaction, TransactionFilters from @/types

// Placeholder transactions for the table
const mockTransactions = [
  { id: '1', date: '07/02/2026', valueDate: '07/02/2026', description: 'Stipendio Febbraio', container: 'Intesa Sanpaolo', counterparty: 'Kairos SRLS', type: 'Entrata', tags: ['Stipendio', 'Personale AV'], amount: '+ € 3.200,00', status: 'completed' as const },
  { id: '2', date: '06/02/2026', valueDate: '06/02/2026', description: 'Spesa Esselunga', container: 'Intesa Sanpaolo', counterparty: 'Esselunga', type: 'Uscita', tags: ['Spesa alimentare', 'Familiare'], amount: '- € 87,50', status: 'completed' as const },
  { id: '3', date: '05/02/2026', valueDate: '05/02/2026', description: 'Bolletta Enel Energia', container: 'Unicredit', counterparty: 'Enel Energia', type: 'Uscita', tags: ['Bollette', 'Familiare'], amount: '- € 142,00', status: 'completed' as const },
  { id: '4', date: '05/02/2026', valueDate: '07/02/2026', description: 'Bonifico da Marco R.', container: 'Intesa Sanpaolo', counterparty: 'Marco Rossi', type: 'Entrata', tags: ['Rimborso'], amount: '+ € 500,00', status: 'pending' as const },
  { id: '5', date: '04/02/2026', valueDate: '04/02/2026', description: 'Netflix Abbonamento', container: 'Amex Platino', counterparty: 'Netflix', type: 'Uscita', tags: ['Subscriptions', 'Personale AV'], amount: '- € 17,99', status: 'completed' as const },
  { id: '6', date: '03/02/2026', valueDate: '03/02/2026', description: 'Trasferimento a Conto Risparmio', container: 'Intesa Sanpaolo', counterparty: '—', type: 'Trasferimento', tags: [], amount: '- € 1.000,00', status: 'completed' as const },
  { id: '7', date: '02/02/2026', valueDate: '02/02/2026', description: 'Affitto Febbraio', container: 'Unicredit', counterparty: 'Immobiliare Rossi', type: 'Uscita', tags: ['Affitto', 'Familiare'], amount: '- € 950,00', status: 'completed' as const },
  { id: '8', date: '01/02/2026', valueDate: '01/02/2026', description: 'Fattura consulenza Q1', container: 'Intesa Sanpaolo', counterparty: 'Cliente XYZ', type: 'Entrata', tags: ['Consulenza', 'Kairos SRLS'], amount: '+ € 2.000,00', status: 'pending' as const },
]

const statusStyles = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  projected: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-zinc-500/10 text-zinc-400',
}

const statusLabels = {
  completed: 'Completata',
  pending: 'In sospeso',
  projected: 'Proiettata',
  cancelled: 'Annullata',
}

export function Transactions() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Transazioni</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Registro completo di tutte le operazioni finanziarie
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
          <Plus className="h-4 w-4" />
          Nuova Transazione
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Cerca transazioni..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
            />
          </div>

          {/* Date range */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Calendar className="h-4 w-4 text-zinc-500" />
            01/02/2026 — 28/02/2026
          </button>

          {/* Container filter */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Wallet className="h-4 w-4 text-zinc-500" />
            Contenitore
          </button>

          {/* Type filter */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <ArrowUpDown className="h-4 w-4 text-zinc-500" />
            Tipo
          </button>

          {/* Status filter */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Filter className="h-4 w-4 text-zinc-500" />
            Stato
          </button>

          {/* Tags filter */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Tag className="h-4 w-4 text-zinc-500" />
            Tags
          </button>

          {/* Export */}
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <Download className="h-4 w-4 text-zinc-500" />
            Esporta
          </button>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 font-medium text-zinc-400">Data</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Descrizione</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Contenitore</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Controparte</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Tipo</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Tags</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Stato</th>
                <th className="px-4 py-3 font-medium text-zinc-400 text-right">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-zinc-200 font-medium max-w-[250px] truncate">{tx.description}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{tx.container}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{tx.counterparty}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{tx.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tx.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[tx.status]}`}>
                      {statusLabels[tx.status]}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                    tx.amount.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <p className="text-sm text-zinc-500">
            Visualizzazione 1-8 di 243 transazioni
          </p>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-50" disabled>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-400">Pagina 1 di 31</span>
            <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
