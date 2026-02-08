import { useState, useMemo } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Plus,
  X,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { CONTAINERS, COUNTERPARTIES, getContainer, getCounterparty } from '@/lib/mockData'
import { formatCurrency } from '@/lib/utils'

interface PendingItem {
  id: string
  description: string
  counterpartyId?: string
  counterpartyName: string
  amount: number
  dueDate: string
  direction: 'credit' | 'debit'
  status: 'pending' | 'resolved'
  containerId: string
  notes?: string
}

interface InstallmentPlanItem {
  id: string
  description: string
  counterpartyName: string
  totalAmount: number
  installments: number
  paid: number
  nextDue: string
  nextAmount: number
  containerId: string
  isActive: boolean
}

// Realistic pending items based on Andrea's finances
const initialPending: PendingItem[] = [
  { id: 'p-1', description: 'Quota 50% Mirko - corso Opzionetika febbraio', counterpartyName: 'Mirko Castignani', amount: 2100, dueDate: '2026-02-28', direction: 'credit', status: 'pending', containerId: 'c-isp-kairos', notes: 'Incasso corso VS/Opzionetika da dividere' },
  { id: 'p-2', description: 'Fattura consulenza broker Q1', counterpartyName: 'Cliente XYZ', amount: 1500, dueDate: '2026-03-15', direction: 'credit', status: 'pending', containerId: 'c-isp-kairos', notes: 'Fattura emessa il 18/02' },
  { id: 'p-3', description: 'Rimborso spese viaggio Roma', counterpartyName: 'Kairos SRLS', amount: 450, dueDate: '2026-02-20', direction: 'credit', status: 'pending', containerId: 'c-isp' },
  { id: 'p-4', description: 'Saldo Amex Oro - AV (estratto gennaio)', counterpartyName: 'American Express', amount: 2340, dueDate: '2026-02-10', direction: 'debit', status: 'pending', containerId: 'c-isp', notes: 'Addebito su ISP 2767' },
  { id: 'p-5', description: 'Saldo Amex Oro - VS (estratto gennaio)', counterpartyName: 'American Express', amount: 890, dueDate: '2026-02-10', direction: 'debit', status: 'pending', containerId: 'c-isp', notes: 'Addebito su ISP 2767' },
  { id: 'p-6', description: 'F24 IVA 4Q 2025 - Kairos', counterpartyId: 'cp-ade', counterpartyName: 'Agenzia delle Entrate', amount: 3200, dueDate: '2026-03-16', direction: 'debit', status: 'pending', containerId: 'c-isp-kairos', notes: 'Scadenza fiscale' },
  { id: 'p-7', description: 'TARI 2026 - rata 1', counterpartyName: 'Comune di Milano', amount: 180, dueDate: '2026-04-30', direction: 'debit', status: 'pending', containerId: 'c-isp' },
  { id: 'p-8', description: 'Commercialista personale - dichiarazione redditi', counterpartyName: 'Studio Rossi', amount: 300, dueDate: '2026-06-30', direction: 'debit', status: 'pending', containerId: 'c-isp' },
]

const initialPlans: InstallmentPlanItem[] = [
  { id: 'ip-1', description: 'Multa autostradale - rateizzata', counterpartyName: 'Autostrade per l\'Italia', totalAmount: 480, installments: 4, paid: 1, nextDue: '2026-03-15', nextAmount: 120, containerId: 'c-isp', isActive: true },
  { id: 'ip-2', description: 'Assicurazione auto - 4 rate', counterpartyName: 'Zurich Assicurazioni', totalAmount: 1200, installments: 4, paid: 2, nextDue: '2026-04-01', nextAmount: 300, containerId: 'c-isp', isActive: true },
]

