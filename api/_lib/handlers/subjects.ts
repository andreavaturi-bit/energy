import { createCrudHandler } from '../crud-factory.js'

export const handleSubjects = createCrudHandler({
  table: 'subjects',
  notFoundMessage: 'Soggetto non trovato',
  orderBy: [{ column: 'name' }],
  requiredOnCreate: ['name', 'type'],
  fields: {
    type: { column: 'type' },
    name: { column: 'name' },
    legalForm: { column: 'legal_form' },
    taxId: { column: 'tax_id' },
    country: { column: 'country', default: 'IT' },
    role: { column: 'role' },
    parentSubjectId: { column: 'parent_subject_id' },
    notes: { column: 'notes' },
    isActive: { column: 'is_active', default: true },
  },
})
