import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  integer,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ============================================================
// SOGGETTI (Subjects) - Chi possiede i contenitori
// Persone fisiche e aziende
// ============================================================
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type', { enum: ['person', 'company'] }).notNull(),
  name: text('name').notNull(),
  // Company-specific
  legalForm: text('legal_form'),       // SRLS, SRL, LTD, etc.
  taxId: text('tax_id'),               // P.IVA or CF
  country: text('country').default('IT'),
  // Person-specific
  role: text('role', { enum: ['owner', 'family', 'partner', 'other'] }),
  // Relationships
  parentSubjectId: uuid('parent_subject_id'),
  // Metadata
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// CONTENITORI (Containers) - Dove sta il denaro
// Conti bancari, trading, crypto, carte, cash, etc.
// ============================================================
export const containers = pgTable('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: [
      'bank_account',    // Conto corrente, conto online
      'credit_card',     // American Express, etc.
      'trading',         // Interactive Brokers, Trade Republic, etc.
      'crypto',          // Binance, Coinbase, MetaMask, etc.
      'payment_service', // PayPal, Satispay
      'cash',            // Contanti
      'savings',         // Fondo ca$$a, NY Piggy
      'voucher',         // Buoni pasto
      'other',
    ],
  }).notNull(),
  provider: text('provider'),          // e.g. "Intesa Sanpaolo", "Binance"
  currency: text('currency').default('EUR').notNull(),
  isMultiCurrency: boolean('is_multi_currency').default(false).notNull(),
  initialBalance: decimal('initial_balance', { precision: 15, scale: 4 }).default('0'),
  // Credit card specifics
  billingDay: integer('billing_day'),
  linkedContainerId: uuid('linked_container_id'), // carta -> conto corrente
  // Savings goal
  goalAmount: decimal('goal_amount', { precision: 15, scale: 4 }),
  goalDescription: text('goal_description'),
  // Display
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').default(0),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_containers_subject').on(table.subjectId),
  index('idx_containers_type').on(table.type),
])

// ============================================================
// CONTROPARTI (Counterparties) - Con chi transigo
// Persone, aziende, servizi, negozi, enti
// ============================================================
export const counterparties = pgTable('counterparties', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['person', 'company', 'service', 'store', 'government', 'other'],
  }),
  defaultCategory: text('default_category'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// TAG - Categorie, ambiti, finalita'
// Struttura gerarchica con tipi
// ============================================================
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  parentId: uuid('parent_id'),
  type: text('type', {
    enum: [
      'category',   // Spesa, Affitto, Bollette, etc.
      'scope',      // Personale, Familiare, Aziendale, VS/Opzionetika
      'purpose',    // Da dividere con Mirko, Versamento c/capitale, etc.
      'custom',
    ],
  }).notNull(),
  color: text('color'),
  icon: text('icon'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_tags_name_type').on(table.name, table.type),
])

