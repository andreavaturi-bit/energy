import { useState, useMemo } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react'
import {
  useContainers,
  useTransactions,
  useUpdateTransaction,
  useCreateTransaction,
  useDeleteTransaction,
  useInstallmentPlans,
  useCounterparties,
} from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Transaction, TransactionType, InstallmentPlan, Installment } from '@/types'

const INCOME_TYPES = ['income', 'transfer_in', 'loan_in', 'repayment_in'] as const
const EXPENSE_TYPES = ['expense', 'transfer_out', 'capital_injection', 'loan_out', 'repayment_out'] as const

export function Pendenze() {
  const { data: containers = [] } = useContainers()
  const { data: counterparties = [] } = useCounterparties()
  const { data: pendingData, isLoading: pendingLoading } = useTransactions({ status: 'pending', limit: '200' })
  const { data: plans = [], isLoading: plansLoading } = useInstallmentPlans()
  const updateTransaction = useUpdateTransaction()
  const createTransaction = useCreateTransaction()
  const deleteTransaction = useDeleteTransaction()

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'credit' | 'debit'>('credit')

  const pendingTransactions = pendingData?.rows ?? []

  const credits = useMemo(
    () => pendingTransactions.filter((t) => (INCOME_TYPES as readonly string[]).includes(t.type)),
    [pendingTransactions],
  )
  const debits = useMemo(
    () => pendingTransactions.filter((t) => (EXPENSE_TYPES as readonly string[]).includes(t.type)),
    [pendingTransactions],
  )

  const totalCredits = credits.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
  const totalDebits = debits.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)

  const activePlans = plans.filter((p) => p.isActive)
  const plansRemaining = activePlans.reduce((sum, p) => {
    const paidCount = p.installments?.filter((i) => i.status === 'paid').length ?? 0
    const instAmount = parseFloat(p.totalAmount) / p.numberOfInstallments
    return sum + instAmount * (p.numberOfInstallments - paidCount)
  }, 0)

  function resolveItem(id: string) {
    updateTransaction.mutate({ id, data: { status: 'completed' } })
  }

  function removeItem(id: string) {
    if (!confirm('Eliminare questa pendenza?')) return
    deleteTransaction.mutate(id)
  }

  function openAdd(type: 'credit' | 'debit') {
    setModalType(type)
    setShowModal(true)
  }

  function isOverdue(dateStr: string): boolean {
    return new Date(dateStr) < new Date()
  }

  function isUrgent(dateStr: string): boolean {
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && diff >= 0
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function daysUntil(dateStr: string): string {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} giorni fa`
    if (diff === 0) return 'Oggi'
    if (diff === 1) return 'Domani'
    return `tra ${diff} giorni`
  }

  function getContainerName(containerId: string): string {
    return containers.find((c) => c.id === containerId)?.name ?? ''
  }

  function getCounterpartyName(counterpartyId?: string | null): string {
    if (!counterpartyId) return ''
    return counterparties.find((c) => c.id === counterpartyId)?.name ?? ''
  }

  const isLoading = pendingLoading || plansLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-energy-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Pendenze</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Crediti da incassare, debiti da saldare e piani rateali in corso
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-zinc-500">Crediti Pendenti</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(totalCredits)}</p>
          <p className="text-xs text-zinc-500">{credits.length} voci</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-zinc-500">Debiti Pendenti</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-400">{formatCurrency(totalDebits)}</p>
          <p className="text-xs text-zinc-500">{debits.length} voci</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-zinc-500">Netto Pendente</p>
          </div>
          <p className={`mt-1 text-2xl font-bold ${totalCredits - totalDebits >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalCredits - totalDebits)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-purple-400" />
            <p className="text-xs text-zinc-500">Piani Rateali Attivi</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{activePlans.length}</p>
          <p className="text-xs text-zinc-500">
            {formatCurrency(plansRemaining)} rimanente
          </p>
        </div>
      </div>

      {/* Crediti section */}
      <PendingSection
        title="Crediti"
        items={credits}
        color="emerald"
        icon={ArrowUpCircle}
        emptyText="Nessun credito pendente"
        actionLabel="Incassato"
        onAdd={() => openAdd('credit')}
        onResolve={resolveItem}
        onDelete={removeItem}
        getContainerName={getContainerName}
        getCounterpartyName={getCounterpartyName}
        isOverdue={isOverdue}
        isUrgent={isUrgent}
        formatDate={formatDate}
        daysUntil={daysUntil}
      />

      {/* Debiti section */}
      <PendingSection
        title="Debiti"
        items={debits}
        color="red"
        icon={ArrowDownCircle}
        emptyText="Nessun debito pendente"
        actionLabel="Pagato"
        onAdd={() => openAdd('debit')}
        onResolve={resolveItem}
        onDelete={removeItem}
        getContainerName={getContainerName}
        getCounterpartyName={getCounterpartyName}
        isOverdue={isOverdue}
        isUrgent={isUrgent}
        formatDate={formatDate}
        daysUntil={daysUntil}
      />

      {/* Piani rateali */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Piani Rateali</h2>
            <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {activePlans.length}
            </span>
          </div>
        </div>
        {activePlans.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nessun piano rateale"
            description="I piani rateali appariranno qui quando ne creerai uno"
          />
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {activePlans.map((plan) => (
              <InstallmentPlanRow
                key={plan.id}
                plan={plan}
                getContainerName={getContainerName}
                formatDate={formatDate}
                isUrgent={isUrgent}
                daysUntil={daysUntil}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add pending item modal */}
      {showModal && (
        <AddPendingModal
          type={modalType}
          containers={containers}
          onClose={() => setShowModal(false)}
          onSave={(item) => {
            createTransaction.mutate({
              description: item.description,
              amount: String(item.amount),
              date: item.dueDate,
              containerId: item.containerId,
              type: item.type,
              status: 'pending',
              source: 'manual',
              notes: item.notes,
            })
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Pending Section (reusable for credits & debits) ────────

function PendingSection({
  title,
  items,
  color,
  icon: Icon,
  emptyText,
  actionLabel,
  onAdd,
  onResolve,
  onDelete,
  getContainerName,
  getCounterpartyName,
  isOverdue,
  isUrgent,
  formatDate,
  daysUntil,
}: {
  title: string
  items: Transaction[]
  color: 'emerald' | 'red'
  icon: typeof ArrowUpCircle
  emptyText: string
  actionLabel: string
  onAdd: () => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  getContainerName: (id: string) => string
  getCounterpartyName: (id?: string | null) => string
  isOverdue: (d: string) => boolean
  isUrgent: (d: string) => boolean
  formatDate: (d: string) => string
  daysUntil: (d: string) => string
}) {
  const borderColor = color === 'emerald' ? 'border-emerald-900/50' : 'border-red-900/50'
  const bgColor = color === 'emerald' ? 'bg-emerald-500/5' : 'bg-red-500/5'
  const textColor = color === 'emerald' ? 'text-emerald-400' : 'text-red-400'
  const badgeBg = color === 'emerald' ? 'bg-emerald-500/10' : 'bg-red-500/10'

  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} ${bgColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${textColor}`} />
          <h2 className={`text-lg font-semibold ${textColor}`}>{title}</h2>
          <span className={`ml-1 rounded-full ${badgeBg} px-2 py-0.5 text-xs ${textColor}`}>
            {items.length}
          </span>
        </div>
        <button
          className={`flex items-center gap-1 text-xs ${textColor} hover:opacity-80`}
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
          Aggiungi
        </button>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">{emptyText}</div>
        ) : (
          sorted.map((item) => {
            const cpName = getCounterpartyName(item.counterpartyId)
            return (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                <div className="shrink-0">
                  {isOverdue(item.date) ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : isUrgent(item.date) ? (
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Clock className={`h-4 w-4 ${textColor}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{item.description || 'Senza descrizione'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cpName && <span className="text-xs text-zinc-500">{cpName}</span>}
                    {cpName && <span className="text-xs text-zinc-600">|</span>}
                    <span className="text-xs text-zinc-500">{getContainerName(item.containerId)}</span>
                    {item.notes && (
                      <>
                        <span className="text-xs text-zinc-600">-</span>
                        <span className="text-xs text-zinc-500">{item.notes}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-500">Scadenza</p>
                  <p className={`text-sm ${isOverdue(item.date) ? 'text-red-400' : 'text-zinc-300'}`}>
                    {formatDate(item.date)}
                  </p>
                  <p className={`text-xs ${isOverdue(item.date) ? 'text-red-400' : isUrgent(item.date) ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {daysUntil(item.date)}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${textColor} min-w-[100px] text-right`}>
                  {formatCurrency(Math.abs(parseFloat(item.amount)))}
                </p>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    title={`Segna come ${actionLabel.toLowerCase()}`}
                    onClick={() => onResolve(item.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="Elimina"
                    onClick={() => onDelete(item.id)}
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
  )
}

// ── Installment Plan Row ───────────────────────────────────

function InstallmentPlanRow({
  plan,
  getContainerName,
  formatDate,
  isUrgent,
  daysUntil,
}: {
  plan: InstallmentPlan
  getContainerName: (id: string) => string
  formatDate: (d: string) => string
  isUrgent: (d: string) => boolean
  daysUntil: (d: string) => string
}) {
  const paidCount = plan.installments?.filter((i) => i.status === 'paid').length ?? 0
  const progress = plan.numberOfInstallments > 0 ? (paidCount / plan.numberOfInstallments) * 100 : 0
  const instAmount = plan.numberOfInstallments > 0
    ? parseFloat(plan.totalAmount) / plan.numberOfInstallments
    : 0
  const remaining = instAmount * (plan.numberOfInstallments - paidCount)

  const nextInstallment = plan.installments
    ?.filter((i) => i.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]

  // The API joins counterparties(name) which arrives as a nested object
  const planAny = plan as unknown as Record<string, unknown>
  const counterpartyName = planAny.counterparties
    ? (planAny.counterparties as { name: string })?.name
    : plan.counterparty?.name ?? ''

  return (
    <div className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-200">{plan.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {counterpartyName && <span className="text-xs text-zinc-500">{counterpartyName}</span>}
            {counterpartyName && plan.containerId && <span className="text-xs text-zinc-600">|</span>}
            {plan.containerId && (
              <span className="text-xs text-zinc-500">{getContainerName(plan.containerId)}</span>
            )}
          </div>
        </div>
        <p className="text-sm font-semibold text-zinc-100">{formatCurrency(plan.totalAmount)}</p>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">
            Rata {paidCount} di {plan.numberOfInstallments} pagate
          </span>
          <span className="text-xs text-zinc-400">
            Rimanente: {formatCurrency(remaining)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div
            className="h-2 rounded-full bg-energy-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {nextInstallment && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Prossima rata: <span className="text-zinc-300">{formatDate(nextInstallment.dueDate)}</span>
            <span className={`ml-1 ${isUrgent(nextInstallment.dueDate) ? 'text-amber-400' : 'text-zinc-500'}`}>
              ({daysUntil(nextInstallment.dueDate)})
            </span>
          </span>
          <span className="text-xs font-medium text-amber-400">
            {formatCurrency(nextInstallment.amount)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Add Pending Modal ──────────────────────────────────────

function AddPendingModal({
  type,
  containers,
  onClose,
  onSave,
}: {
  type: 'credit' | 'debit'
  containers: Array<{ id: string; name: string; isActive: boolean; type: string }>
  onClose: () => void
  onSave: (item: {
    description: string
    amount: number
    dueDate: string
    containerId: string
    type: TransactionType
    notes?: string
  }) => void
}) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    dueDate: '',
    containerId: '',
    notes: '',
  })

  function handleSave() {
    if (!form.description || !form.amount || !form.dueDate || !form.containerId) return
    onSave({
      description: form.description,
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      containerId: form.containerId,
      type: (type === 'credit' ? 'income' : 'expense') as TransactionType,
      notes: form.notes || undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={`Nuovo ${type === 'credit' ? 'Credito' : 'Debito'}`} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Descrizione *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Importo *</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Scadenza *</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Contenitore *</label>
          <select
            value={form.containerId}
            onChange={(e) => setForm({ ...form, containerId: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
          >
            <option value="">Seleziona</option>
            {containers.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Note</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6">
        <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700" onClick={onClose}>
          Annulla
        </button>
        <button
          className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50"
          onClick={handleSave}
          disabled={!form.description || !form.amount || !form.dueDate || !form.containerId}
        >
          Crea {type === 'credit' ? 'Credito' : 'Debito'}
        </button>
      </div>
    </Modal>
  )
}
