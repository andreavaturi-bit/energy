import { useState, useMemo, useCallback } from 'react'
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
  Clock,
  Wand2,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  useContainers,
  useCounterparties,
  useRecurrences,
  useCreateRecurrence,
  useUpdateRecurrence,
  useDeleteRecurrence,
} from '@/lib/hooks'
import { recurrencesApi, type DetectedPattern } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import type { Frequency, TransactionType, Recurrence } from '@/types'

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

function getNextOccurrence(rec: { dayOfMonth?: number | null; dayOfWeek?: number | null; frequency: string }): string {
  const now = new Date()
  const next = new Date(now)

  if (rec.dayOfMonth) {
    next.setDate(rec.dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
  } else if (rec.dayOfWeek != null) {
    const diff = (rec.dayOfWeek - now.getDay() + 7) % 7
    next.setDate(now.getDate() + (diff === 0 ? 7 : diff))
  }

  return next.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDaysUntilNext(rec: { dayOfMonth?: number | null; dayOfWeek?: number | null }): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(now)

  if (rec.dayOfMonth) {
    next.setDate(rec.dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
  } else if (rec.dayOfWeek != null) {
    const diff = (rec.dayOfWeek - now.getDay() + 7) % 7
    next.setDate(now.getDate() + (diff === 0 ? 7 : diff))
  }

  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getMonthlyImpact(amount: number, frequency: string): number {
  switch (frequency) {
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
  const { data: recurrences = [], isLoading } = useRecurrences()
  const createRecurrence = useCreateRecurrence()
  const updateRecurrence = useUpdateRecurrence()
  const deleteRecurrence = useDeleteRecurrence()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer_out'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingRec, setEditingRec] = useState<Recurrence | null>(null)
  const [showDetectWizard, setShowDetectWizard] = useState(false)

  const filtered = useMemo(() => {
    return recurrences.filter((r) => {
      if (!showInactive && !r.isActive) return false
      if (filterType !== 'all' && r.type !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        return r.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [recurrences, search, filterType, showInactive])

  const activeRecs = recurrences.filter((r) => r.isActive)
  const inactiveCount = recurrences.filter((r) => !r.isActive).length

  const monthlyExpenses = activeRecs
    .filter((r) => r.amount && parseFloat(r.amount) < 0)
    .reduce((sum, r) => sum + Math.abs(getMonthlyImpact(parseFloat(r.amount!), r.frequency)), 0)
  const monthlyIncome = activeRecs
    .filter((r) => r.amount && parseFloat(r.amount) > 0)
    .reduce((sum, r) => sum + getMonthlyImpact(parseFloat(r.amount!), r.frequency), 0)

  const nextRec = activeRecs
    .filter(r => r.dayOfMonth || r.dayOfWeek != null)
    .sort((a, b) => getDaysUntilNext(a) - getDaysUntilNext(b))[0]

  function toggleActive(rec: Recurrence) {
    updateRecurrence.mutate({ id: rec.id, data: { isActive: !rec.isActive } })
  }

  function handleDelete(id: string) {
    deleteRecurrence.mutate(id)
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
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
            onClick={() => setShowDetectWizard(true)}
          >
            <Wand2 className="h-4 w-4" />
            Rileva Automaticamente
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            onClick={() => { setEditingRec(null); setShowModal(true) }}
          >
            <Plus className="h-4 w-4" />
            Nuova Ricorrenza
          </button>
        </div>
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
          {nextRec ? (
            <>
              <p className="mt-1 text-lg font-bold text-amber-400">{getNextOccurrence(nextRec)}</p>
              <p className="text-xs text-zinc-500">{nextRec.description} — tra {getDaysUntilNext(nextRec)} giorni</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-bold text-zinc-600">—</p>
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
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Caricamento...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
              <Repeat className="h-8 w-8" />
              <p className="text-sm">Nessuna ricorrenza trovata</p>
              {recurrences.length === 0 && (
                <p className="text-xs text-zinc-600">
                  Prova il pulsante "Rileva Automaticamente" per trovare pattern nelle transazioni
                </p>
              )}
            </div>
          ) : (
            filtered.map((rec) => {
              const container = containers.find((c) => c.id === rec.containerId)
              const counterparty = rec.counterpartyId ? counterparties.find((cp) => cp.id === rec.counterpartyId) : null
              const amount = rec.amount ? parseFloat(rec.amount) : 0
              const containerName = (rec as unknown as Record<string, unknown>).containerName as string || container?.name || 'N/A'
              const counterpartyName = (rec as unknown as Record<string, unknown>).counterpartyName as string || counterparty?.name || null
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
{!rec.isActive && (
                        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          In pausa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">{containerName}</span>
                      {counterpartyName && (
                        <>
                          <span className="text-xs text-zinc-600">|</span>
                          <span className="text-xs text-zinc-500">{counterpartyName}</span>
                        </>
                      )}
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">
                        {frequencyLabels[rec.frequency as Frequency] || rec.frequency}
                        {rec.businessDaysOnly ? ' (gg. lav.)' : ''}
                      </span>
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
                      {formatCurrency(getMonthlyImpact(amount, rec.frequency))}/mese
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      title={rec.isActive ? 'Metti in pausa' : 'Riattiva'}
                      onClick={() => toggleActive(rec)}
                    >
                      {rec.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      title="Modifica"
                      onClick={() => { setEditingRec(rec); setShowModal(true) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      title="Elimina"
                      onClick={() => handleDelete(rec.id)}
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
              updateRecurrence.mutate({ id: editingRec.id, data })
            } else {
              createRecurrence.mutate(data)
            }
            setShowModal(false)
          }}
        />
      )}

      {/* Auto-detect wizard */}
      {showDetectWizard && (
        <DetectRecurrencesWizard
          onClose={() => setShowDetectWizard(false)}
        />
      )}
    </div>
  )
}

// ============================================================
// DETECT RECURRENCES WIZARD
// ============================================================

function DetectRecurrencesWizard({ onClose }: { onClose: () => void }) {
  const { data: containers = [] } = useContainers()
  const [isDetecting, setIsDetecting] = useState(false)
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(new Set())
  const [hasDetected, setHasDetected] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ created: number } | null>(null)
  const [containerId, setContainerId] = useState('')
  const [minConfidence, setMinConfidence] = useState(50)

  const detect = useCallback(async () => {
    setIsDetecting(true)
    try {
      const params: Record<string, unknown> = { minOccurrences: 3 }
      if (containerId) params.containerId = containerId
      const result = await recurrencesApi.detect(params as never)
      setPatterns(result.patterns)
      // Auto-select patterns above threshold
      setSelectedPatterns(new Set(
        result.patterns
          .filter(p => p.confidence >= minConfidence)
          .map((_, i) => i)
      ))
      setHasDetected(true)
    } catch (err) {
      console.error('Detection failed:', err)
    } finally {
      setIsDetecting(false)
    }
  }, [containerId, minConfidence])

  const createSelected = useCallback(async () => {
    if (selectedPatterns.size === 0) return
    setIsCreating(true)
    try {
      const selected = [...selectedPatterns].map(i => patterns[i])
      const recurrences = selected.map(p => ({
        description: p.description,
        frequency: p.frequency,
        dayOfMonth: p.dayOfMonth,
        dayOfWeek: p.dayOfWeek,
        amount: p.medianAmount.toFixed(4),
        amountIsEstimate: p.amountIsEstimate,
        currency: 'EUR',
        containerId: p.containerId,
        counterpartyId: p.counterpartyId,
        type: p.type,
        startDate: new Date().toISOString().slice(0, 10),
        transactionIds: p.transactionIds,
      }))
      const result = await recurrencesApi.createBatch(recurrences)
      setCreateResult({ created: result.created })
    } catch (err) {
      console.error('Creation failed:', err)
    } finally {
      setIsCreating(false)
    }
  }, [selectedPatterns, patterns])

  const filteredPatterns = patterns.filter(p => p.confidence >= minConfidence)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Rileva Ricorrenze Automaticamente</h2>
          </div>
          <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success state */}
          {createResult && (
            <div className="text-center py-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-energy-500/15">
                <Check className="h-8 w-8 text-energy-400" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-zinc-100">
                {createResult.created} ricorrenze create
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Le transazioni storiche sono state collegate alle nuove ricorrenze.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-lg bg-energy-500 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* Detection phase */}
          {!createResult && (
            <>
              {/* Filters */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Contenitore (opzionale)</label>
                  <select
                    value={containerId}
                    onChange={(e) => setContainerId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
                  >
                    <option value="">Tutti i contenitori</option>
                    {containers.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <label className="block text-xs text-zinc-500 mb-1">Confidenza minima</label>
                  <select
                    value={minConfidence}
                    onChange={(e) => {
                      setMinConfidence(parseInt(e.target.value))
                      if (hasDetected) {
                        setSelectedPatterns(new Set(
                          patterns
                            .filter(p => p.confidence >= parseInt(e.target.value))
                            .map((_, i) => i)
                        ))
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
                  >
                    <option value={40}>40%</option>
                    <option value={50}>50%</option>
                    <option value={60}>60%</option>
                    <option value={70}>70%</option>
                    <option value={80}>80%</option>
                  </select>
                </div>
                <button
                  onClick={detect}
                  disabled={isDetecting}
                  className="flex items-center gap-2 rounded-lg bg-purple-500 px-5 py-2 text-sm font-medium text-white hover:bg-purple-400 transition-colors disabled:opacity-50"
                >
                  {isDetecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analisi...</>
                  ) : (
                    <><Wand2 className="h-4 w-4" /> {hasDetected ? 'Rileva di nuovo' : 'Analizza transazioni'}</>
                  )}
                </button>
              </div>

              {/* Results */}
              {hasDetected && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">
                      <span className="font-semibold text-zinc-200">{filteredPatterns.length}</span> pattern rilevati
                      {filteredPatterns.length !== patterns.length && (
                        <span className="text-zinc-500"> ({patterns.length} totali, filtro confidenza ≥{minConfidence}%)</span>
                      )}
                    </p>
                    {filteredPatterns.length > 0 && (
                      <button
                        onClick={() => {
                          if (selectedPatterns.size === filteredPatterns.length) {
                            setSelectedPatterns(new Set())
                          } else {
                            setSelectedPatterns(new Set(filteredPatterns.map((_, i) => patterns.indexOf(filteredPatterns[i]))))
                          }
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        {selectedPatterns.size === filteredPatterns.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                      </button>
                    )}
                  </div>

                  {filteredPatterns.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <Repeat className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Nessun pattern rilevato con confidenza ≥{minConfidence}%</p>
                      <p className="text-xs mt-1">Prova ad abbassare la soglia di confidenza o importare piu' transazioni</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                      {filteredPatterns.map((pattern) => {
                        const idx = patterns.indexOf(pattern)
                        const isSelected = selectedPatterns.has(idx)
                        const amount = pattern.medianAmount
                        return (
                          <label
                            key={idx}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                              isSelected
                                ? 'border-purple-500/50 bg-purple-500/5'
                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedPatterns)
                                if (next.has(idx)) next.delete(idx)
                                else next.add(idx)
                                setSelectedPatterns(next)
                              }}
                              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-zinc-200 truncate">{pattern.description}</p>
                                <Badge
                                  variant={pattern.confidence >= 80 ? 'success' : pattern.confidence >= 60 ? 'warning' : 'default'}
                                  size="sm"
                                >
                                  {pattern.confidence}%
                                </Badge>
                                {pattern.amountIsEstimate && (
                                  <span className="text-[10px] text-amber-400">~stima</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-zinc-500">
                                  {frequencyLabels[pattern.frequency as Frequency] || pattern.frequency}
                                  {pattern.dayOfMonth && ` · g.${pattern.dayOfMonth}`}
                                  {pattern.dayOfWeek != null && ` · ${['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][pattern.dayOfWeek]}`}
                                </span>
                                <span className="text-xs text-zinc-600">|</span>
                                <span className="text-xs text-zinc-500">{pattern.containerName || 'N/A'}</span>
                                {pattern.counterpartyName && (
                                  <>
                                    <span className="text-xs text-zinc-600">|</span>
                                    <span className="text-xs text-zinc-500">{pattern.counterpartyName}</span>
                                  </>
                                )}
                                <span className="text-xs text-zinc-600">|</span>
                                <span className="text-xs text-zinc-500">{pattern.occurrences} occorrenze</span>
                                {pattern.amountVariance > 0 && (
                                  <>
                                    <span className="text-xs text-zinc-600">|</span>
                                    <span className="text-xs text-zinc-500">CV {pattern.amountVariance}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-sm font-semibold ${
                                amount > 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {formatCurrency(getMonthlyImpact(amount, pattern.frequency))}/mese
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {hasDetected && !createResult && filteredPatterns.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
            <p className="text-sm text-zinc-400">
              {selectedPatterns.size} selezionate
            </p>
            <div className="flex gap-3">
              <button
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                onClick={onClose}
              >
                Annulla
              </button>
              <button
                disabled={selectedPatterns.size === 0 || isCreating}
                onClick={createSelected}
                className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creazione...</>
                ) : (
                  <>Crea {selectedPatterns.size} ricorrenze</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// RECURRENCE MODAL
// ============================================================

function RecurrenceModal({
  recurrence,
  containers,
  counterparties,
  onClose,
  onSave,
}: {
  recurrence: Recurrence | null
  containers: Array<{ id: string; name: string; isActive: boolean }>
  counterparties: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (data: Partial<Recurrence>) => void
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
    type: (recurrence?.type || 'expense') as TransactionType,
    startDate: recurrence?.startDate || new Date().toISOString().split('T')[0],
    endDate: recurrence?.endDate || '',
    reminderDaysBefore: recurrence?.reminderDaysBefore,
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
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      reminderDaysBefore: form.reminderDaysBefore,
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
