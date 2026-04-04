import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { SearchableSelect, SearchableMultiSelect } from '@/components/ui/SearchableSelect'
import type { Transaction, TransactionType, TransactionStatus, Container, Counterparty, Subject, Tag } from '@/types'
import {
  useTransactions,
  useContainers,
  useCounterparties,
  useSubjects,
  useTags,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateCounterparty,
  useCreateSubject,
  useCreateTag,
} from '@/lib/hooks'
import { transactionsApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import {
  formatCurrency,
  formatDate,
  transactionTypeLabel,
  transactionTypeColor,
  isInflow,
} from '@/lib/utils'

// ── Status badge styling ────────────────────────────────────

const statusStyles: Record<TransactionStatus, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  projected: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-zinc-500/10 text-zinc-400',
  split: 'bg-purple-500/10 text-purple-400',
}

const statusLabels: Record<TransactionStatus, string> = {
  completed: 'Completata',
  pending: 'In sospeso',
  projected: 'Proiettata',
  cancelled: 'Annullata',
  split: 'Suddivisa',
}

// ── Type badge background mapping ───────────────────────────

function typeBadgeBg(type: TransactionType): string {
  if (isInflow(type)) return 'bg-emerald-500/10'
  if (type === 'transfer_out' || type === 'transfer_in') return 'bg-blue-500/10'
  return 'bg-red-500/10'
}

// ── Truncate helper ─────────────────────────────────────────

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '...' : str
}

// ── Available filter options ────────────────────────────────

/** Options for the create/edit form (merged transfer) */
const typeOptions: { value: string; label: string }[] = [
  { value: 'income', label: 'Entrata' },
  { value: 'expense', label: 'Uscita' },
  { value: 'transfer', label: 'Trasferimento' },
  { value: 'capital_injection', label: 'Versamento c/capitale' },
  { value: 'loan_out', label: 'Prestito dato' },
  { value: 'loan_in', label: 'Prestito ricevuto' },
  { value: 'repayment_out', label: 'Rimborso dato' },
  { value: 'repayment_in', label: 'Rimborso ricevuto' },
]

/** Options for the filter bar (actual DB types) */
const filterTypeOptions: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Entrata' },
  { value: 'expense', label: 'Uscita' },
  { value: 'transfer_out', label: 'Trasferimento (uscita)' },
  { value: 'transfer_in', label: 'Trasferimento (entrata)' },
  { value: 'capital_injection', label: 'Versamento c/capitale' },
  { value: 'loan_out', label: 'Prestito dato' },
  { value: 'loan_in', label: 'Prestito ricevuto' },
  { value: 'repayment_out', label: 'Rimborso dato' },
  { value: 'repayment_in', label: 'Rimborso ricevuto' },
]

const statusOptions: { value: TransactionStatus; label: string }[] = [
  { value: 'completed', label: 'Completata' },
  { value: 'pending', label: 'In sospeso' },
  { value: 'projected', label: 'Proiettata' },
  { value: 'cancelled', label: 'Annullata' },
]

// ── Transaction Modal ───────────────────────────────────────

