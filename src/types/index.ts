// ============================================================
// Core domain types for €N€RGY
// These mirror the DB schema but are used in the frontend
// ============================================================

// --- Enums ---

export type SubjectType = 'person' | 'company'
export type SubjectRole = 'owner' | 'family' | 'partner' | 'other'

export type ContainerType =
  | 'bank_account'
  | 'credit_card'
  | 'trading'
  | 'crypto'
  | 'payment_service'
  | 'cash'
  | 'savings'
  | 'voucher'
  | 'other'

export type CounterpartyType = 'person' | 'company' | 'service' | 'store' | 'government' | 'other'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer_out'
  | 'transfer_in'
  | 'capital_injection'
  | 'loan_out'
  | 'loan_in'
  | 'repayment_out'
  | 'repayment_in'

export type TransactionStatus = 'completed' | 'pending' | 'projected' | 'cancelled'
export type TransactionSource = 'manual' | 'csv_import' | 'pdf_import' | 'recurring_generated'

export type TagType = 'category' | 'scope' | 'purpose' | 'custom'

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'custom'

export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

// --- Entities ---

export interface Subject {
  id: string
  type: SubjectType
  name: string
  legalForm?: string | null
  taxId?: string | null
  country: string
  role?: SubjectRole | null
  parentSubjectId?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Container {
  id: string
  subjectId: string
  name: string
  type: ContainerType
  provider?: string | null
  currency: string
  isMultiCurrency: boolean
  initialBalance: string
  billingDay?: number | null
  linkedContainerId?: string | null
  goalAmount?: string | null
  goalDescription?: string | null
  icon?: string | null
  color?: string | null
  sortOrder: number
  isActive: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
  // Computed/joined
  subject?: Subject
  currentBalance?: string
}

export interface Counterparty {
  id: string
  name: string
  type?: CounterpartyType | null
  defaultCategory?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  parentId?: string | null
  type: TagType
  color?: string | null
  icon?: string | null
  isActive: boolean
  createdAt: string
  // Computed
  children?: Tag[]
}

export interface Transaction {
  id: string
  date: string
  valueDate?: string | null
  description?: string | null
  notes?: string | null
  amount: string
  currency: string
  amountEur?: string | null
  exchangeRate?: string | null
  containerId: string
  counterpartyId?: string | null
  type: TransactionType
  transferLinkedId?: string | null
  status: TransactionStatus
  source: TransactionSource
  importBatchId?: string | null
  recurrenceId?: string | null
  splitParentId?: string | null
  sharedWithSubjectId?: string | null
  sharePercentage?: string | null
  installmentPlanId?: string | null
  installmentNumber?: number | null
  externalId?: string | null
  createdAt: string
  updatedAt: string
  // Joined
  container?: Container
  counterparty?: Counterparty
  tags?: Tag[]
  splitChildren?: Transaction[]
  transferLinked?: Transaction
  sharedWithSubject?: Subject
}

export interface Recurrence {
  id: string
  description: string
  frequency: Frequency
  intervalDays?: number | null
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  businessDaysOnly: boolean
  amount?: string | null
  amountIsEstimate: boolean
  currency: string
  containerId?: string | null
  counterpartyId?: string | null
  type: string
  sharedWithSubjectId?: string | null
  sharePercentage?: string | null
  startDate: string
  endDate?: string | null
  reminderDaysBefore?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Joined
  container?: Container
  counterparty?: Counterparty
  tags?: Tag[]
}

export interface InstallmentPlan {
  id: string
  description: string
  totalAmount: string
  currency: string
  numberOfInstallments: number
  counterpartyId?: string | null
  containerId?: string | null
  reminderDaysBefore?: number | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Joined
  installments?: Installment[]
  counterparty?: Counterparty
  container?: Container
}

export interface Installment {
  id: string
  planId: string
  installmentNumber: number
  amount: string
  dueDate: string
  status: InstallmentStatus
  transactionId?: string | null
  reminderDaysBefore?: number | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface BudgetPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  // Computed
  allocations?: BudgetAllocation[]
}

export interface BudgetAllocation {
  id: string
  periodId: string
  tagId?: string | null
  subjectId?: string | null
  allocatedAmount: string
  currency: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  // Joined
  tag?: Tag
  subject?: Subject
  // Computed
  actualAmount?: string
}

export interface ImportProfile {
  id: string
  containerId: string
  name: string
  fileType: 'csv' | 'xlsx' | 'pdf'
  delimiter: string
  dateFormat: string
  decimalSeparator: string
  thousandsSeparator: string
  encoding: string
  skipRows: number
  columnMapping: Record<string, string>
  amountInverted: boolean
  separateAmountColumns: boolean
  incomeColumn?: string | null
  expenseColumn?: string | null
  dedupColumns?: string[] | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  // Joined
  container?: Container
}

export interface ImportBatch {
  id: string
  profileId?: string | null
  containerId: string
  filename: string
  importedAt: string
  totalRows?: number | null
  importedRows?: number | null
  skippedRows?: number | null
  duplicateRows?: number | null
  status: 'processing' | 'completed' | 'failed' | 'partial'
  errorLog?: unknown
  notes?: string | null
}

export interface SavingsGoal {
  id: string
  containerId: string
  name: string
  targetAmount: string
  currency: string
  targetDate?: string | null
  currentAmount: string
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Joined
  container?: Container
}

// --- API / UI types ---

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  containerIds?: string[]
  types?: TransactionType[]
  statuses?: TransactionStatus[]
  tagIds?: string[]
  counterpartyIds?: string[]
  subjectIds?: string[]
  search?: string
  minAmount?: number
  maxAmount?: number
  currency?: string
  source?: TransactionSource
  hasSharing?: boolean
}

export interface DashboardSummary {
  totalBalance: number
  totalBalanceByCurrency: Record<string, number>
  monthlyIncome: number
  monthlyExpenses: number
  monthlyNet: number
  pendingCredits: number
  pendingDebits: number
  upcomingReminders: number
  containerBalances: Array<{
    container: Container
    balance: number
  }>
}

export interface CategoryBreakdown {
  tagId: string
  tagName: string
  tagColor?: string
  total: number
  percentage: number
  count: number
}

export interface MonthlyTrend {
  month: string  // YYYY-MM
  income: number
  expenses: number
  net: number
  transfers: number
}

export interface ProjectionItem {
  date: string
  description: string
  amount: number
  isEstimate: boolean
  recurrenceId?: string
  runningBalance: number
}
