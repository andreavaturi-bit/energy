import type {
  Subject,
  Container,
  Counterparty,
  Tag,
  Transaction,
  Recurrence,
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
  update: (id: string, data: Partial<Subject>) => api.put<Subject>(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
}

// -- Containers --
export const containersApi = {
  list: () => api.get<(Container & { subject_name?: string })[]>('/containers'),
  get: (id: string) => api.get<Container>(`/containers/${id}`),
  create: (data: Partial<Container>) => api.post<Container>('/containers', data),
  update: (id: string, data: Partial<Container>) => api.put<Container>(`/containers/${id}`, data),
  delete: (id: string) => api.delete(`/containers/${id}`),
}

// -- Counterparties --
export const counterpartiesApi = {
  list: () => api.get<Counterparty[]>('/counterparties'),
  get: (id: string) => api.get<Counterparty>(`/counterparties/${id}`),
  create: (data: Partial<Counterparty>) => api.post<Counterparty>('/counterparties', data),
  update: (id: string, data: Partial<Counterparty>) => api.put<Counterparty>(`/counterparties/${id}`, data),
  delete: (id: string) => api.delete(`/counterparties/${id}`),
}

// -- Tags --
export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  get: (id: string) => api.get<Tag>(`/tags/${id}`),
  create: (data: Partial<Tag>) => api.post<Tag>('/tags', data),
  update: (id: string, data: Partial<Tag>) => api.put<Tag>(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
}

// -- Transactions --
export interface TransactionListResponse {
  rows: Transaction[]
  total: number
  limit: number
  offset: number
}

export const transactionsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<TransactionListResponse>(`/transactions${qs}`)
  },
  get: (id: string) => api.get<Transaction & { tags?: Tag[] }>(`/transactions/${id}`),
  create: (data: Partial<Transaction> & { tagIds?: string[] }) =>
    api.post<Transaction>('/transactions', data),
  batchCreate: (transactions: Partial<Transaction>[]) =>
    api.post<{ inserted: number; failed: number; total: number; errors?: string[] }>(
      '/transactions/batch',
      { transactions },
    ),
  update: (id: string, data: Partial<Transaction> & { tagIds?: string[] }) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
}

// -- Recurrences --
export const recurrencesApi = {
  list: () => api.get<Recurrence[]>('/recurrences'),
  get: (id: string) => api.get<Recurrence>(`/recurrences/${id}`),
  create: (data: Partial<Recurrence>) => api.post<Recurrence>('/recurrences', data),
  update: (id: string, data: Partial<Recurrence>) => api.put<Recurrence>(`/recurrences/${id}`, data),
  delete: (id: string) => api.delete(`/recurrences/${id}`),
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
    api.put(`/budget/${id}`, data),
  deletePeriod: (id: string) => api.delete(`/budget/${id}`),
  createAllocation: (data: { periodId: string; tagId?: string; allocatedAmount: string; currency?: string }) =>
    api.post('/budget/allocations', data),
  deleteAllocation: (id: string) => api.delete(`/budget/allocations/${id}`),
}

// -- Stats (Dashboard) --
export const statsApi = {
  getDashboard: () => api.get<Record<string, unknown>>('/stats'),
}
