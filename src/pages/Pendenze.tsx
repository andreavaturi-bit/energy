import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Plus,
} from 'lucide-react'

// Types reference: Transaction, InstallmentPlan, Installment from @/types

// Placeholder pending credits
const mockCrediti = [
  {
    id: '1',
    description: 'Rimborso spese da Mirko T.',
    counterparty: 'Mirko T.',
    amount: '€ 500,00',
    dueDate: '15/02/2026',
    status: 'pending' as const,
    notes: 'VS/Opzionetika — quota febbraio',
  },
  {
    id: '2',
    description: 'Fattura consulenza Cliente XYZ',
    counterparty: 'Cliente XYZ',
    amount: '€ 2.000,00',
    dueDate: '28/02/2026',
    status: 'pending' as const,
    notes: 'Fattura Q1 2026',
  },
  {
    id: '3',
    description: 'Prestito a Marco R.',
    counterparty: 'Marco R.',
    amount: '€ 1.000,00',
    dueDate: '01/03/2026',
    status: 'pending' as const,
    notes: 'Restituzione prevista entro marzo',
  },
]

// Placeholder pending debits
const mockDebiti = [
  {
    id: '4',
    description: 'Saldo Amex Platino',
    counterparty: 'American Express',
    amount: '€ 1.200,00',
    dueDate: '15/02/2026',
    status: 'pending' as const,
    notes: 'Estratto conto gennaio',
  },
  {
    id: '5',
    description: 'F24 IVA Q4 2025',
    counterparty: 'Agenzia Entrate',
    amount: '€ 2.400,00',
    dueDate: '16/03/2026',
    status: 'pending' as const,
    notes: 'Scadenza fiscale',
  },
  {
    id: '6',
    description: 'Rata mutuo Shuffle SSRL',
    counterparty: 'Banca Intesa',
    amount: '€ 800,00',
    dueDate: '01/03/2026',
    status: 'pending' as const,
    notes: 'Rata mensile',
  },
]

// Placeholder installment plans
const mockPiani = [
  {
    id: '1',
    description: 'MacBook Pro 16" M4',
    counterparty: 'Apple',
    totalAmount: '€ 3.999,00',
    installments: 12,
    paid: 4,
    nextDue: '15/02/2026',
    nextAmount: '€ 333,25',
    remaining: '€ 2.666,00',
  },
  {
    id: '2',
    description: 'Assicurazione Auto',
    counterparty: 'Generali',
    totalAmount: '€ 1.200,00',
    installments: 4,
    paid: 1,
    nextDue: '01/04/2026',
    nextAmount: '€ 300,00',
    remaining: '€ 900,00',
  },
]

const totalCrediti = 3500
const totalDebiti = 4400

export function Pendenze() {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-zinc-500">Totale Crediti Pendenti</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {'\u20AC'} {totalCrediti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-zinc-500">Totale Debiti Pendenti</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {'\u20AC'} {totalDebiti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-zinc-500">Piani Rateali Attivi</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{mockPiani.length}</p>
        </div>
      </div>

      {/* Crediti section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/50 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-400">Crediti</h2>
            <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              {mockCrediti.length}
            </span>
          </div>
          <button className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            <Plus className="h-3 w-3" />
            Aggiungi
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {mockCrediti.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500">{item.counterparty}</span>
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
                <p className="text-sm text-zinc-300">{item.dueDate}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-emerald-400 min-w-[100px] text-right">
                {item.amount}
              </p>
              <button className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400" title="Segna come incassato">
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Debiti section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/50 bg-red-500/5">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Debiti</h2>
            <span className="ml-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              {mockDebiti.length}
            </span>
          </div>
          <button className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
            <Plus className="h-3 w-3" />
            Aggiungi
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {mockDebiti.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500">{item.counterparty}</span>
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
                <p className="text-sm text-zinc-300">{item.dueDate}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-red-400 min-w-[100px] text-right">
                {item.amount}
              </p>
              <button className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400" title="Segna come pagato">
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Piani rateali */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Piani Rateali</h2>
          </div>
          <button className="flex items-center gap-1 text-xs text-energy-400 hover:text-energy-300">
            <Plus className="h-3 w-3" />
            Nuovo Piano
          </button>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {mockPiani.map((plan) => (
            <div key={plan.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{plan.description}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{plan.counterparty}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-100">{plan.totalAmount}</p>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">
                    Rata {plan.paid} di {plan.installments} pagate
                  </span>
                  <span className="text-xs text-zinc-400">
                    Rimanente: {plan.remaining}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-energy-500"
                    style={{ width: `${(plan.paid / plan.installments) * 100}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Prossima rata: <span className="text-zinc-300">{plan.nextDue}</span>
                </span>
                <span className="text-xs font-medium text-amber-400">{plan.nextAmount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
