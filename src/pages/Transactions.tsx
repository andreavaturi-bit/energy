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
} from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '@/types'
import { TRANSACTIONS, CONTAINERS, COUNTERPARTIES } from '@/lib/mockData'
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

// ── Component ───────────────────────────────────────────────

export function Transactions() {
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
    let data = [...TRANSACTIONS]

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
  }, [searchText, dateFrom, dateTo, containerId, typeFilter, statusFilter])

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
      totalCount: TRANSACTIONS.length,
    }
  }, [filteredData])

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
    const ids = new Set(TRANSACTIONS.map((t) => t.containerId))
    return CONTAINERS.filter((c) => ids.has(c.id)).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [])

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
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
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
    </div>
  )
}