function TransactionModal({
  onClose,
  onSave,
  existing,
  linkedTransaction,
  containers,
  counterparties,
  subjects,
  tags,
  isSaving,
  saveError,
  onCreateCounterparty,
  onCreateSubject,
  onCreateTag,
}: {
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  existing?: Transaction | null
  linkedTransaction?: Transaction | null
  containers: Container[]
  counterparties: Counterparty[]
  subjects: Subject[]
  tags: Tag[]
  isSaving?: boolean
  saveError?: string | null
  onCreateCounterparty?: (name: string) => void
  onCreateSubject?: (name: string) => void
  onCreateTag?: (name: string) => void
}) {
  const isEdit = !!existing
  const isExistingTransfer = existing && (existing.type === 'transfer_out' || existing.type === 'transfer_in')

  // For transfers, figure out initial from/to containers
  let initialFromContainerId = ''
  let initialToContainerId = ''
  if (isExistingTransfer) {
    if (existing.type === 'transfer_out') {
      initialFromContainerId = existing.containerId
      initialToContainerId = linkedTransaction?.containerId ?? ''
    } else {
      initialFromContainerId = linkedTransaction?.containerId ?? ''
      initialToContainerId = existing.containerId
    }
  }

  const [form, setForm] = useState({
    date: existing?.date ?? new Date().toISOString().slice(0, 10),
    description: existing?.description ?? '',
    amount: existing ? String(Math.abs(parseFloat(existing.amount))) : '',
    currency: existing?.currency ?? 'EUR',
    containerId: existing?.containerId ?? (containers[0]?.id ?? ''),
    fromContainerId: initialFromContainerId || (containers[0]?.id ?? ''),
    toContainerId: initialToContainerId,
    counterpartyId: existing?.counterpartyId ?? '',
    type: isExistingTransfer ? 'transfer' : (existing?.type ?? 'expense'),
    status: (existing?.status ?? 'completed') as TransactionStatus,
    notes: existing?.notes ?? '',
    beneficiarySubjectId: existing?.beneficiarySubjectId ?? '',
    tagIds: (existing?.tags || []).map(t => t.id),
  })

  const isTransfer = form.type === 'transfer'

  function handleSave() {
    if (!form.amount) return

    if (isTransfer) {
      if (!form.fromContainerId || !form.toContainerId) return
      if (form.fromContainerId === form.toContainerId) return

      const rawAmt = parseFloat(form.amount)
      onSave({
        _isTransfer: true,
        date: form.date,
        description: form.description || null,
        amount: Math.abs(rawAmt).toFixed(2),
        currency: form.currency,
        fromContainerId: form.fromContainerId,
        toContainerId: form.toContainerId,
        status: form.status,
        source: existing?.source ?? 'manual',
        notes: form.notes || null,
      })
    } else {
      if (!form.containerId) return

      const isOut = ['expense', 'capital_injection', 'loan_out', 'repayment_out'].includes(form.type)
      const rawAmt = parseFloat(form.amount)
      const finalAmt = isOut && rawAmt > 0 ? -rawAmt : rawAmt

      onSave({
        date: form.date,
        description: form.description || null,
        amount: finalAmt.toFixed(2),
        currency: form.currency,
        containerId: form.containerId,
        counterpartyId: form.counterpartyId || null,
        type: form.type,
        status: form.status,
        source: existing?.source ?? 'manual',
        notes: form.notes || null,
        beneficiarySubjectId: form.beneficiarySubjectId || null,
        tagIds: form.tagIds,
      })
    }
  }

  const canSave = isTransfer
    ? !!(form.amount && form.fromContainerId && form.toContainerId && form.fromContainerId !== form.toContainerId)
    : !!(form.amount && form.containerId)

  const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{isEdit ? 'Modifica Transazione' : 'Nuova Transazione'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Row: Date + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelCls}>Tipo *</label>
              <SearchableSelect
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v })}
                options={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Tipo..."
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descrizione</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrizione della transazione..." className={inputCls} />
          </div>

          {/* Row: Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Importo *</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valuta</label>
              <SearchableSelect
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v })}
                options={[
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'RON', label: 'RON' },
                ]}
                placeholder="Valuta"
              />
            </div>
          </div>

          {/* Container(s) — different layout for transfers */}
          {isTransfer ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Conto di uscita *</label>
                <SearchableSelect
                  value={form.fromContainerId}
                  onChange={(v) => setForm({ ...form, fromContainerId: v })}
                  options={containers.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                  placeholder="Seleziona..."
                  allowEmpty
                  emptyLabel="— Seleziona —"
                />
              </div>
              <div>
                <label className={labelCls}>Conto di entrata *</label>
                <SearchableSelect
                  value={form.toContainerId}
                  onChange={(v) => setForm({ ...form, toContainerId: v })}
                  options={containers.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                  placeholder="Seleziona..."
                  allowEmpty
                  emptyLabel="— Seleziona —"
                />
              </div>
              {form.fromContainerId && form.toContainerId && form.fromContainerId === form.toContainerId && (
                <p className="col-span-2 text-xs text-amber-400">I due conti devono essere diversi</p>
              )}
            </div>
          ) : (
            <>
              {/* Container */}
              <div>
                <label className={labelCls}>Contenitore *</label>
                <SearchableSelect
                  value={form.containerId}
                  onChange={(v) => setForm({ ...form, containerId: v })}
                  options={containers.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                  placeholder="Contenitore..."
                />
              </div>

              {/* Counterparty */}
              <div>
                <label className={labelCls}>Controparte</label>
                <SearchableSelect
                  value={form.counterpartyId}
                  onChange={(v) => setForm({ ...form, counterpartyId: v })}
                  options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Controparte..."
                  allowEmpty
                  emptyLabel="— Nessuna —"
                  onCreateNew={onCreateCounterparty}
                  createLabel="Crea controparte"
                />
              </div>
            </>
          )}

          {/* Status */}
          <div>
            <label className={labelCls}>Stato</label>
            <SearchableSelect
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as TransactionStatus })}
              options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Stato..."
            />
          </div>

          {/* Cost sharing — only for non-transfers */}
          {!isTransfer && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Condiviso con</label>
                <SearchableSelect
                  value={form.beneficiarySubjectId}
                  onChange={(v) => setForm({ ...form, beneficiarySubjectId: v })}
                  options={subjects.filter((s) => s.role === 'partner').map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Soggetto..."
                  allowEmpty
                  emptyLabel="— Nessuno —"
                  onCreateNew={onCreateSubject}
                  createLabel="Crea soggetto"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className={labelCls}>Tag</label>
            <SearchableMultiSelect
              value={form.tagIds}
              onChange={(ids) => setForm({ ...form, tagIds: ids })}
              options={tags.filter(t => t.isActive).map(t => ({ value: t.id, label: t.name, color: t.color }))}
              placeholder="Seleziona tag..."
              onCreateNew={onCreateTag}
              createLabel="Crea tag"
            />
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
              disabled={!canSave || isSaving}
              className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Salva Modifiche' : (isTransfer ? 'Salva Trasferimento' : 'Salva Transazione')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Filter state — initialized from URL search params if present
  const [searchText, setSearchText] = useState(searchParams.get('search') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [containerId, setContainerId] = useState(searchParams.get('containerId') || '')
  const [counterpartyId, setCounterpartyId] = useState(searchParams.get('counterpartyId') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [tagFilter, setTagFilter] = useState(searchParams.get('tagId') || '')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Debounce ALL filter values (300ms) so that date pickers, search input,
  // and dropdowns never trigger an API call while the user is still interacting.
  const [debouncedFilters, setDebouncedFilters] = useState({
    searchText, dateFrom, dateTo, containerId, counterpartyId, typeFilter, statusFilter, tagFilter,
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters({ searchText, dateFrom, dateTo, containerId, counterpartyId, typeFilter, statusFilter, tagFilter })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchText, dateFrom, dateTo, containerId, counterpartyId, typeFilter, statusFilter, tagFilter])

  // Clear URL search params after initial load so they don't persist on navigation
  useEffect(() => {
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Build API query params from debounced filter state ─────
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      limit: '500',
      offset: '0',
    }
    if (debouncedFilters.searchText) params.search = debouncedFilters.searchText
    if (debouncedFilters.dateFrom) params.dateFrom = debouncedFilters.dateFrom
    if (debouncedFilters.dateTo) params.dateTo = debouncedFilters.dateTo
    if (debouncedFilters.containerId) params.containerId = debouncedFilters.containerId
    if (debouncedFilters.counterpartyId) params.counterpartyId = debouncedFilters.counterpartyId
    if (debouncedFilters.typeFilter) params.type = debouncedFilters.typeFilter
    if (debouncedFilters.statusFilter) params.status = debouncedFilters.statusFilter
    if (debouncedFilters.tagFilter) params.tagId = debouncedFilters.tagFilter
    return params
  }, [debouncedFilters])

  // ── Data hooks ─────────────────────────────────────────────
  const { data: txData, isLoading: txLoading, error: txError } = useTransactions(queryParams)
  const { data: containers = [], isLoading: containersLoading } = useContainers()
  const { data: counterparties = [], isLoading: counterpartiesLoading } = useCounterparties()
  const { data: subjects = [] } = useSubjects()
  const { data: tags = [] } = useTags()

  // ── Mutation hooks ─────────────────────────────────────────
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()
  const createCounterpartyMutation = useCreateCounterparty()
  const createSubjectMutation = useCreateSubject()
  const createTagMutation = useCreateTag()
  const queryClient = useQueryClient()

  // Inline-create callbacks for dropdowns
  const handleCreateCounterparty = useCallback((name: string) => {
    createCounterpartyMutation.mutate({ name, isActive: true })
  }, [createCounterpartyMutation])

  const handleCreateSubject = useCallback((name: string) => {
    createSubjectMutation.mutate({ name, role: 'partner' as const, isActive: true })
  }, [createSubjectMutation])

  const handleCreateTag = useCallback((name: string) => {
    createTagMutation.mutate({ name, type: 'custom' as const, isActive: true })
  }, [createTagMutation])

  // Transfer-specific operation state (not using react-query mutations)
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  const transactions = txData?.rows ?? []
  const totalCount = txData?.total ?? 0

  // ── Lookup helpers ─────────────────────────────────────────
  const containerName = useCallback(
    (id: string): string => containers.find((c) => c.id === id)?.name ?? '—',
    [containers],
  )

  const containerColor = useCallback(
    (id: string): string | null => containers.find((c) => c.id === id)?.color ?? null,
    [containers],
  )

  const counterpartyName = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return '—'
      return counterparties.find((c) => c.id === id)?.name ?? '—'
    },
    [counterparties],
  )

  // ── CRUD handlers ──────────────────────────────────────────
  async function handleCreateTx(data: Record<string, unknown>) {
    if (data._isTransfer) {
      setTransferSaving(true)
      setTransferError(null)
      try {
        await transactionsApi.createTransfer({
          date: data.date as string,
          description: (data.description as string) || undefined,
          amount: data.amount as string,
          currency: (data.currency as string) || 'EUR',
          fromContainerId: data.fromContainerId as string,
          toContainerId: data.toContainerId as string,
          status: (data.status as string) || 'completed',
          source: (data.source as string) || 'manual',
          notes: (data.notes as string) || undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        setShowCreate(false)
      } catch (err) {
        setTransferError(err instanceof Error ? err.message : 'Errore nel salvataggio')
      } finally {
        setTransferSaving(false)
      }
    } else {
      const tagIds = (data.tagIds as string[] | undefined) ?? []
      createMutation.mutate({ ...(data as Partial<Transaction>), tagIds } as Partial<Transaction> & { tagIds?: string[] }, {
        onSuccess: () => setShowCreate(false),
      })
    }
  }

  async function handleUpdateTx(data: Record<string, unknown>) {
    if (!editingTx) return
    if (data._isTransfer) {
      setTransferSaving(true)
      setTransferError(null)
      try {
        await transactionsApi.updateTransfer(editingTx.id, {
          date: data.date as string,
          description: (data.description as string) || undefined,
          amount: data.amount as string,
          currency: (data.currency as string) || 'EUR',
          fromContainerId: data.fromContainerId as string,
          toContainerId: data.toContainerId as string,
          status: (data.status as string) || 'completed',
          source: (data.source as string) || 'manual',
          notes: (data.notes as string) || undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        setEditingTx(null)
      } catch (err) {
        setTransferError(err instanceof Error ? err.message : 'Errore nel salvataggio')
      } finally {
        setTransferSaving(false)
      }
    } else {
      const tagIds = (data.tagIds as string[] | undefined) ?? []
      updateMutation.mutate(
        { id: editingTx.id, data: { ...(data as Partial<Transaction>), tagIds } },
        { onSuccess: () => setEditingTx(null) },
      )
    }
  }

  const createErrorMsg = transferError || (createMutation.error instanceof Error ? createMutation.error.message : createMutation.error ? 'Errore nel salvataggio' : null)
  const updateErrorMsg = transferError || (updateMutation.error instanceof Error ? updateMutation.error.message : updateMutation.error ? 'Errore nel salvataggio' : null)

  function handleDeleteTx(id: string) {
    if (!confirm('Eliminare questa transazione?')) return
    deleteMutation.mutate(id)
  }

  // ── Summary calculations ──────────────────────────────────
  const summary = useMemo(() => {
    let income = 0
    let expenses = 0

    for (const tx of transactions) {
      const amt = parseFloat(tx.amount)
      if (isNaN(amt)) continue
      if (amt > 0) income += amt
      else expenses += amt
    }

    return {
      income,
      expenses,
      net: income + expenses,
      filteredCount: transactions.length,
      totalCount,
    }
  }, [transactions, totalCount])

  // ── Has any active filter ─────────────────────────────────
  const hasFilters =
    searchText !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    containerId !== '' ||
    counterpartyId !== '' ||
    typeFilter !== '' ||
    statusFilter !== '' ||
    tagFilter !== ''

  function clearFilters() {
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setContainerId('')
    setCounterpartyId('')
    setTypeFilter('')
    setStatusFilter('')
    setTagFilter('')
  }

  // ── Column definitions ────────────────────────────────────
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Data',
        cell: ({ getValue }) => formatDate(getValue<string>()),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'description',
        header: 'Descrizione',
        cell: ({ getValue }) => (
          <span title={getValue<string>() ?? ''}>
            {truncate(getValue<string>(), 40)}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'container',
        accessorFn: (row) => containerName(row.containerId),
        header: 'Contenitore',
        cell: ({ row }) => {
          const color = containerColor(row.original.containerId)
          const name = containerName(row.original.containerId)
          return (
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color ?? '#71717a' }}
              />
              {name}
            </span>
          )
        },
      },
      {
        id: 'counterparty',
        accessorFn: (row) => counterpartyName(row.counterpartyId),
        header: 'Controparte',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ getValue }) => {
          const type = getValue<TransactionType>()
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeBg(type)} ${transactionTypeColor(type)}`}
            >
              {transactionTypeLabel(type)}
            </span>
          )
        },
      },
      {
        id: 'tags',
        header: 'Tag',
        enableSorting: false,
        cell: ({ row }) => {
          const txTags = (row.original.tags || []) as Tag[]
          if (txTags.length === 0) return <span className="text-zinc-600">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {txTags.slice(0, 3).map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-300"
                  title={tag.name}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#6b7280' }} />
                  {tag.name.length > 12 ? tag.name.slice(0, 12) + '…' : tag.name}
                </span>
              ))}
              {txTags.length > 3 && (
                <span className="text-[10px] text-zinc-500">+{txTags.length - 3}</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Stato',
        cell: ({ getValue }) => {
          const status = getValue<TransactionStatus>()
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {statusLabels[status]}
            </span>
          )
        },
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right">Importo</span>,
        cell: ({ row }) => {
          const amt = parseFloat(row.original.amount)
          const positive = amt >= 0
          return (
            <span
              className={`block text-right font-semibold whitespace-nowrap ${
                positive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(row.original.amount, row.original.currency)}
            </span>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = parseFloat(rowA.original.amount)
          const b = parseFloat(rowB.original.amount)
          return a - b
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingTx(row.original) }}
              className="rounded p-1.5 text-zinc-500 hover:text-energy-400 hover:bg-zinc-800 transition-colors"
              title="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteTx(row.original.id) }}
              className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              title="Elimina"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [containerName, containerColor, counterpartyName],
  )

  // ── Table instance ────────────────────────────────────────
  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  // ── Unique containers used in transactions for dropdown ───
  const containerOptions = useMemo(() => {
    return [...containers].sort((a, b) => a.name.localeCompare(b.name))
  }, [containers])

  // ── Loading state ──────────────────────────────────────────
  const isLoading = txLoading || containersLoading || counterpartiesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-energy-500" />
          <p className="text-sm text-zinc-400">Caricamento transazioni...</p>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────
  if (txError) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-400">Errore nel caricamento delle transazioni</p>
          <p className="text-xs text-zinc-500">{txError instanceof Error ? txError.message : 'Errore sconosciuto'}</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Transazioni</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Registro completo di tutte le operazioni finanziarie
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuova Transazione
        </button>
      </div>

      {/* ── Filter bar ───────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cerca transazioni..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
            />
          </div>

          {/* Date from */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-500">Da</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 [color-scheme:dark]"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-500">A</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 [color-scheme:dark]"
            />
          </div>

          {/* Container dropdown */}
          <SearchableSelect
            value={containerId}
            onChange={setContainerId}
            options={containerOptions.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
            placeholder="Contenitore"
            allowEmpty
            emptyLabel="Tutti i contenitori"
            className="min-w-[160px]"
          />

          {/* Counterparty dropdown */}
          <SearchableSelect
            value={counterpartyId}
            onChange={setCounterpartyId}
            options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Controparte"
            allowEmpty
            emptyLabel="Tutte le controparti"
            className="min-w-[150px]"
          />

          {/* Type dropdown */}
          <SearchableSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={filterTypeOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Tipo"
            allowEmpty
            emptyLabel="Tutti i tipi"
            className="min-w-[140px]"
          />

          {/* Status dropdown */}
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Stato"
            allowEmpty
            emptyLabel="Tutti gli stati"
            className="min-w-[130px]"
          />

          {/* Tag dropdown */}
          <SearchableSelect
            value={tagFilter}
            onChange={setTagFilter}
            options={tags.filter(t => t.isActive).map((t) => ({ value: t.id, label: t.name, color: t.color }))}
            placeholder="Tag"
            allowEmpty
            emptyLabel="Tutti i tag"
            className="min-w-[130px]"
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancella filtri
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Entrate</p>
          <p className="mt-1 text-lg font-semibold text-emerald-400">
            {formatCurrency(summary.income)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Uscite</p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {formatCurrency(summary.expenses)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Netto</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              summary.net >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(summary.net)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Transazioni</p>
          <p className="mt-1 text-lg font-semibold text-zinc-200">
            {summary.filteredCount}
            {summary.filteredCount !== summary.totalCount && (
              <span className="text-sm font-normal text-zinc-500">
                {' '}
                / {summary.totalCount}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-zinc-800 text-left"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 font-medium text-zinc-400 ${
                          canSort
                            ? 'cursor-pointer select-none hover:text-zinc-200 transition-colors'
                            : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="inline-flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {canSort && (
                            <span className="text-zinc-600">
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-energy-400" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-energy-400" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    Nessuna transazione trovata con i filtri selezionati.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => setEditingTx(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-zinc-300">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <p className="text-sm text-zinc-500">
            {summary.filteredCount} transazioni
          </p>
          <div className="flex items-center gap-4">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Righe:</span>
              <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
                {[25, 50, 100, 250, 500].map((size) => (
                  <button
                    key={size}
                    onClick={() => table.setPageSize(size)}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      table.getState().pagination.pageSize === size
                        ? 'bg-zinc-600 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-zinc-400">
                Pagina {pageIndex + 1} di {Math.max(pageCount, 1)}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      {showCreate && (
        <TransactionModal
          onClose={() => { setShowCreate(false); createMutation.reset(); setTransferError(null) }}
          onSave={handleCreateTx}
          containers={containers}
          counterparties={counterparties}
          subjects={subjects}
          tags={tags}
          isSaving={createMutation.isPending || transferSaving}
          saveError={createErrorMsg}
          onCreateCounterparty={handleCreateCounterparty}
          onCreateSubject={handleCreateSubject}
          onCreateTag={handleCreateTag}
        />
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editingTx && (
        <TransactionModal
          existing={editingTx}
          linkedTransaction={
            editingTx.transferLinkedId
              ? transactions.find(t => t.id === editingTx.transferLinkedId) ?? null
              : null
          }
          onClose={() => { setEditingTx(null); updateMutation.reset(); setTransferError(null) }}
          onSave={handleUpdateTx}
          containers={containers}
          counterparties={counterparties}
          subjects={subjects}
          tags={tags}
          isSaving={updateMutation.isPending || transferSaving}
          saveError={updateErrorMsg}
          onCreateCounterparty={handleCreateCounterparty}
          onCreateSubject={handleCreateSubject}
          onCreateTag={handleCreateTag}
        />
      )}
    </div>
  )
}
