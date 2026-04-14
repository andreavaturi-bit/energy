import { createCrudHandler } from '../crud-factory.js'

export const handleImportProfiles = createCrudHandler({
  table: 'import_profiles',
  notFoundMessage: 'Profilo di import non trovato',
  orderBy: [{ column: 'name' }],
  requiredOnCreate: ['name', 'containerId'],
  selectList: '*, containers(name)',
  selectAfterCreate: '*, containers(name)',
  fields: {
    name: { column: 'name' },
    containerId: { column: 'container_id' },
    fileType: { column: 'file_type', default: 'csv' },
    delimiter: { column: 'delimiter', default: ',' },
    encoding: { column: 'encoding', default: 'UTF-8' },
    dateFormat: { column: 'date_format', default: 'DD/MM/YYYY' },
    decimalSeparator: { column: 'decimal_separator', default: ',' },
    thousandsSeparator: { column: 'thousands_separator', default: '.' },
    skipRows: { column: 'skip_rows', default: 0 },
    columnMapping: { column: 'column_mapping', default: {} },
    amountInverted: { column: 'amount_inverted', default: false },
    separateAmountColumns: { column: 'separate_amount_columns', default: false },
    incomeColumn: { column: 'income_column' },
    expenseColumn: { column: 'expense_column' },
    notes: { column: 'notes' },
  },
})
