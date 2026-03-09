import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Building2,
  ShoppingBag,
  Globe,
  Landmark,
  MoreHorizontal,
  ArrowLeftRight,
} from 'lucide-react'
import {
  useCounterparties,
  useCreateCounterparty,
  useUpdateCounterparty,
  useDeleteCounterparty,
} from '@/lib/hooks'
import type { Counterparty, CounterpartyType } from '@/types'

const typeConfig: Record<CounterpartyType, { label: string; color: string; icon: typeof User }> = {
  person: { label: 'Persona', color: 'bg-blue-500/10 text-blue-400', icon: User },
  company: { label: 'Azienda', color: 'bg-amber-500/10 text-amber-400', icon: Building2 },
  service: { label: 'Servizio', color: 'bg-purple-500/10 text-purple-400', icon: Globe },
  store: { label: 'Negozio', color: 'bg-emerald-500/10 text-emerald-400', icon: ShoppingBag },
  government: { label: 'Ente Pubblico', color: 'bg-red-500/10 text-red-400', icon: Landmark },
  other: { label: 'Altro', color: 'bg-zinc-500/10 text-zinc-400', icon: ArrowLeftRight },
}

interface CounterpartyFormData {
  name: string
  type: CounterpartyType
  defaultCategory: string
  notes: string
}

const emptyForm: CounterpartyFormData = {
  name: '',
  type: 'person',
  defaultCategory: '',
  notes: '',
}

export function Counterparties() {
  const { data: counterparties = [], isLoading, isError, error } = useCounterparties()
  const createCounterparty = useCreateCounterparty()
  const updateCounterparty = useUpdateCounterparty()
  const deleteCounterparty = useDeleteCounterparty()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CounterpartyType>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCp, setEditingCp] = useState<Counterparty | null>(null)
  const [form, setForm] = useState<CounterpartyFormData>(emptyForm)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return counterparties.filter((cp) => {
      if (!showInactive && !cp.isActive) return false
      if (typeFilter !== 'all' && (cp.type || 'other') !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          cp.name.toLowerCase().includes(q) ||
          (cp.notes && cp.notes.toLowerCase().includes(q)) ||
          (cp.defaultCategory && cp.defaultCategory.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [counterparties, search, typeFilter, showInactive])

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, Counterparty[]> = {}
    for (const cp of filtered) {
      const t = cp.type || 'other'
      if (!groups[t]) groups[t] = []
      groups[t].push(cp)
    }
    return groups
  }, [filtered])

  function openCreate() {
    setEditingCp(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(cp: Counterparty) {
    setEditingCp(cp)
    setForm({
      name: cp.name,
      type: (cp.type as CounterpartyType) || 'other',
      defaultCategory: cp.defaultCategory || '',
      notes: cp.notes || '',
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  function handleSave() {
    if (!form.name.trim()) return

    const payload: Partial<Counterparty> = {
      name: form.name,
      type: form.type,
      defaultCategory: form.defaultCategory || null,
      notes: form.notes || null,
    }

    if (editingCp) {
      updateCounterparty.mutate(
        { id: editingCp.id, data: payload },
        { onSuccess: () => setShowModal(false) },
      )
    } else {
      createCounterparty.mutate(
        { ...payload, isActive: true },
        { onSuccess: () => setShowModal(false) },
      )
    }
  }

  function handleToggleActive(cp: Counterparty) {
    updateCounterparty.mutate({ id: cp.id, data: { isActive: !cp.isActive } })
    setMenuOpen(null)
  }

  function handleDelete(cp: Counterparty) {
    if (!confirm(`Eliminare la controparte "${cp.name}"?`)) return
    deleteCounterparty.mutate(cp.id)
    setMenuOpen(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Caricamento controparti...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-6 w-6" />
          <span>Errore: {error instanceof Error ? error.message : 'Errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  const activeCount = counterparties.filter((c) => c.isActive).length

  return (
    <div className="space-y-6" onClick={() => menuOpen && setMenuOpen(null)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Controparti</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeCount} controparti attive su {counterparties.length} totali
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Nuova Controparte
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca controparti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'person', 'company', 'service', 'store', 'government', 'other'] as const).map((t) => (
            <button
              key={t}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                typeFilter === t
                  ? 'bg-energy-500/10 text-energy-400'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'Tutti' : typeConfig[t].label}
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
          <EyeOff className="h-3.5 w-3.5" />
          Inattivi
        </button>
      </div>

      {/* Counterparty list grouped by type */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nessuna controparte trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, items]) => {
              const cfg = typeConfig[type as CounterpartyType] || typeConfig.other
              const Icon = cfg.icon
              return (
                <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-200">{cfg.label}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {items.map((cp) => (
                      <div
                        key={cp.id}
                        className={`flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors ${
                          !cp.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${cfg.color.split(' ')[0]}`}>
                          <Icon className={`h-4 w-4 ${cfg.color.split(' ')[1]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{cp.name}</p>
                          {cp.defaultCategory && (
                            <p className="text-xs text-zinc-500">Categoria: {cp.defaultCategory}</p>
                          )}
                        </div>
                        {cp.notes && (
                          <p className="text-xs text-zinc-500 italic max-w-[200px] truncate hidden sm:block">
                            {cp.notes}
                          </p>
                        )}
                        {!cp.isActive && (
                          <span className="shrink-0 rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                            Inattivo
                          </span>
                        )}
                        <div className="shrink-0 relative">
                          <button
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpen(menuOpen === cp.id ? null : cp.id)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuOpen === cp.id && (
                            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                                onClick={() => openEdit(cp)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Modifica
                              </button>
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                                onClick={() => handleToggleActive(cp)}
                              >
                                {cp.isActive ? (
                                  <><EyeOff className="h-3.5 w-3.5" /> Disattiva</>
                                ) : (
                                  <><Eye className="h-3.5 w-3.5" /> Riattiva</>
                                )}
                              </button>
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                                onClick={() => handleDelete(cp)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Elimina
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editingCp ? 'Modifica Controparte' : 'Nuova Controparte'}
              </h2>
              <button
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowModal(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
                  placeholder="es. Amazon, ENEL, Mario Rossi..."
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(typeConfig) as [CounterpartyType, typeof typeConfig.person][]).map(
                    ([key, cfg]) => {
                      const Icon = cfg.icon
                      return (
                        <button
                          key={key}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs transition-colors ${
                            form.type === key
                              ? `border-energy-500 ${cfg.color}`
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                          }`}
                          onClick={() => setForm({ ...form, type: key })}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </button>
                      )
                    },
                  )}
                </div>
              </div>

              {/* Default Category */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Categoria Default (opzionale)</label>
                <input
                  type="text"
                  value={form.defaultCategory}
                  onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
                  placeholder="es. Spese casa, Abbonamenti, Stipendi..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Note</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 resize-none"
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Annulla
              </button>
              <button
                className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors disabled:opacity-50"
                onClick={handleSave}
                disabled={!form.name.trim() || createCounterparty.isPending || updateCounterparty.isPending}
              >
                {(createCounterparty.isPending || updateCounterparty.isPending) ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvataggio...
                  </span>
                ) : (
                  editingCp ? 'Salva Modifiche' : 'Crea Controparte'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
