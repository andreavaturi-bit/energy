import { createCrudHandler } from '../crud-factory.js'

/**
 * Appiattisce il join subjects(name) in subject_name.
 */
function flattenSubject(row: Record<string, unknown>): Record<string, unknown> {
  const { subjects, ...rest } = row as Record<string, unknown> & { subjects?: { name: string } }
  return { ...rest, subject_name: subjects?.name ?? null }
}

export const handleContainers = createCrudHandler({
  table: 'containers',
  notFoundMessage: 'Contenitore non trovato',
  orderBy: [
    { column: 'sort_order' },
    { column: 'name' },
  ],
  requiredOnCreate: ['name', 'type', 'subjectId'],
  selectList: '*, subjects(name)',
  selectById: '*, subjects(name)',
  transformRow: flattenSubject,
  fields: {
    subjectId: { column: 'subject_id' },
    name: { column: 'name' },
    type: { column: 'type' },
    provider: { column: 'provider' },
    currency: { column: 'currency', default: 'EUR' },
    isMultiCurrency: { column: 'is_multi_currency', default: false },
    initialBalance: { column: 'initial_balance', default: '0' },
    billingDay: { column: 'billing_day' },
    linkedContainerId: { column: 'linked_container_id' },
    goalAmount: { column: 'goal_amount' },
    goalDescription: { column: 'goal_description' },
    icon: { column: 'icon' },
    color: { column: 'color' },
    sortOrder: { column: 'sort_order', default: 0 },
    isPinned: { column: 'is_pinned', default: false },
    isActive: { column: 'is_active', default: true },
    notes: { column: 'notes' },
  },
  beforeDelete: async (sb, id) => {
    const { count } = await sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('container_id', id)
    if (count && count > 0) {
      return {
        canDelete: false,
        reason: `Impossibile eliminare: ci sono ${count} transazioni collegate a questo contenitore.`,
      }
    }
    return { canDelete: true }
  },
  listPostProcess: async (sb, rows) => {
    // Saldi aggregati in SQL (esclude cancelled e parent split):
    // sommare le righe in JS troncherebbe al limite righe di PostgREST.
    const { data: balances, error } = await sb.rpc('container_balances')
    if (error) throw error

    const balMap = new Map<string, number>()
    for (const b of (balances || []) as Array<{ container_id: string; balance: number | string }>) {
      balMap.set(b.container_id, Number(b.balance) || 0)
    }

    return rows.map((r) => {
      const fallback = parseFloat(r.initial_balance as string) || 0
      const bal = balMap.get(r.id as string) ?? fallback
      return { ...r, current_balance: bal.toFixed(4) }
    })
  },
})
