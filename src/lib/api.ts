import type {
  Subject,
  Container,
  Counterparty,
  Tag,
  Transaction,
  Recurrence,
  SmartRule,
} from '@/types'

// ── Base URL: /api served by Vercel serverless functions ──
const API_BASE = '/api'

// ── Generic request helper ──────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = ''
    try {
      const parsed = JSON.parse(text)
      message = parsed.message || parsed.errorMessage || parsed.error || ''
    } catch {
      message = text.slice(0, 200)
    }
    throw new Error(message || `API error: ${res.status} ${res.statusText}`)
  }

  // 204 No Content
  if (res.status === 204) return null as T

  const json = await res.json()
  // API wraps responses in { data: ... }
  return json.data !== undefined ? json.data : json
}

// ── Low-level methods ───────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

// ── Typed resource helpers ──────────────────────────────────

// -- Subjects --
export const subjectsApi = {
  list: () => api.get<Subject[]>('/subjects'),
  get: (id: string) => api.get<Subject>(`/subjects/${id}`),
  create: (data: Partial<Subject>) => api.post<Subject>('/subjects', data),
  update: (id: string, data: Partial<Subject>) =>
    api.post<Subject>('/subjects', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/subjects', { _action: 'delete', id }),
}

// -- Containers --
export const containersApi = {
  list: () => api.get<(Container & { subject_name?: string })[]>('/containers'),
  get: (id: string) => api.get<Container>(`/containers/${id}`),
  create: (data: Partial<Container>) => api.post<Container>('/containers', data),
  update: (id: string, data: Partial<Container>) =>
    api.post<Container>('/containers', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/containers', { _action: 'delete', id }),
}

// -- Counterparties --
export const counterpartiesApi = {
  list: () => api.get<Counterparty[]>('/counterparties'),
  get: (id: string) => api.get<Counterparty>(`/counterparties/${id}`),
  create: (data: Partial<Counterparty>) => api.post<Counterparty>('/counterparties', data),
  update: (id: string, data: Partial<Counterparty>) =>
    api.post<Counterparty>('/counterparties', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/counterparties', { _action: 'delete', id }),
}

// -- Tags --
export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  get: (id: string) => api.get<Tag>(`/tags/${id}`),
  create: (data: Partial<Tag>) => api.post<Tag>('/tags', data),
  update: (id: string, data: Partial<Tag>) =>
    api.post<Tag>('/tags', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/tags', { _action: 'delete', id }),
}

// -- Transactions --
export interface TransactionListResponse {
  rows: Transaction[]
  total: number
  limit: number
  offset: number
}

export interface TransferPayload {
  date: string
  description?: string | null
  amount: string
  currency?: string
  fromContainerId: string
  toContainerId: string
  status?: string
  source?: string
  notes?: string | null
}

export const transactionsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<TransactionListResponse>(`/transactions${qs}`)
  },
  get: (id: string) => api.post<Transaction & { tags?: Tag[] }>(
    '/transactions', { _action: 'get', id }),
  create: (data: Partial<Transaction> & { tagIds?: string[] }) =>
    api.post<Transaction>('/transactions', data),
  batchCreate: (transactions: Partial<Transaction>[]) =>
    api.post<{ inserted: number; failed: number; skippedDuplicates: number; total: number; errors?: string[] }>(
      '/transactions?action=batch',
      { transactions },
    ),
  update: (id: string, data: Partial<Transaction> & { tagIds?: string[] }) =>
    api.post<Transaction>('/transactions', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/transactions', { _action: 'delete', id }),
  /** Create a transfer pair (transfer_out + transfer_in) atomically */
  createTransfer: (data: TransferPayload) =>
    api.post<{ transferOut: Transaction; transferIn: Transaction }>(
      '/transactions',
      { ...data, _action: 'transfer' },
    ),
  /** Update both sides of a transfer pair */
  updateTransfer: (id: string, data: TransferPayload) =>
    api.post<{ updated: boolean }>(
      '/transactions',
      { ...data, _action: 'update-transfer', id },
    ),
  /** Check which external_hashes already exist in DB for a container (dedup) */
  checkHashes: (containerId: string, hashes: string[]) =>
    api.post<{ existingHashes: string[] }>(
      '/transactions?action=check-hashes',
      { containerId, hashes },
    ),
  /** Find manual transactions that could match imported ones (reconciliation) */
  findMatches: (containerId: string, candidates: Array<{ date: string; amount: number; description: string }>) =>
    api.post<{ manualTransactions: Array<Record<string, unknown>> }>(
      '/transactions?action=find-matches',
      { containerId, candidates },
    ),
  /** Reconcile: keep one transaction, remove the other, copy dedup fields */
  reconcile: (keepId: string, removeId: string) =>
    api.post<{ reconciled: boolean }>(
      '/transactions?action=reconcile',
      { keepId, removeId },
    ),
  /** Reconcile multiple pairs at once */
  reconcileBulk: (pairs: Array<{ keepId: string; removeId: string }>) =>
    api.post<{ reconciled: number; errors?: string[] }>(
      '/transactions?action=reconcile-bulk',
      { pairs },
    ),
}

// -- Recurrences --
export interface DetectedPattern {
  description: string
  counterpartyId: string | null
  counterpartyName: string | null
  containerId: string
  containerName: string | null
  type: string
  frequency: string
  dayOfMonth: number | null
  dayOfWeek: number | null
  avgAmount: number
  medianAmount: number
  amountVariance: number
  amountIsEstimate: boolean
  confidence: number
  occurrences: number
  transactionIds: string[]
  lastDate: string
}

export const recurrencesApi = {
  list: () => api.get<Recurrence[]>('/recurrences'),
  get: (id: string) => api.get<Recurrence>(`/recurrences/${id}`),
  create: (data: Partial<Recurrence>) => api.post<Recurrence>('/recurrences', data),
  update: (id: string, data: Partial<Recurrence>) =>
    api.post<Recurrence>('/recurrences', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/recurrences', { _action: 'delete', id }),
  /** Auto-detect recurring patterns from transaction history */
  detect: (params?: { dateFrom?: string; dateTo?: string; containerId?: string; minOccurrences?: number }) =>
    api.post<{ patterns: DetectedPattern[] }>('/recurrences', { _action: 'detect', ...params }),
  /** Batch create recurrences from detected patterns and link historical transactions */
  createBatch: (recurrences: Array<Record<string, unknown>>) =>
    api.post<{ created: number; ids: string[]; errors?: string[] }>('/recurrences', { _action: 'create-batch', recurrences }),
}

// -- Budget --
export interface BudgetPeriodWithAllocations {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  allocations: Array<{
    id: string
    period_id: string
    tag_id: string | null
    allocated_amount: string
    currency: string
    tag_name?: string
    tag_color?: string
  }>
}

export const budgetApi = {
  listPeriods: () => api.get<BudgetPeriodWithAllocations[]>('/budget'),
  getPeriod: (id: string) => api.get<BudgetPeriodWithAllocations>(`/budget/${id}`),
  createPeriod: (data: { name: string; startDate: string; endDate: string }) =>
    api.post('/budget', data),
  updatePeriod: (id: string, data: Record<string, unknown>) =>
    api.post('/budget', { ...data, _action: 'update', id }),
  deletePeriod: (id: string) => api.post<{ deleted: boolean }>('/budget', { _action: 'delete', id }),
  createAllocation: (data: { periodId: string; tagId?: string; allocatedAmount: string; currency?: string }) =>
    api.post('/budget/allocations', data),
  deleteAllocation: (id: string) =>
    api.post<{ deleted: boolean }>('/budget', { _action: 'delete-allocation', id }),
}

// -- Smart Rules --
export interface AutoTagResult {
  applied: number
  matches: Array<{ transactionId: string; ruleId: string; ruleName: string; tagId: string; description: string }>
  dryRun: boolean
  totalUntagged: number
  totalRules: number
}

export interface RuleSuggestion {
  tagId: string
  tagName: string
  tagColor: string
  type: 'counterparty' | 'keyword' | 'amount_range'
  pattern: string
  confidence: number
  exampleCount: number
  ruleName: string
}

export const smartRulesApi = {
  list: () => api.get<SmartRule[]>('/smart-rules'),
  create: (data: Partial<SmartRule>) => api.post<SmartRule>('/smart-rules', data),
  update: (id: string, data: Partial<SmartRule>) =>
    api.post<{ updated: boolean }>('/smart-rules', { ...data, _action: 'update', id }),
  delete: (id: string) => api.post<{ deleted: boolean }>('/smart-rules', { _action: 'delete', id }),
  autoTag: (dryRun = false, limit = 500) =>
    api.post<AutoTagResult>('/smart-rules', { _action: 'auto-tag', dryRun, limit }),
  suggestRules: () =>
    api.post<{ suggestions: RuleSuggestion[] }>('/smart-rules', { _action: 'suggest-rules' }),
}

// -- Stats (Dashboard) --
export interface TagBreakdownItem {
  tagId: string | null
  tagName: string
  tagColor: string
  total: number
  count: number
  percentage: number
}

export interface MonthlyTrendItem {
  month: string
  income: number
  expenses: number
  net: number
}

export interface BurningRateStats {
  dailyExpense: number
  dailyIncome: number
  savingsRate: number
  autonomyDays: number
  totalBalance: number
  periodDays: number
}

export const statsApi = {
  getDashboard: () => api.get<Record<string, unknown>>('/stats'),
  getByTag: (params?: { dateFrom?: string; dateTo?: string; containerId?: string; tagType?: string; direction?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as string[][]).toString() : ''
    return api.get<{ breakdown: TagBreakdownItem[]; grandTotal: number; transactionCount: number }>(`/stats/by-tag${qs}`)
  },
  getMonthlyTrend: (params?: { months?: number; containerId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    ).toString() : ''
    return api.get<{ trend: MonthlyTrendItem[] }>(`/stats/monthly-trend${qs}`)
  },
  getBurningRate: (params?: { days?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    ).toString() : ''
    return api.get<BurningRateStats>(`/stats/burning-rate${qs}`)
  },
}