// ============================================================
// TRANSAZIONI - Il cuore del sistema
// Ogni movimento di denaro, reale o previsto
// ============================================================
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // QUANDO
  date: date('date').notNull(),
  valueDate: date('value_date'),             // Data valuta

  // COSA
  description: text('description'),
  notes: text('notes'),

  // IMPORTO (valuta originale)
  amount: decimal('amount', { precision: 15, scale: 4 }).notNull(),
  currency: text('currency').default('EUR').notNull(),

  // IMPORTO in EUR (per reporting consolidato)
  amountEur: decimal('amount_eur', { precision: 15, scale: 4 }),
  exchangeRate: decimal('exchange_rate', { precision: 12, scale: 6 }),

  // DOVE (contenitore)
  containerId: uuid('container_id').notNull().references(() => containers.id),

  // CHI (controparte)
  counterpartyId: uuid('counterparty_id').references(() => counterparties.id),

  // TIPO
  type: text('type', {
    enum: [
      'income',             // Entrata
      'expense',            // Uscita
      'transfer_out',       // Uscita per trasferimento
      'transfer_in',        // Entrata per trasferimento
      'capital_injection',  // Versamento c/capitale in altra societa'
      'loan_out',           // Prestito dato
      'loan_in',            // Prestito ricevuto
      'repayment_out',      // Rimborso dato
      'repayment_in',       // Rimborso ricevuto
    ],
  }).notNull(),

  // TRASFERIMENTI - Link bidirezionale fra coppie
  transferLinkedId: uuid('transfer_linked_id'),

  // STATO
  status: text('status', {
    enum: ['completed', 'pending', 'projected', 'cancelled'],
  }).default('completed').notNull(),

  // ORIGINE DATO
  source: text('source', {
    enum: ['manual', 'csv_import', 'pdf_import', 'recurring_generated'],
  }).default('manual').notNull(),
  importBatchId: uuid('import_batch_id'),

  // RICORRENZA (template da cui e' stata generata)
  recurrenceId: uuid('recurrence_id'),

  // SPLIT - Transazione padre/figlio
  splitParentId: uuid('split_parent_id'),

  // COST SHARING (divisione con socio)
  sharedWithSubjectId: uuid('shared_with_subject_id').references(() => subjects.id),
  sharePercentage: decimal('share_percentage', { precision: 5, scale: 2 }),

  // RATEIZZAZIONE
  installmentPlanId: uuid('installment_plan_id'),
  installmentNumber: integer('installment_number'),

  // DEDUPLICAZIONE
  externalId: text('external_id'),
  externalHash: text('external_hash'),

  // META
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_transactions_date').on(table.date),
  index('idx_transactions_container').on(table.containerId),
  index('idx_transactions_type').on(table.type),
  index('idx_transactions_status').on(table.status),
  index('idx_transactions_counterparty').on(table.counterpartyId),
  index('idx_transactions_split_parent').on(table.splitParentId),
  index('idx_transactions_transfer_linked').on(table.transferLinkedId),
  index('idx_transactions_recurrence').on(table.recurrenceId),
  index('idx_transactions_import_batch').on(table.importBatchId),
  index('idx_transactions_date_container').on(table.date, table.containerId),
  index('idx_transactions_external').on(table.externalId, table.containerId),
])

// ============================================================
// TRANSACTION_TAGS - Relazione N:N transazione <-> tag
// ============================================================
export const transactionTags = pgTable('transaction_tags', {
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.transactionId, table.tagId] }),
])

// ============================================================
// RICORRENZE (Recurrences) - Template per transazioni cicliche
// ============================================================
export const recurrences = pgTable('recurrences', {
  id: uuid('id').defaultRandom().primaryKey(),
  description: text('description').notNull(),

  // Pattern ciclico
  frequency: text('frequency', {
    enum: [
      'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly',
      'quarterly', 'semi_annual', 'annual', 'custom',
    ],
  }).notNull(),
  intervalDays: integer('interval_days'),      // Per frequenza custom (es. ogni 17 giorni)
  dayOfMonth: integer('day_of_month'),         // Es. il 20 del mese
  dayOfWeek: integer('day_of_week'),           // 0=Lun, 6=Dom
  businessDaysOnly: boolean('business_days_only').default(false).notNull(),

  // Template della transazione
  amount: decimal('amount', { precision: 15, scale: 4 }),
  amountIsEstimate: boolean('amount_is_estimate').default(false).notNull(),
  currency: text('currency').default('EUR').notNull(),
  containerId: uuid('container_id').references(() => containers.id),
  counterpartyId: uuid('counterparty_id').references(() => counterparties.id),
  type: text('type').notNull(),  // income, expense, etc.

  // Cost sharing template
  sharedWithSubjectId: uuid('shared_with_subject_id').references(() => subjects.id),
  sharePercentage: decimal('share_percentage', { precision: 5, scale: 2 }),

  // Periodo di validita'
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),                   // NULL = indefinito

  // Reminder
  reminderDaysBefore: integer('reminder_days_before'),

  // Stato
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// RECURRENCE_TAGS - Tag associati al template ricorrenza
// ============================================================
export const recurrenceTags = pgTable('recurrence_tags', {
  recurrenceId: uuid('recurrence_id').notNull().references(() => recurrences.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.recurrenceId, table.tagId] }),
])

