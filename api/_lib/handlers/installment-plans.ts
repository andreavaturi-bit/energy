import { createCrudHandler, composeHandler } from '../crud-factory.js'
import { getSupabase, ok, badRequest, notFound } from '../supabase.js'

const SELECT_FULL = '*, installments(*), counterparties(name), containers(name)'

const baseHandler = createCrudHandler({
  table: 'installment_plans',
  notFoundMessage: 'Piano rateale non trovato',
  orderBy: [{ column: 'created_at', ascending: false }],
  requiredOnCreate: ['description', 'totalAmount', 'numberOfInstallments'],
  selectList: SELECT_FULL,
  selectById: SELECT_FULL,
  selectAfterCreate: SELECT_FULL,
  fields: {
    description: { column: 'description' },
    totalAmount: { column: 'total_amount' },
    currency: { column: 'currency', default: 'EUR' },
    numberOfInstallments: { column: 'number_of_installments' },
    counterpartyId: { column: 'counterparty_id' },
    containerId: { column: 'container_id' },
    reminderDaysBefore: { column: 'reminder_days_before' },
    notes: { column: 'notes' },
    isActive: { column: 'is_active', default: true },
  },
  beforeDelete: async (sb, id) => {
    // Cascade: elimina le rate prima del piano
    await sb.from('installments').delete().eq('plan_id', id)
    return { canDelete: true }
  },
  afterCreate: async (sb, plan, body) => {
    // Se startDate e' fornita, genera automaticamente le rate
    if (body.startDate && body.numberOfInstallments) {
      const numInst = parseInt(body.numberOfInstallments as string, 10)
      const instAmount = (parseFloat(body.totalAmount as string) / numInst).toFixed(2)
      const installments: Array<Record<string, unknown>> = []
      for (let i = 0; i < numInst; i++) {
        const dueDate = new Date(body.startDate as string)
        dueDate.setMonth(dueDate.getMonth() + i)
        installments.push({
          plan_id: plan.id,
          installment_number: i + 1,
          amount: instAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
        })
      }
      await sb.from('installments').insert(installments)
    }
    // Refetch con join completo
    const { data } = await sb
      .from('installment_plans')
      .select(SELECT_FULL)
      .eq('id', plan.id as string)
      .single()
    return (data as Record<string, unknown>) ?? plan
  },
})

export const handleInstallmentPlans = composeHandler(baseHandler, async (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>
  const bodyAction = body._action as string | undefined

  // Azione custom: segna una rata come pagata
  if (req.method === 'POST' && bodyAction === 'pay-installment') {
    const sb = getSupabase()
    const installmentId = body.installmentId as string
    const transactionId = body.transactionId as string | undefined
    if (!installmentId) {
      badRequest(res, 'installmentId e obbligatorio')
      return true
    }
    const update: Record<string, unknown> = {
      status: 'paid',
      updated_at: new Date().toISOString(),
    }
    if (transactionId) update.transaction_id = transactionId
    const { data, error } = await sb
      .from('installments')
      .update(update)
      .eq('id', installmentId)
      .select()
      .single()
    if (error || !data) {
      notFound(res, 'Rata non trovata')
      return true
    }
    ok(res, data)
    return true
  }

  return false
})
