import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Landmark,
  CreditCard,
  TrendingUp,
  Bitcoin,
  Smartphone,
  Banknote,
  PiggyBank,
  Ticket,
  Wallet,
  Globe,
  CircleDot,
  X,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react'
import type { ContainerType, Container } from '@/types'
import {
  useContainers,
  useSubjects,
  useCreateContainer,
  useUpdateContainer,
  useDeleteContainer,
  useToggleContainerPin,
} from '@/lib/hooks'
import { containerTypeLabel, formatCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const typeIcons: Record<ContainerType, typeof Landmark> = {
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

// Stable ordering for container types so groups appear in a predictable order
const TYPE_ORDER: ContainerType[] = [
  'bank_account',
  'credit_card',
  'trading',
  'crypto',
  'payment_service',
  'cash',
  'savings',
  'voucher',
  'other',
]

const COLORS = [
  '#0066CC', '#0075EB', '#22C55E', '#003087', '#EF4444', '#C5A44E',
  '#F59E0B', '#EC4899', '#D62B1F', '#1A1A2E', '#FF6600', '#006837',
  '#D4A017', '#DC143C', '#5B21B6', '#00A3E0', '#4A90D9', '#F3BA2F',
  '#103F68', '#0052FF', '#694ED6', '#57E099', '#3375BB', '#4C6EF5',
  '#00BFA5', '#E2761B', '#F7A600', '#7B61FF', '#635BFF', '#9FE870',
  '#FFD700', '#8B5CF6', '#71717a',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Grouping = 'type' | 'subject'

// ---------------------------------------------------------------------------
// Container Modal
// ---------------------------------------------------------------------------

function ContainerModal({
  subjects,
  onClose,
  onSave,
  isSaving,
  existing,
  saveError,
}: {
  subjects: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: Partial<Container>) => void
  isSaving: boolean
  existing?: Container | null
  saveError?: string | null
}) {
  const isEdit = !!existing

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    type: (existing?.type ?? 'bank_account') as ContainerType,
    subjectId: existing?.subjectId ?? (subjects[0]?.id ?? ''),
    provider: existing?.provider ?? '',
    currency: existing?.currency ?? 'EUR',
    initialBalance: existing?.initialBalance ?? '0',
    isMultiCurrency: existing?.isMultiCurrency ?? false,
    color: existing?.color ?? '#0066CC',
    isActive: existing?.isActive ?? true,
    notes: existing?.notes ?? '',
    billingDay: existing?.billingDay != null ? String(existing.billingDay) : '',
  })

  function handleSave() {
    if (!form.name.trim() || !form.subjectId) return

    onSave({
      subjectId: form.subjectId,
      name: form.name.trim(),
      type: form.type,
      provider: form.provider || null,
      currency: form.currency,
      isMultiCurrency: form.isMultiCurrency,
      initialBalance: form.initialBalance || '0',
      billingDay: form.billingDay ? parseInt(form.billingDay) : null,
      linkedContainerId: existing?.linkedContainerId ?? null,
      goalAmount: existing?.goalAmount ?? null,
      goalDescription: existing?.goalDescription ?? null,
      icon: existing?.icon ?? null,
      color: form.color,
      sortOrder: existing?.sortOrder ?? 999,
      isActive: form.isActive,
      notes: form.notes || null,
    })
  }

  const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{isEdit ? 'Modifica Contenitore' : 'Nuovo Contenitore'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nome *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome del contenitore..." className={inputCls} />
          </div>

          {/* Row: Type + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContainerType })} className={inputCls}>
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>{containerTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Soggetto *</label>
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={inputCls}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Provider */}
          <div>
            <label className={labelCls}>Provider / Istituto</label>
            <input type="text" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Es. Intesa Sanpaolo, Revolut..." className={inputCls} />
          </div>

          {/* Row: Currency + Balance + Billing Day */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Valuta</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="RON">RON</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Saldo Iniziale</label>
              <input type="number" step="0.01" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} className={inputCls} />
            </div>
            {form.type === 'credit_card' && (
              <div>
                <label className={labelCls}>Giorno Addebito</label>
                <input type="number" min="1" max="31" value={form.billingDay} onChange={(e) => setForm({ ...form, billingDay: e.target.value })} placeholder="10" className={inputCls} />
              </div>
            )}
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-6">
            {/* Multi-currency toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-400">
              <button
                type="button"
                role="switch"
                aria-checked={form.isMultiCurrency}
                onClick={() => setForm({ ...form, isMultiCurrency: !form.isMultiCurrency })}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  form.isMultiCurrency ? 'bg-energy-500' : 'bg-zinc-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  form.isMultiCurrency ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`} />
              </button>
              Multi-valuta
            </label>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-400">
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  form.isActive ? 'bg-energy-500' : 'bg-zinc-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  form.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`} />
              </button>
              Attivo
            </label>
          </div>

          {/* Color picker */}
          <div>
            <label className={labelCls}>Colore</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Note</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Note opzionali..." className={inputCls} />
          </div>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 space-y-3">
          {saveError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{saveError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600">
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.subjectId || isSaving}
              className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </span>
              ) : (
                isEdit ? 'Salva Modifiche' : 'Salva Contenitore'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Containers() {
  const { data: containers = [], isLoading: containersLoading, error: containersError } = useContainers()
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects()
  const createContainer = useCreateContainer()
  const updateContainer = useUpdateContainer()
  const deleteContainer = useDeleteContainer()
  const togglePin = useToggleContainerPin()

  const [showCreate, setShowCreate] = useState(false)
  const [editingContainer, setEditingContainer] = useState<Container | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [grouping, setGrouping] = useState<Grouping>('type')

  const isLoading = containersLoading || subjectsLoading

  // Helper: get subject name from subjects list
  function subjectName(subjectId: string): string {
    return subjects.find((s) => s.id === subjectId)?.name ?? subjectId
  }

  // ------ filtered list ------
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return containers.filter((c) => {
      // active filter
      if (!showInactive && !c.isActive) return false
      // subject filter
      if (subjectFilter !== 'all' && c.subjectId !== subjectFilter) return false
      // text search on name + provider
      if (q) {
        const haystack = `${c.name} ${c.provider ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [containers, search, subjectFilter, showInactive])

  // ------ grouped data ------
  const groups = useMemo(() => {
    if (grouping === 'type') {
      const map = new Map<ContainerType, (Container & { subjectName?: string })[]>()
      for (const c of filtered) {
        const list = map.get(c.type) ?? []
        list.push(c)
        map.set(c.type, list)
      }
      // order groups by TYPE_ORDER
      return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({
        key: t,
        label: containerTypeLabel(t),
        Icon: typeIcons[t] ?? Wallet,
        containers: map.get(t)!,
      }))
    }

    // grouping === 'subject'
    const map = new Map<string, (Container & { subjectName?: string })[]>()
    for (const c of filtered) {
      const name = (c as Container & { subjectName?: string }).subjectName ?? subjectName(c.subjectId)
      const list = map.get(name) ?? []
      list.push(c)
      map.set(name, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, ctrs]) => ({
        key: name,
        label: name,
        Icon: null as (typeof Landmark) | null,
        containers: ctrs,
      }))
  }, [filtered, grouping, subjects])

  // ------ summary totals ------
  const totalCount = filtered.length

  const totalBalanceEUR = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'EUR')
        .reduce((sum, c) => sum + parseFloat(c.currentBalance ?? c.initialBalance ?? '0'), 0),
    [filtered],
  )

  const totalBalanceUSD = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'USD')
        .reduce((sum, c) => sum + parseFloat(c.currentBalance ?? c.initialBalance ?? '0'), 0),
    [filtered],
  )

  const totalBalanceRON = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'RON')
        .reduce((sum, c) => sum + parseFloat(c.currentBalance ?? c.initialBalance ?? '0'), 0),
    [filtered],
  )

  // header total -- combine EUR prominently
  const headerBalance = formatCurrency(totalBalanceEUR, 'EUR')

  // ------ handlers ------

  function handleTogglePin(container: Container) {
    togglePin.mutate({
      id: container.id,
      isPinned: !container.isPinned,
    })
  }

  function handleUpdateContainer(data: Partial<Container>) {
    if (!editingContainer) return
    updateContainer.mutate(
      { id: editingContainer.id, data },
      { onSuccess: () => setEditingContainer(null) },
    )
  }

  function handleDelete(container: Container) {
    if (!confirm(`Eliminare il contenitore "${container.name}"?`)) return
    setDeleteError(null)
    deleteContainer.mutate(container.id, {
      onError: (err) => {
        const msg = err instanceof Error ? err.message : 'Errore durante l\'eliminazione'
        if (msg.includes('transaction') || msg.includes('foreign') || msg.includes('violat')) {
          setDeleteError(`Impossibile eliminare "${container.name}": ci sono transazioni collegate. Elimina prima le transazioni associate o disattiva il contenitore.`)
        } else {
          setDeleteError(`Errore nell'eliminazione di "${container.name}": ${msg}`)
        }
      },
    })
  }

  const updateErrorMsg = updateContainer.error instanceof Error ? updateContainer.error.message : updateContainer.error ? 'Errore nel salvataggio' : null

  // ------ loading state ------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
      </div>
    )
  }

  // ------ error state ------
  if (containersError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-400">
        <AlertCircle className="h-8 w-8 mb-3" />
        <p className="text-sm">Errore nel caricamento dei contenitori.</p>
        <p className="text-xs text-zinc-500 mt-1">{(containersError as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contenitori</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {totalCount} contenitori &middot; Saldo totale{' '}
            <span className="font-semibold text-zinc-200">{headerBalance}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors self-start"
        >
          <Plus className="h-4 w-4" />
          Nuovo Contenitore
        </button>
      </div>

      {/* ============ FILTER BAR ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca per nome, provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Subject filter */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="all">Tutti i soggetti</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Show inactive toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-400">
          <button
            type="button"
            role="switch"
            aria-checked={showInactive}
            onClick={() => setShowInactive((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              showInactive ? 'bg-energy-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                showInactive ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
          Mostra inattivi
        </label>

        {/* Grouping toggle */}
        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-sm">
          <button
            onClick={() => setGrouping('type')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              grouping === 'type'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Per tipo
          </button>
          <button
            onClick={() => setGrouping('subject')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              grouping === 'subject'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Per soggetto
          </button>
        </div>
      </div>

      {/* ============ CONTAINER GROUPS ============ */}
      <div className="space-y-8">
        {groups.map((group) => {
          const GroupIcon = group.Icon
          return (
            <div key={group.key}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                {GroupIcon && <GroupIcon className="h-5 w-5 text-zinc-400" />}
                <h2 className="text-lg font-semibold text-zinc-200">
                  {group.label}
                </h2>
                <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  {group.containers.length}
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.containers.map((container) => {
                  const balance = parseFloat(container.currentBalance ?? container.initialBalance ?? '0')
                  const containerSubjectName = (container as Container & { subjectName?: string }).subjectName ?? subjectName(container.subjectId)
                  return (
                    <div
                      key={container.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors cursor-pointer"
                    >
                      {/* Top row: color dot + name + status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: container.color ?? '#71717a' }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 truncate">
                              {container.name}
                            </p>
                            {container.provider && (
                              <p className="text-xs text-zinc-500 truncate">
                                {container.provider}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Active / inactive badge + actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {container.isActive ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                              Attivo
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-500">
                              Inattivo
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(container) }}
                            className={`rounded-md p-1 transition-colors ${
                              container.isPinned
                                ? 'text-amber-400 hover:bg-zinc-800 hover:text-amber-300'
                                : 'text-zinc-500 hover:bg-zinc-800 hover:text-amber-400'
                            }`}
                            title={container.isPinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                          >
                            <Star className={`h-3.5 w-3.5 ${container.isPinned ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingContainer(container) }}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-energy-400 transition-colors"
                            title="Modifica"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(container) }}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <p className="mt-3 text-xs text-zinc-500">
                        Soggetto:{' '}
                        <span className="text-zinc-400">
                          {containerSubjectName}
                        </span>
                      </p>

                      {/* Balance */}
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500">Saldo</p>
                        <p
                          className={`text-xl font-bold ${
                            balance < 0 ? 'text-red-400' : 'text-zinc-100'
                          }`}
                        >
                          {formatCurrency(balance, container.currency)}
                        </p>
                      </div>

                      {/* Footer: currency badge + multi-currency indicator */}
                      <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-3">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                          {container.currency}
                        </span>
                        {container.isMultiCurrency && (
                          <span className="flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                            <Globe className="h-3 w-3" />
                            Multi-valuta
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-zinc-500">
            <CircleDot className="mb-3 h-8 w-8" />
            <p className="text-sm">Nessun contenitore trovato.</p>
          </div>
        )}
      </div>

      {/* ============ SUMMARY FOOTER ============ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-200">{totalCount}</span>{' '}
            contenitori totali
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="text-zinc-400">
              EUR:{' '}
              <span className="font-semibold text-zinc-200">
                {formatCurrency(totalBalanceEUR, 'EUR')}
              </span>
            </div>
            {totalBalanceUSD !== 0 && (
              <div className="text-zinc-400">
                USD:{' '}
                <span className="font-semibold text-zinc-200">
                  {formatCurrency(totalBalanceUSD, 'USD')}
                </span>
              </div>
            )}
            {totalBalanceRON !== 0 && (
              <div className="text-zinc-400">
                RON:{' '}
                <span className="font-semibold text-zinc-200">
                  {formatCurrency(totalBalanceRON, 'RON')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ DELETE ERROR ============ */}
      {deleteError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-zinc-900 px-4 py-3 shadow-2xl">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{deleteError}</p>
            </div>
            <button onClick={() => setDeleteError(null)} className="rounded p-1 text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============ CREATE MODAL ============ */}
      {showCreate && (
        <ContainerModal
          subjects={subjects}
          onClose={() => { setShowCreate(false); createContainer.reset() }}
          isSaving={createContainer.isPending}
          saveError={createContainer.error instanceof Error ? createContainer.error.message : createContainer.error ? 'Errore nel salvataggio' : null}
          onSave={(data) => {
            createContainer.mutate(data, {
              onSuccess: () => { setShowCreate(false) },
            })
          }}
        />
      )}

      {/* ============ EDIT MODAL ============ */}
      {editingContainer && (
        <ContainerModal
          subjects={subjects}
          existing={editingContainer}
          onClose={() => { setEditingContainer(null); updateContainer.reset() }}
          isSaving={updateContainer.isPending}
          saveError={updateErrorMsg}
          onSave={handleUpdateContainer}
        />
      )}
    </div>
  )
}
