import { createCrudHandler } from '../crud-factory.js'

export const handleCounterparties = createCrudHandler({
  table: 'counterparties',
  notFoundMessage: 'Controparte non trovata',
  orderBy: [{ column: 'name' }],
  requiredOnCreate: ['name'],
  fields: {
    name: { column: 'name' },
    type: { column: 'type' },
    defaultCategory: { column: 'default_category' },
    notes: { column: 'notes' },
    isActive: { column: 'is_active', default: true },
  },
})
