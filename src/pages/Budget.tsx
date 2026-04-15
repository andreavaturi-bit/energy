import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trash2,
  Loader2,
  Wallet,
} from 'lucide-react'
import {
  useTags,
  useBudgetPeriods,
  useCreateBudgetPeriod,
  useCreateBudgetAllocation,
  useDeleteBudgetAllocation,
  useDeleteBudgetPeriod,
} from '@/lib/hooks'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { FormModal } from '@/components/ui/FormModal'

// After snakeToCamel, budget period data arrives in camelCase
interface BudgetPeriodView {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  allocations: Array<{
    id: string
    periodId: string
    tagId: string | null
    allocatedAmount: string
    currency: string
    tagName?: string
    tagColor?: string
  }>
}

// ---------------------------------------------------------------------------
// Period Modal
// ---------------------------------------------------------------------------

function PeriodModal({
  onClose,
  onSave,
  isPending,
}: {
  onClose: () => void
  onSave: (data: { name: string; startDate: string; endDate: string }) => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  })

  function handleSave() {
    if (!form.name.trim() || !form.startDate || !form.endDate) return
    onSave({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
    })
  }

  const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  return (
    <FormModal
      title="Nuovo Periodo Budget"
      size="md"
      onClose={onClose}
      onSubmit={handleSave}
      submitDisabled={!form.name.trim() || !form.startDate || !form.endDate}
      isSubmitting={isPending}
      submittingLabel="Creazione..."
      submitLabel="Crea Periodo"
    >
      <div>
        <label className={labelCls}>Nome Periodo *</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. Marzo 2026" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Data Inizio *</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Data Fine *</label>
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
        </div>
      </div>
    </FormModal>
  )
}

// ---------------------------------------------------------------------------
// Allocation Modal
// ---------------------------------------------------------------------------

