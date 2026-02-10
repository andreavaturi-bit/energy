import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '@/types'
import { TRANSACTIONS, CONTAINERS, COUNTERPARTIES, SUBJECTS } from '@/lib/mockData'
import {
  formatCurrency,
  formatDate,
  transactionTypeLabel,
  transactionTypeColor,
  isInflow,
} from '@/lib/utils'

// ── Lookup helpers ──────────────────────────────────────────

function containerName(id: string): string {
  return CONTAINERS.find((c) => c.id === id)?.name ?? '—'
}

function containerColor(id: string): string | null {
  return CONTAINERS.find((c) => c.id === id)?.color ?? null
}

function counterpartyName(id: string | null | undefined): string {
  if (!id) return '—'
  return COUNTERPARTIES.find((c) => c.id === id)?.name ?? '—'
}

// ── Status badge styling ────────────────────────────────────

const statusStyles: Record<TransactionStatus, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  projected: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-zinc-500/10 text-zinc-400',
}

const statusLabels: Record<TransactionStatus, string> = {
  completed: 'Completata',
  pending: 'In sospeso',
  projected: 'Proiettata',
  cancelled: 'Annullata',
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

const typeOptions: { value: TransactionType; label: string }[] = [
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
}: {
  onClose: () => void
  onSave: (tx: Transaction) => void
  existing?: Transaction | null
}) {
  const isEdit = !!existing

  const [form, setForm] = useState({
    date: existing?.date ?? new Date().toISOString().slice(0, 10),
    description: existing?.description ?? '',
    amount: existing ? String(Math.abs(parseFloat(existing.amount))) : '',
    currency: existing?.currency ?? 'EUR',
    containerId: existing?.containerId ?? (CONTAINERS[0]?.id ?? ''),
    counterpartyId: existing?.counterpartyId ?? '',
    type: (existing?.type ?? 'expense') as TransactionType,
    status: (existing?.status ?? 'completed') as TransactionStatus,
    notes: existing?.notes ?? '',
    sharedWithSubjectId: existing?.sharedWithSubjectId ?? '',
    sharePercentage: existing?.sharePercentage ?? '',
  })

  function handleSave() {
    if (!form.description.trim() || !form.amount || !form.containerId) return

    const isOut = ['expense', 'transfer_out', 'capital_injection', 'loan_out', 'repayment_out'].includes(form.type)
    const rawAmt = parseFloat(form.amount)
    const finalAmt = isOut && rawAmt > 0 ? -rawAmt : rawAmt

    const tx: Transaction = {
      ...(existing ?? {}),
      id: existing?.id ?? `tx-${Date.now()}`,
      date: form.date,
      description: form.description,
      amount: finalAmt.toFixed(2),
      currency: form.currency,
      containerId: form.containerId,
      counterpartyId: form.counterpartyId || null,
      type: form.type,
      status: form.status,
      source: existing?.source ?? 'manual',
      notes: form.notes || null,
      sharedWithSubjectId: form.sharedWithSubjectId || null,
      sharePercentage: form.sharePercentage || null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(tx)
  }

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
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} className={inputCls}>
                {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descrizione *</label>
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
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="RON">RON</option>
              </select>
            </div>
          </div>

          {/* Container */}
          <div>
            <label className={labelCls}>Contenitore *</label>
            <select value={form.containerId} onChange={(e) => setForm({ ...form, containerId: e.target.value })} className={inputCls}>
              {CONTAINERS.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Counterparty */}
          <div>
            <label className={labelCls}>Controparte</label>
            <select value={form.counterpartyId} onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })} className={inputCls}>
              <option value="">— Nessuna —</option>
              {COUNTERPARTIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Stato</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TransactionStatus })} className={inputCls}>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Cost sharing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Condiviso con</label>
              <select value={form.sharedWithSubjectId} onChange={(e) => setForm({ ...form, sharedWithSubjectId: e.target.value })} className={inputCls}>
                <option value="">— Nessuno —</option>
                {SUBJECTS.filter((s) => s.role === 'partner').map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {form.sharedWithSubjectId && (
              <div>
                <label className={labelCls}>Quota %</label>
                <input type="number" min="1" max="100" value={form.sharePercentage} onChange={(e) => setForm({ ...form, sharePercentage: e.target.value })} placeholder="50" className={inputCls} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Note</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Note opzionali..." className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!form.description.trim() || !form.amount || !form.containerId}
            className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEdit ? 'Salva Modifiche' : 'Salva Transazione'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────

export function Transactions() {
  // Local transactions state (so new ones appear)
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  function handleDeleteTx(id: string) {
    if (!confirm('Eliminare questa transazione?')) return
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  // Filter state
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [containerId, setContainerId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // ── Pre-filter data based on filter-bar controls ──────────
  const filteredData = useMemo(() => {
    let data = [...transactions]

    // Text search (description + notes)
    if (searchText) {
      const q = searchText.toLowerCase()
      data = data.filter(
        (tx) =>
          (tx.description ?? '').toLowerCase().includes(q) ||
          (tx.notes ?? '').toLowerCase().includes(q),
      )
    }

    // Date range
    if (dateFrom) {
      data = data.filter((tx) => tx.date >= dateFrom)
    }
    if (dateTo) {
      data = data.filter((tx) => tx.date <= dateTo)
    }

    // Container
    if (containerId) {
      data = data.filter((tx) => tx.containerId === containerId)
    }

    // Type
    if (typeFilter) {
      data = data.filter((tx) => tx.type === typeFilter)
    }

    // Status
    if (statusFilter) {
      data = data.filter((tx) => tx.status === statusFilter)
    }

    return data
  }, [transactions, searchText, dateFrom, dateTo, containerId, typeFilter, statusFilter])

  // ── Summary calculations ──────────────────────────────────
  const summary = useMemo(() => {
    let income = 0
    let expenses = 0

    for (const tx of filteredData) {
      const amt = parseFloat(tx.amount)
      if (isNaN(amt)) continue
      if (amt > 0) income += amt
      else expenses += amt
    }

    return {
      income,
      expenses,
      net: income + expenses,
      filteredCount: filteredData.length,
      totalCount: transactions.length,
    }
  }, [filteredData, transactions.length])

  // ── Has any active filter ─────────────────────────────────
  const hasFilters =
    searchText !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    containerId !== '' ||
    typeFilter !== '' ||
    statusFilter !== ''

  function clearFilters() {
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setContainerId('')
    setTypeFilter('')
    setStatusFilter('')
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
    [],
  )

  // ── Table instance ────────────────────────────────────────
  const table = useReactTable({
    data: filteredData,
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
        pageSize: 25,
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  // ── Unique containers used in transactions for dropdown ───
  const containerOptions = useMemo(() => {
    const ids = new Set(transactions.map((t) => t.containerId))
    return CONTAINERS.filter((c) => ids.has(c.id)).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [transactions])

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
          <select
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          >
            <option value="">Contenitore</option>
            {containerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          >
            <option value="">Tipo</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          >
            <option value="">Stato</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

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

      {/* ── Create Modal ─────────────────────────────────── */}
      {showCreate && (
        <TransactionModal
          onClose={() => setShowCreate(false)}
          onSave={(tx) => {
            setTransactions((prev) => [tx, ...prev])
            setShowCreate(false)
          }}
        />
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editingTx && (
        <TransactionModal
          existing={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(tx) => {
            setTransactions((prev) => prev.map((t) => t.id === tx.id ? tx : t))
            setEditingTx(null)
          }}
        />
      )}
    </div>
  )
}
