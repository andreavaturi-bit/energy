import { useState, useMemo } from 'react'
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
  ArrowLeftRight,
  X,
  Search,
  Filter,
  Clock,
} from 'lucide-react'
import { useContainers, useCounterparties } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'
import type { Frequency, TransactionType } from '@/types'

interface MockRecurrence {
  id: string
  description: string
  frequency: Frequency
  intervalDays?: number
  dayOfMonth?: number
  dayOfWeek?: number
  businessDaysOnly: boolean
  amount: string
  amountIsEstimate: boolean
  currency: string
  containerId: string
  counterpartyId?: string
  type: TransactionType
  sharedWithSubjectId?: string
  sharePercentage?: string
  startDate: string
  endDate?: string
  reminderDaysBefore?: number
  isActive: boolean
  tags: string[]
}

const frequencyLabels: Record<Frequency, string> = {
  daily: 'Giornaliera',
  weekly: 'Settimanale',
  biweekly: 'Bisettimanale',
  monthly: 'Mensile',
  bimonthly: 'Bimestrale',
  quarterly: 'Trimestrale',
  semi_annual: 'Semestrale',
  annual: 'Annuale',
  custom: 'Personalizzata',
}

const typeLabels: Record<string, string> = {
  income: 'Entrata',
  expense: 'Uscita',
  transfer_out: 'Trasferimento',
}