// ============================================================
// PIANI DI RATEIZZAZIONE (Installment Plans)
// F24 rateizzati, multe, etc.
// ============================================================
export const installmentPlans = pgTable('installment_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  description: text('description').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 4 }).notNull(),
  currency: text('currency').default('EUR').notNull(),
  numberOfInstallments: integer('number_of_installments').notNull(),
  counterpartyId: uuid('counterparty_id').references(() => counterparties.id),
  containerId: uuid('container_id').references(() => containers.id),
  // Reminder
  reminderDaysBefore: integer('reminder_days_before'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// SINGOLE RATE (Installments)
// ============================================================
export const installments = pgTable('installments', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => installmentPlans.id, { onDelete: 'cascade' }),
  installmentNumber: integer('installment_number').notNull(),
  amount: decimal('amount', { precision: 15, scale: 4 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: text('status', {
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
  }).default('pending').notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  reminderDaysBefore: integer('reminder_days_before'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_installments_plan').on(table.planId),
  index('idx_installments_due_date').on(table.dueDate),
  index('idx_installments_status').on(table.status),
])

// ============================================================
// BUDGET - Periodi e allocazioni
// ============================================================
export const budgetPeriods = pgTable('budget_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const budgetAllocations = pgTable('budget_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  periodId: uuid('period_id').notNull().references(() => budgetPeriods.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').references(() => tags.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 4 }).notNull(),
  currency: text('currency').default('EUR').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_budget_allocations_period').on(table.periodId),
  index('idx_budget_allocations_tag').on(table.tagId),
])

// ============================================================
// OBIETTIVI DI RISPARMIO (Savings Goals)
// ============================================================
export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  containerId: uuid('container_id').notNull().references(() => containers.id),
  name: text('name').notNull(),
  targetAmount: decimal('target_amount', { precision: 15, scale: 4 }).notNull(),
  currency: text('currency').default('EUR').notNull(),
  targetDate: date('target_date'),
  currentAmount: decimal('current_amount', { precision: 15, scale: 4 }).default('0'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// PROFILI DI IMPORTAZIONE - Config per ogni conto/formato
// ============================================================
export const importProfiles = pgTable('import_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  containerId: uuid('container_id').notNull().references(() => containers.id),
  name: text('name').notNull(),
  fileType: text('file_type', { enum: ['csv', 'xlsx', 'pdf'] }).notNull(),
  // CSV/XLSX config
  delimiter: text('delimiter').default(','),
  dateFormat: text('date_format').default('DD/MM/YYYY'),
  decimalSeparator: text('decimal_separator').default(','),
  thousandsSeparator: text('thousands_separator').default('.'),
  encoding: text('encoding').default('UTF-8'),
  skipRows: integer('skip_rows').default(0),
  // Column mapping: { date: "Data", description: "Descrizione", amount: "Importo", ... }
  columnMapping: jsonb('column_mapping').notNull(),
  // Regole di trasformazione importo (es: Amex ha importi invertiti)
  amountInverted: boolean('amount_inverted').default(false),
  // Separare entrate/uscite in colonne diverse?
  separateAmountColumns: boolean('separate_amount_columns').default(false),
  incomeColumn: text('income_column'),
  expenseColumn: text('expense_column'),
  // Dedup
  dedupColumns: text('dedup_columns').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================================
// BATCH DI IMPORTAZIONE - Log di ogni import
// ============================================================
export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => importProfiles.id),
  containerId: uuid('container_id').notNull().references(() => containers.id),
  filename: text('filename').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
  totalRows: integer('total_rows'),
  importedRows: integer('imported_rows'),
  skippedRows: integer('skipped_rows'),
  duplicateRows: integer('duplicate_rows'),
  status: text('status', {
    enum: ['processing', 'completed', 'failed', 'partial'],
  }).default('completed').notNull(),
  errorLog: jsonb('error_log'),
  notes: text('notes'),
})

// ============================================================
// TASSI DI CAMBIO (Exchange Rates) - Cache
// ============================================================
export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: decimal('rate', { precision: 12, scale: 6 }).notNull(),
  date: date('date').notNull(),
  source: text('source').default('manual'),
}, (table) => [
  uniqueIndex('idx_exchange_rates_unique').on(
    table.baseCurrency,
    table.targetCurrency,
    table.date,
  ),
])

// ============================================================
// REMINDER - Notifiche e promemoria
// ============================================================
export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Cosa notificare
  title: text('title').notNull(),
  description: text('description'),
  // Collegamento (uno di questi)
  recurrenceId: uuid('recurrence_id').references(() => recurrences.id, { onDelete: 'cascade' }),
  installmentId: uuid('installment_id').references(() => installments.id, { onDelete: 'cascade' }),
  // Quando
  dueDate: date('due_date').notNull(),
  reminderDate: date('reminder_date').notNull(),   // dueDate - N giorni
  // Stato
  status: text('status', {
    enum: ['pending', 'sent', 'dismissed'],
  }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_reminders_date').on(table.reminderDate),
  index('idx_reminders_status').on(table.status),
])
