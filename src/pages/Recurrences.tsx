import {
  Plus,
  Calendar,
  Repeat,
  Pause,
  Play,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'

// Types reference: Recurrence, Frequency from @/types

// Placeholder recurring transactions
const mockRecurrences = [
  {
    id: '1',
    description: 'Stipendio Kairos SRLS',
    frequency: 'Mensile',
    amount: '+ € 3.200,00',
    type: 'income' as const,
    container: 'Intesa Sanpaolo',
    counterparty: 'Kairos SRLS',
    dayOfMonth: 27,
    nextOccurrence: '27/02/2026',
    isActive: true,
    tags: ['Stipendio', 'Personale AV'],
  },
  {
    id: '2',
    description: 'Affitto Casa',
    frequency: 'Mensile',
    amount: '- € 950,00',
    type: 'expense' as const,
    container: 'Unicredit',
    counterparty: 'Immobiliare Rossi',
    dayOfMonth: 1,
    nextOccurrence: '01/03/2026',
    isActive: true,
    tags: ['Affitto', 'Familiare'],
  },
  {
    id: '3',
    description: 'Bolletta Enel',
    frequency: 'Bimestrale',
    amount: '- € 140,00',
    type: 'expense' as const,
    container: 'Unicredit',
    counterparty: 'Enel Energia',
    dayOfMonth: 5,
    nextOccurrence: '05/04/2026',
    isActive: true,
    tags: ['Bollette', 'Familiare'],
  },
  {
    id: '4',
    description: 'Netflix',
    frequency: 'Mensile',
    amount: '- € 17,99',
    type: 'expense' as const,
    container: 'Amex Platino',
    counterparty: 'Netflix',
    dayOfMonth: 15,
    nextOccurrence: '15/02/2026',
    isActive: true,
    tags: ['Subscriptions', 'Personale AV'],
  },
  {
    id: '5',
    description: 'Spotify Family',
    frequency: 'Mensile',
    amount: '- € 17,99',
    type: 'expense' as const,
    container: 'Amex Platino',
    counterparty: 'Spotify',
    dayOfMonth: 22,
    nextOccurrence: '22/02/2026',
    isActive: true,
    tags: ['Subscriptions', 'Familiare'],
  },
  {
    id: '6',
    description: 'Palestra (Annuale)',
    frequency: 'Annuale',
    amount: '- € 590,00',
    type: 'expense' as const,
    container: 'Intesa Sanpaolo',
    counterparty: 'Virgin Active',
    dayOfMonth: 1,
    nextOccurrence: '01/09/2026',
    isActive: true,
    tags: ['Palestra & Sport', 'Personale AV'],
  },
  {
    id: '7',
    description: 'Hosting VPS',
    frequency: 'Mensile',
    amount: '- € 24,00',
    type: 'expense' as const,
    container: 'PayPal',
    counterparty: 'Hetzner',
    dayOfMonth: 1,
    nextOccurrence: '01/03/2026',
    isActive: false,
    tags: ['Domini & Hosting', 'Kairos SRLS'],
  },
]

export function Recurrences() {
  const activeCount = mockRecurrences.filter((r) => r.isActive).length
  const inactiveCount = mockRecurrences.filter((r) => !r.isActive).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Ricorrenze</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestisci le transazioni ricorrenti e le scadenze automatiche
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
          <Plus className="h-4 w-4" />
          Nuova Ricorrenza
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-energy-400" />
            <p className="text-xs text-zinc-500">Ricorrenze Attive</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{activeCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-zinc-500" />
            <p className="text-xs text-zinc-500">In Pausa</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-400">{inactiveCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-zinc-500">Prossima Scadenza</p>
          </div>
          <p className="mt-1 text-lg font-bold text-amber-400">15/02/2026</p>
          <p className="text-xs text-zinc-500">Netflix — tra 8 giorni</p>
        </div>
      </div>

      {/* Recurrences list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Elenco Ricorrenze</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {mockRecurrences.map((rec) => (
            <div
              key={rec.id}
              className={`flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors ${
                !rec.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Direction icon */}
              <div className="shrink-0">
                {rec.type === 'income' ? (
                  <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-red-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {rec.description}
                  </p>
                  {!rec.isActive && (
                    <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                      In pausa
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-zinc-500">{rec.container}</span>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-500">{rec.counterparty}</span>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-500">{rec.frequency}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Next occurrence */}
              <div className="shrink-0 text-right">
                <p className="text-xs text-zinc-500">Prossima</p>
                <p className="text-sm font-medium text-zinc-300">{rec.nextOccurrence}</p>
              </div>

              {/* Amount */}
              <div className="shrink-0 text-right min-w-[120px]">
                <p className={`text-sm font-semibold ${
                  rec.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {rec.amount}
                </p>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1">
                <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title={rec.isActive ? 'Metti in pausa' : 'Riattiva'}>
                  {rec.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="Modifica">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400" title="Elimina">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