// Realistic mock recurrences based on Andrea's actual financial data
const initialRecurrences: MockRecurrence[] = [
  { id: 'rec-1', description: 'Affitto casa', frequency: 'monthly', dayOfMonth: 1, businessDaysOnly: false, amount: '-1800.00', amountIsEstimate: false, currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-proprietario', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Affitto', 'Familiare'] },
  { id: 'rec-2', description: 'Netflix', frequency: 'monthly', dayOfMonth: 15, businessDaysOnly: false, amount: '-17.99', amountIsEstimate: false, currency: 'EUR', containerId: 'c-amex-av', counterpartyId: 'cp-netflix', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Netflix', 'Familiare'] },
  { id: 'rec-3', description: 'Spotify Family', frequency: 'monthly', dayOfMonth: 22, businessDaysOnly: false, amount: '-17.99', amountIsEstimate: false, currency: 'EUR', containerId: 'c-amex-av', counterpartyId: 'cp-spotify', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Spotify', 'Familiare'] },
  { id: 'rec-4', description: 'Bolletta Enel', frequency: 'bimonthly', dayOfMonth: 5, businessDaysOnly: false, amount: '-245.00', amountIsEstimate: true, currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-enel', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Bollette', 'Familiare'] },
  { id: 'rec-5', description: 'Baby sitter Monia', frequency: 'weekly', dayOfWeek: 5, businessDaysOnly: false, amount: '-300.00', amountIsEstimate: false, currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-monia', type: 'expense', startDate: '2024-09-01', isActive: true, tags: ['Baby Sitter', 'Familiare'] },
  { id: 'rec-6', description: 'Ricarica Satispay', frequency: 'weekly', dayOfWeek: 1, businessDaysOnly: false, amount: '-100.00', amountIsEstimate: false, currency: 'EUR', containerId: 'c-isp', type: 'transfer_out', startDate: '2024-01-01', isActive: true, tags: ['Personale'] },
  { id: 'rec-7', description: 'Incasso corso Opzionetika', frequency: 'monthly', dayOfMonth: 10, businessDaysOnly: true, amount: '4200.00', amountIsEstimate: true, currency: 'EUR', containerId: 'c-isp-kairos', type: 'income', sharedWithSubjectId: 's-mirko', sharePercentage: '50', startDate: '2024-01-01', isActive: true, tags: ['Corsi VS', 'Da dividere con Mirko'] },
  { id: 'rec-8', description: 'ChatGPT Plus', frequency: 'monthly', dayOfMonth: 1, businessDaysOnly: false, amount: '-20.00', amountIsEstimate: false, currency: 'USD', containerId: 'c-amex-av', type: 'expense', startDate: '2024-06-01', isActive: true, tags: ['ChatGPT', 'Personale'] },
  { id: 'rec-9', description: 'Claude Pro', frequency: 'monthly', dayOfMonth: 5, businessDaysOnly: false, amount: '-20.00', amountIsEstimate: false, currency: 'USD', containerId: 'c-amex-av', type: 'expense', startDate: '2024-09-01', isActive: true, tags: ['Claude', 'Personale'] },
  { id: 'rec-10', description: 'TradingView Pro', frequency: 'annual', dayOfMonth: 15, businessDaysOnly: false, amount: '-159.00', amountIsEstimate: false, currency: 'USD', containerId: 'c-amex-vs', type: 'expense', startDate: '2024-03-15', isActive: true, tags: ['TradingView', 'VS / Opzionetika'] },
  { id: 'rec-11', description: 'VPS Hosting', frequency: 'monthly', dayOfMonth: 1, businessDaysOnly: false, amount: '-24.00', amountIsEstimate: false, currency: 'EUR', containerId: 'c-pp-kairos', type: 'expense', startDate: '2024-01-01', isActive: false, tags: ['VPN/VPS', 'Aziendale Kairos'] },
  { id: 'rec-12', description: 'Spesa Esselunga settimanale', frequency: 'weekly', dayOfWeek: 6, businessDaysOnly: false, amount: '-180.00', amountIsEstimate: true, currency: 'EUR', containerId: 'c-amex-av', counterpartyId: 'cp-esselunga', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Spesa alimentare', 'Familiare'] },
  { id: 'rec-13', description: 'Commercialista aziendale', frequency: 'quarterly', dayOfMonth: 15, businessDaysOnly: true, amount: '-500.00', amountIsEstimate: false, currency: 'EUR', containerId: 'c-isp-kairos', type: 'expense', startDate: '2024-01-01', isActive: true, tags: ['Commercialista aziendale', 'Aziendale Kairos'] },
  { id: 'rec-14', description: 'F24 IVA trimestrale', frequency: 'quarterly', dayOfMonth: 16, businessDaysOnly: true, amount: '-3200.00', amountIsEstimate: true, currency: 'EUR', containerId: 'c-isp-kairos', counterpartyId: 'cp-ade', type: 'expense', startDate: '2024-03-16', reminderDaysBefore: 7, isActive: true, tags: ['F24 - IVA', 'Aziendale Kairos'] },
]

function getNextOccurrence(rec: MockRecurrence): string {
  const now = new Date()
  const next = new Date(now)

  if (rec.dayOfMonth) {
    next.setDate(rec.dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
  } else if (rec.dayOfWeek !== undefined) {
    const diff = (rec.dayOfWeek - now.getDay() + 7) % 7
    next.setDate(now.getDate() + (diff === 0 ? 7 : diff))
  }

  return next.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDaysUntilNext(rec: MockRecurrence): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(now)

  if (rec.dayOfMonth) {
    next.setDate(rec.dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
  } else if (rec.dayOfWeek !== undefined) {
    const diff = (rec.dayOfWeek - now.getDay() + 7) % 7
    next.setDate(now.getDate() + (diff === 0 ? 7 : diff))
  }

  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getMonthlyImpact(rec: MockRecurrence): number {
  const amount = parseFloat(rec.amount)
  switch (rec.frequency) {
    case 'daily': return amount * 30
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'bimonthly': return amount / 2
    case 'quarterly': return amount / 3
    case 'semi_annual': return amount / 6
    case 'annual': return amount / 12
    default: return amount
  }
}

export function Recurrences() {
  const { data: containers = [] } = useContainers()
  const { data: counterparties = [] } = useCounterparties()
  const [recurrences, setRecurrences] = useState<MockRecurrence[]>(initialRecurrences)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer_out'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingRec, setEditingRec] = useState<MockRecurrence | null>(null)

  const filtered = useMemo(() => {
    return recurrences.filter((r) => {
      if (!showInactive && !r.isActive) return false
      if (filterType !== 'all' && r.type !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [recurrences, search, filterType, showInactive])

  const activeRecs = recurrences.filter((r) => r.isActive)
  const inactiveCount = recurrences.filter((r) => !r.isActive).length

  const monthlyExpenses = activeRecs
    .filter((r) => parseFloat(r.amount) < 0)
    .reduce((sum, r) => sum + Math.abs(getMonthlyImpact(r)), 0)
  const monthlyIncome = activeRecs
    .filter((r) => parseFloat(r.amount) > 0)
    .reduce((sum, r) => sum + getMonthlyImpact(r), 0)

  const nextRec = activeRecs.sort((a, b) => getDaysUntilNext(a) - getDaysUntilNext(b))[0]

  function toggleActive(id: string) {
    setRecurrences((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)),
    )
  }

  function deleteRec(id: string) {
    setRecurrences((prev) => prev.filter((r) => r.id !== id))
  }

  function openEdit(rec: MockRecurrence) {
    setEditingRec(rec)
    setShowModal(true)
  }

  function openCreate() {
    setEditingRec(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Ricorrenze</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeRecs.length} ricorrenze attive, {inactiveCount} in pausa
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Nuova Ricorrenza
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-energy-400" />
            <p className="text-xs text-zinc-500">Ricorrenze Attive</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{activeRecs.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-zinc-500">Uscite Mensili Ricorrenti</p>
          </div>
          <p className="mt-1 text-xl font-bold text-red-400">
            {formatCurrency(-monthlyExpenses)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-zinc-500">Entrate Mensili Ricorrenti</p>
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {formatCurrency(monthlyIncome)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-zinc-500">Prossima Scadenza</p>
          </div>
          {nextRec && (
            <>
              <p className="mt-1 text-lg font-bold text-amber-400">{getNextOccurrence(nextRec)}</p>
              <p className="text-xs text-zinc-500">{nextRec.description} — tra {getDaysUntilNext(nextRec)} giorni</p>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca ricorrenze..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800 text-xs">
          {([['all', 'Tutte'], ['expense', 'Uscite'], ['income', 'Entrate'], ['transfer_out', 'Trasferimenti']] as const).map(([value, label]) => (
            <button
              key={value}
              className={`px-3 py-2 transition-colors first:rounded-l-lg last:rounded-r-lg ${
                filterType === value ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setFilterType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
            showInactive
              ? 'border-energy-500 bg-energy-500/10 text-energy-400'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
          onClick={() => setShowInactive(!showInactive)}
        >
          <Pause className="h-3.5 w-3.5" />
          In pausa ({inactiveCount})
        </button>
      </div>

      {/* Recurrences list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">
            Elenco Ricorrenze
            <span className="ml-2 text-sm font-normal text-zinc-500">({filtered.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
              <Repeat className="h-8 w-8" />
              <p className="text-sm">Nessuna ricorrenza trovata</p>
            </div>
          ) : (
            filtered.map((rec) => {
              const container = containers.find((c) => c.id === rec.containerId)
              const counterparty = rec.counterpartyId ? counterparties.find((cp) => cp.id === rec.counterpartyId) : null
              const amount = parseFloat(rec.amount)
              const daysUntil = getDaysUntilNext(rec)

              return (
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
                    ) : rec.type === 'transfer_out' ? (
                      <ArrowLeftRight className="h-5 w-5 text-blue-400" />
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
                      {rec.amountIsEstimate && (
                        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                          ~stima
                        </span>
                      )}
                      {rec.sharedWithSubjectId && (
                        <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">
                          50/50
                        </span>
                      )}
                      {!rec.isActive && (
                        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          In pausa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">
                        {container?.name || 'N/A'}
                      </span>
                      {counterparty && (
                        <>
                          <span className="text-xs text-zinc-600">|</span>
                          <span className="text-xs text-zinc-500">{counterparty.name}</span>
                        </>
                      )}
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">
                        {frequencyLabels[rec.frequency]}
                        {rec.businessDaysOnly ? ' (gg. lav.)' : ''}
                      </span>
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
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-xs text-zinc-500">Prossima</p>
                    <p className="text-sm font-medium text-zinc-300">{getNextOccurrence(rec)}</p>
                    <p className={`text-xs ${daysUntil <= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      tra {daysUntil} giorni
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right min-w-[120px]">
                    <p className={`text-sm font-semibold ${
                      amount > 0 ? 'text-emerald-400' : amount < 0 ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {amount > 0 ? '+' : ''}{formatCurrency(amount, rec.currency)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {formatCurrency(getMonthlyImpact(rec))}/mese
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      title={rec.isActive ? 'Metti in pausa' : 'Riattiva'}
                      onClick={() => toggleActive(rec.id)}
                    >
                      {rec.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      title="Modifica"
                      onClick={() => openEdit(rec)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      title="Elimina"
                      onClick={() => deleteRec(rec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Monthly impact summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Impatto Mensile</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Uscite Ricorrenti</p>
            <p className="mt-1 text-xl font-bold text-red-400">{formatCurrency(-monthlyExpenses)}</p>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Entrate Ricorrenti</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-500">Netto Mensile Ricorrente</p>
            <p className={`mt-1 text-xl font-bold ${
              monthlyIncome - monthlyExpenses >= 0 ? 'text-energy-400' : 'text-red-400'
            }`}>
              {formatCurrency(monthlyIncome - monthlyExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <RecurrenceModal
          recurrence={editingRec}
          containers={containers}
          counterparties={counterparties}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            if (editingRec) {
              setRecurrences((prev) =>
                prev.map((r) => (r.id === editingRec.id ? { ...r, ...data } : r)),
              )
            } else {
              setRecurrences((prev) => [...prev, { ...data, id: `rec-${Date.now()}`, isActive: true }])
            }
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function RecurrenceModal({
  recurrence,
  containers,
  counterparties,
  onClose,
  onSave,
}: {
  recurrence: MockRecurrence | null
  containers: Array<{ id: string; name: string; isActive: boolean }>
  counterparties: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (data: Omit<MockRecurrence, 'id' | 'isActive'>) => void
}) {
  const [form, setForm] = useState({
    description: recurrence?.description || '',
    frequency: recurrence?.frequency || ('monthly' as Frequency),
    dayOfMonth: recurrence?.dayOfMonth ?? 1,
    dayOfWeek: recurrence?.dayOfWeek,
    businessDaysOnly: recurrence?.businessDaysOnly || false,
    amount: recurrence?.amount || '',
    amountIsEstimate: recurrence?.amountIsEstimate || false,
    currency: recurrence?.currency || 'EUR',
    containerId: recurrence?.containerId || '',
    counterpartyId: recurrence?.counterpartyId || '',
    type: recurrence?.type || ('expense' as TransactionType),
    sharedWithSubjectId: recurrence?.sharedWithSubjectId || '',
    sharePercentage: recurrence?.sharePercentage || '',
    startDate: recurrence?.startDate || new Date().toISOString().split('T')[0],
    endDate: recurrence?.endDate || '',
    reminderDaysBefore: recurrence?.reminderDaysBefore,
    tags: recurrence?.tags || [],
  })

  function handleSave() {
    if (!form.description.trim() || !form.amount || !form.containerId) return
    onSave({
      description: form.description,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth,
      dayOfWeek: form.dayOfWeek,
      businessDaysOnly: form.businessDaysOnly,
      amount: form.amount,
      amountIsEstimate: form.amountIsEstimate,
      currency: form.currency,
      containerId: form.containerId,
      counterpartyId: form.counterpartyId || undefined,
      type: form.type,
      sharedWithSubjectId: form.sharedWithSubjectId || undefined,
      sharePercentage: form.sharePercentage || undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      reminderDaysBefore: form.reminderDaysBefore,
      tags: form.tags,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-lg font-semibold text-zinc-100">
            {recurrence ? 'Modifica Ricorrenza' : 'Nuova Ricorrenza'}
          </h2>
          <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {([['expense', 'Uscita', 'text-red-400 border-red-500 bg-red-500/10'], ['income', 'Entrata', 'text-emerald-400 border-emerald-500 bg-emerald-500/10'], ['transfer_out', 'Trasferimento', 'text-blue-400 border-blue-500 bg-blue-500/10']] as const).map(([type, label, activeClass]) => (
              <button
                key={type}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  form.type === type ? activeClass : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
                onClick={() => setForm({ ...form, type })}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Descrizione *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              placeholder="es. Affitto casa, Netflix, F24 IVA..."
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-500 mb-1">Importo *</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
                placeholder="-1800.00"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Valuta</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="RON">RON</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.amountIsEstimate}
              onChange={(e) => setForm({ ...form, amountIsEstimate: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
            />
            Importo stimato (variabile)
          </label>

          {/* Container */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contenitore *</label>
            <select
              value={form.containerId}
              onChange={(e) => setForm({ ...form, containerId: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="">— Seleziona —</option>
              {containers.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Counterparty */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Controparte</label>
            <select
              value={form.counterpartyId}
              onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="">— Nessuna —</option>
              {counterparties.map((cp) => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
            </select>
          </div>

          {/* Frequency + Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Frequenza</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
              >
                {Object.entries(frequencyLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {form.frequency === 'weekly' || form.frequency === 'biweekly' ? 'Giorno della settimana' : 'Giorno del mese'}
              </label>
              {form.frequency === 'weekly' || form.frequency === 'biweekly' ? (
                <select
                  value={form.dayOfWeek ?? 1}
                  onChange={(e) => setForm({ ...form, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
                >
                  {['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'].map((d, i) => (
                    <option key={i} value={i + 1}>{d}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
                />
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.businessDaysOnly}
              onChange={(e) => setForm({ ...form, businessDaysOnly: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
            />
            Solo giorni lavorativi
          </label>

          {/* Start/End date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Data Inizio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Data Fine (opzionale)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Promemoria (giorni prima)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.reminderDaysBefore ?? ''}
              onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              placeholder="es. 7"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
          <button
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={!form.description.trim() || !form.amount || !form.containerId}
          >
            {recurrence ? 'Salva Modifiche' : 'Crea Ricorrenza'}
          </button>
        </div>
      </div>
    </div>
  )
}