function AllocationModal({
  onClose,
  onSave,
  categoryTags,
  isPending,
}: {
  onClose: () => void
  onSave: (data: { tagId?: string; category: string; allocated: number }) => void
  categoryTags: Array<{ id: string; name: string }>
  isPending: boolean
}) {

  const [form, setForm] = useState({
    tagId: '',
    customCategory: '',
    allocated: '',
  })

  function handleSave() {
    const allocated = parseFloat(form.allocated)
    if (isNaN(allocated) || allocated <= 0) return

    const tag = categoryTags.find((t) => t.id === form.tagId)
    const category = tag ? tag.name : form.customCategory.trim()
    if (!category) return

    onSave({
      tagId: tag?.id,
      category,
      allocated,
    })
  }

  const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  return (
    <FormModal
      title="Nuova Allocazione"
      size="md"
      onClose={onClose}
      onSubmit={handleSave}
      submitDisabled={(!form.tagId && !form.customCategory.trim()) || !form.allocated || parseFloat(form.allocated) <= 0}
      isSubmitting={isPending}
      submitLabel="Aggiungi"
    >
      <div>
        <label className={labelCls}>Categoria (da tag)</label>
        <select value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} className={inputCls}>
          <option value="">- Categoria libera -</option>
          {categoryTags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {!form.tagId && (
        <div>
          <label className={labelCls}>Nome Categoria *</label>
          <input type="text" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} placeholder="Es. Abbigliamento, Ristorazione..." className={inputCls} />
        </div>
      )}

      <div>
        <label className={labelCls}>Importo Allocato *</label>
        <input type="number" step="0.01" min="0" value={form.allocated} onChange={(e) => setForm({ ...form, allocated: e.target.value })} placeholder="0,00" className={inputCls} />
      </div>
    </FormModal>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Budget() {
  const { data: tags = [] } = useTags()
  const { data: periodsRaw = [], isLoading } = useBudgetPeriods()
  const periodsData = periodsRaw as unknown as BudgetPeriodView[]
  const createPeriod = useCreateBudgetPeriod()
  const createAllocation = useCreateBudgetAllocation()
  const deleteAllocationMutation = useDeleteBudgetAllocation()
  const deletePeriodMutation = useDeleteBudgetPeriod()

  const categoryTags = tags.filter((t) => t.type === 'category')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [showAllocationModal, setShowAllocationModal] = useState(false)

  const currentPeriod = periodsData[currentIndex]

  const allocations = useMemo(() => {
    if (!currentPeriod?.allocations) return []
    return currentPeriod.allocations.map((a) => ({
      id: a.id,
      category: a.tagName || 'Senza categoria',
      tagId: a.tagId,
      allocated: parseFloat(a.allocatedAmount),
      actual: 0, // TODO: calcola da transazioni reali per tag e periodo
    }))
  }, [currentPeriod])

  const totalAllocated = useMemo(() => allocations.reduce((s, a) => s + a.allocated, 0), [allocations])
  const totalActual = useMemo(() => allocations.reduce((s, a) => s + a.actual, 0), [allocations])

  function goNext() {
    if (currentIndex < periodsData.length - 1) setCurrentIndex(currentIndex + 1)
  }

  function goPrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  function handleDeleteAllocation(id: string) {
    if (!confirm('Eliminare questa allocazione?')) return
    deleteAllocationMutation.mutate(id)
  }

  function handleDeletePeriod() {
    if (!currentPeriod) return
    if (!confirm(`Eliminare il periodo "${currentPeriod.name}" e tutte le sue allocazioni?`)) return
    deletePeriodMutation.mutate(currentPeriod.id, {
      onSuccess: () => {
        setCurrentIndex(0)
      },
    })
  }

  async function handleCreatePeriod(data: { name: string; startDate: string; endDate: string }) {
    try {
      await createPeriod.mutateAsync(data)
      setCurrentIndex(0)
      setShowPeriodModal(false)
    } catch (err) {
      console.error('Errore creazione periodo:', err)
    }
  }

  async function handleCreateAllocation(data: { tagId?: string; category: string; allocated: number }) {
    if (!currentPeriod) return
    try {
      await createAllocation.mutateAsync({
        periodId: currentPeriod.id,
        tagId: data.tagId,
        allocatedAmount: String(data.allocated),
      })
      setShowAllocationModal(false)
    } catch (err) {
      console.error('Errore creazione allocazione:', err)
    }
  }

  function formatDateIt(dateStr: string): string {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
      </div>
    )
  }

  if (!currentPeriod) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Budget"
          description="Pianifica e monitora le allocazioni di spesa per periodo"
          actions={
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuovo Periodo
            </button>
          }
        />
        <EmptyState
          icon={Wallet}
          title="Nessun periodo budget"
          description="Crea il primo periodo per iniziare a pianificare le allocazioni di spesa"
          action={{ label: 'Crea il primo periodo', onClick: () => setShowPeriodModal(true) }}
        />
        {showPeriodModal && (
          <PeriodModal
            onClose={() => setShowPeriodModal(false)}
            onSave={handleCreatePeriod}
            isPending={createPeriod.isPending}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Budget"
        description="Pianifica e monitora le allocazioni di spesa per periodo"
        actions={
          <>
            <button
              onClick={handleDeletePeriod}
              disabled={deletePeriodMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Elimina periodo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuovo Periodo
            </button>
          </>
        }
      />

      {/* Period selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-zinc-100">{currentPeriod.name}</h2>
            <p className="text-xs text-zinc-500">
              {formatDateIt(currentPeriod.startDate)} - {formatDateIt(currentPeriod.endDate)}
            </p>
          </div>
          <button
            onClick={goNext}
            disabled={currentIndex === periodsData.length - 1}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Budget Totale Allocato</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">
            {'\u20AC'} {totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Speso Finora</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {'\u20AC'} {totalActual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          {totalAllocated > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {((totalActual / totalAllocated) * 100).toFixed(1)}% del budget
            </p>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Rimanente</p>
          <p className={`mt-1 text-2xl font-bold ${totalAllocated - totalActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {'\u20AC'} {(totalAllocated - totalActual).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          {totalAllocated > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {(100 - (totalActual / totalAllocated) * 100).toFixed(1)}% disponibile
            </p>
          )}
        </div>
      </div>

      {/* Allocation table - Budget vs Actual */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Budget vs Consuntivo</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Confronto tra allocazione prevista e spesa effettiva per categoria
            </p>
          </div>
          <button
            onClick={() => setShowAllocationModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi Categoria
          </button>
        </div>

        {allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <p className="text-sm">Nessuna allocazione per questo periodo.</p>
            <button
              onClick={() => setShowAllocationModal(true)}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-energy-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-energy-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Aggiungi la prima categoria
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-6 py-3 font-medium text-zinc-400">Categoria</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 text-right">Allocato</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 text-right">Consuntivo</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 text-right">Differenza</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 w-[200px]">Progresso</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 text-center">Stato</th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {allocations.map((row) => {
                  const diff = row.allocated - row.actual
                  const percentage = row.allocated > 0 ? (row.actual / row.allocated) * 100 : 0
                  const overBudget = percentage > 100
                  return (
                    <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-200 font-medium">{row.category}</td>
                      <td className="px-6 py-3 text-zinc-300 text-right">
                        {'\u20AC'} {row.allocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-zinc-300 text-right">
                        {'\u20AC'} {row.actual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff >= 0 ? '+' : ''}{'\u20AC'} {diff.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-zinc-800">
                            <div
                              className={`h-2 rounded-full ${overBudget ? 'bg-red-500' : 'bg-energy-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 w-12 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {overBudget ? (
                          <AlertTriangle className="inline h-4 w-4 text-red-400" />
                        ) : percentage > 80 ? (
                          <TrendingUp className="inline h-4 w-4 text-amber-400" />
                        ) : (
                          <TrendingDown className="inline h-4 w-4 text-emerald-400" />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDeleteAllocation(row.id)}
                          disabled={deleteAllocationMutation.isPending}
                          className="rounded p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                          title="Elimina allocazione"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-700 bg-zinc-800/30">
                  <td className="px-6 py-3 font-semibold text-zinc-100">Totale</td>
                  <td className="px-6 py-3 text-zinc-100 text-right font-semibold">
                    {'\u20AC'} {totalAllocated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-zinc-100 text-right font-semibold">
                    {'\u20AC'} {totalActual.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${totalAllocated - totalActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalAllocated - totalActual >= 0 ? '+' : ''}{'\u20AC'} {(totalAllocated - totalActual).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    {totalAllocated > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-energy-500"
                            style={{ width: `${Math.min((totalActual / totalAllocated) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-12 text-right">
                          {((totalActual / totalAllocated) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPeriodModal && (
        <PeriodModal
          onClose={() => setShowPeriodModal(false)}
          onSave={handleCreatePeriod}
          isPending={createPeriod.isPending}
        />
      )}

      {showAllocationModal && (
        <AllocationModal
          categoryTags={categoryTags}
          onClose={() => setShowAllocationModal(false)}
          onSave={handleCreateAllocation}
          isPending={createAllocation.isPending}
        />
      )}
    </div>
  )
}