export function Pendenze() {
  const [pending, setPending] = useState<PendingItem[]>(initialPending)
  const [plans, setPlans] = useState<InstallmentPlanItem[]>(initialPlans)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'credit' | 'debit'>('credit')

  const credits = pending.filter((p) => p.direction === 'credit' && p.status === 'pending')
  const debits = pending.filter((p) => p.direction === 'debit' && p.status === 'pending')
  const totalCredits = credits.reduce((s, p) => s + p.amount, 0)
  const totalDebits = debits.reduce((s, p) => s + p.amount, 0)

  function resolveItem(id: string) {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'resolved' as const } : p)),
    )
  }

  function deleteItem(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  function openAdd(type: 'credit' | 'debit') {
    setModalType(type)
    setShowModal(true)
  }

  function isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date()
  }

  function isUrgent(dueDate: string): boolean {
    const diff = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
          <p className="mt-1 text-2xl font-bold text-zinc-100">{plans.filter((p) => p.isActive).length}</p>
          <p className="text-xs text-zinc-500">
            {formatCurrency(plans.reduce((s, p) => s + (p.totalAmount - p.nextAmount * (p.installments - p.paid)), 0))} rimanente
          </p>
        </div>
      </div>

      {/* Crediti section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/50 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-400">Crediti</h2>
            <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              {credits.length}
            </span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            onClick={() => openAdd('credit')}
          >
            <Plus className="h-3 w-3" />
            Aggiungi
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {credits.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Nessun credito pendente</div>
          ) : (
            credits
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="shrink-0">
                    {isOverdue(item.dueDate) ? (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    ) : isUrgent(item.dueDate) ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{item.counterpartyName}</span>
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">{getContainer(item.containerId)?.name || ''}</span>
                      {item.notes && (
                        <>
                          <span className="text-xs text-zinc-600">—</span>
                          <span className="text-xs text-zinc-500">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-zinc-500">Scadenza</p>
                    <p className={`text-sm ${isOverdue(item.dueDate) ? 'text-red-400' : 'text-zinc-300'}`}>
                      {formatDate(item.dueDate)}
                    </p>
                    <p className={`text-xs ${isOverdue(item.dueDate) ? 'text-red-400' : isUrgent(item.dueDate) ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {daysUntil(item.dueDate)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-400 min-w-[100px] text-right">
                    {formatCurrency(item.amount)}
                  </p>
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                      title="Segna come incassato"
                      onClick={() => resolveItem(item.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      title="Elimina"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Debiti section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/50 bg-red-500/5">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Debiti</h2>
            <span className="ml-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              {debits.length}
            </span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
            onClick={() => openAdd('debit')}
          >
            <Plus className="h-3 w-3" />
            Aggiungi
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {debits.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Nessun debito pendente</div>
          ) : (
            debits
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="shrink-0">
                    {isOverdue(item.dueDate) ? (
                      <AlertCircle className="h-4 w-4 text-red-400 animate-pulse" />
                    ) : isUrgent(item.dueDate) ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-red-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{item.counterpartyName}</span>
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">{getContainer(item.containerId)?.name || ''}</span>
                      {item.notes && (
                        <>
                          <span className="text-xs text-zinc-600">—</span>
                          <span className="text-xs text-zinc-500">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-zinc-500">Scadenza</p>
                    <p className={`text-sm ${isOverdue(item.dueDate) ? 'text-red-400 font-semibold' : 'text-zinc-300'}`}>
                      {formatDate(item.dueDate)}
                    </p>
                    <p className={`text-xs ${isOverdue(item.dueDate) ? 'text-red-400' : isUrgent(item.dueDate) ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {daysUntil(item.dueDate)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-red-400 min-w-[100px] text-right">
                    {formatCurrency(item.amount)}
                  </p>
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                      title="Segna come pagato"
                      onClick={() => resolveItem(item.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      title="Elimina"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Piani rateali */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Piani Rateali</h2>
            <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {plans.filter((p) => p.isActive).length}
            </span>
          </div>
          <button className="flex items-center gap-1 text-xs text-energy-400 hover:text-energy-300">
            <Plus className="h-3 w-3" />
            Nuovo Piano
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {plans.map((plan) => {
            const remaining = plan.totalAmount - (plan.nextAmount * plan.paid)
            const progress = (plan.paid / plan.installments) * 100

            return (
              <div key={plan.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{plan.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{plan.counterpartyName}</span>
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">{getContainer(plan.containerId)?.name || ''}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{formatCurrency(plan.totalAmount)}</p>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">
                      Rata {plan.paid} di {plan.installments} pagate
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
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    Prossima rata: <span className="text-zinc-300">{formatDate(plan.nextDue)}</span>
                    <span className={`ml-1 ${isUrgent(plan.nextDue) ? 'text-amber-400' : 'text-zinc-500'}`}>
                      ({daysUntil(plan.nextDue)})
                    </span>
                  </span>
                  <span className="text-xs font-medium text-amber-400">{formatCurrency(plan.nextAmount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add pending item modal */}
      {showModal && (
        <AddPendingModal
          type={modalType}
          onClose={() => setShowModal(false)}
          onSave={(item) => {
            setPending((prev) => [...prev, { ...item, id: `p-${Date.now()}`, status: 'pending' }])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddPendingModal({
  type,
  onClose,
  onSave,
}: {
  type: 'credit' | 'debit'
  onClose: () => void
  onSave: (item: Omit<PendingItem, 'id' | 'status'>) => void
}) {
  const [form, setForm] = useState({
    description: '',
    counterpartyName: '',
    amount: '',
    dueDate: '',
    containerId: '',
    notes: '',
  })

  function handleSave() {
    if (!form.description || !form.amount || !form.dueDate || !form.containerId) return
    onSave({
      description: form.description,
      counterpartyName: form.counterpartyName,
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      direction: type,
      containerId: form.containerId,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">
            Nuovo {type === 'credit' ? 'Credito' : 'Debito'}
          </h2>
          <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Descrizione *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Controparte</label>
            <input
              type="text"
              value={form.counterpartyName}
              onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
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
              <option value="">— Seleziona —</option>
              {CONTAINERS.filter((c) => c.isActive && c.type === 'bank_account').map((c) => (
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
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
      </div>
    </div>
  )
}
