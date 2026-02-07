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
} from 'lucide-react'
import type { ContainerType, Container } from '@/types'
import { CONTAINERS, SUBJECTS } from '@/lib/mockData'
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subjectName(subjectId: string): string {
  return SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId
}

type Grouping = 'type' | 'subject'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Containers() {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [grouping, setGrouping] = useState<Grouping>('type')

  // ------ filtered list ------
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return CONTAINERS.filter((c) => {
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
  }, [search, subjectFilter, showInactive])

  // ------ grouped data ------
  const groups = useMemo(() => {
    if (grouping === 'type') {
      const map = new Map<ContainerType, Container[]>()
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
    const map = new Map<string, Container[]>()
    for (const c of filtered) {
      const name = subjectName(c.subjectId)
      const list = map.get(name) ?? []
      list.push(c)
      map.set(name, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, containers]) => ({
        key: name,
        label: name,
        Icon: null as (typeof Landmark) | null,
        containers,
      }))
  }, [filtered, grouping])

  // ------ summary totals ------
  const totalCount = filtered.length

  const totalBalanceEUR = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'EUR')
        .reduce((sum, c) => sum + parseFloat(c.initialBalance || '0'), 0),
    [filtered],
  )

  const totalBalanceUSD = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'USD')
        .reduce((sum, c) => sum + parseFloat(c.initialBalance || '0'), 0),
    [filtered],
  )

  const totalBalanceRON = useMemo(
    () =>
      filtered
        .filter((c) => c.currency === 'RON')
        .reduce((sum, c) => sum + parseFloat(c.initialBalance || '0'), 0),
    [filtered],
  )

  // header total – combine EUR prominently
  const headerBalance = formatCurrency(totalBalanceEUR, 'EUR')

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
        <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors self-start">
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
          {SUBJECTS.map((s) => (
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
                  const balance = parseFloat(container.initialBalance || '0')
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

                        {/* Active / inactive badge */}
                        {container.isActive ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                            Attivo
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-500">
                            Inattivo
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <p className="mt-3 text-xs text-zinc-500">
                        Soggetto:{' '}
                        <span className="text-zinc-400">
                          {subjectName(container.subjectId)}
                        </span>
                      </p>

                      {/* Balance */}
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500">Saldo iniziale</p>
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
    </div>
  )
}
