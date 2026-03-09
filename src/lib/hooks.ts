/**
 * €N€RGY - React Query hooks for all API entities
 *
 * These hooks replace direct mock data imports with real API calls.
 * Data is fetched, cached, and auto-refreshed via TanStack Query.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  subjectsApi,
  containersApi,
  counterpartiesApi,
  tagsApi,
  transactionsApi,
  recurrencesApi,
  budgetApi,
  statsApi,
  smartRulesApi,
  type TransactionListResponse,
  type BudgetPeriodWithAllocations,
} from './api'
import { snakeToCamel } from './transforms'
import type {
  Subject,
  Container,
  Counterparty,
  Tag,
  Transaction,
  Recurrence,
  SmartRule,
} from '@/types'

// ── Query keys ──────────────────────────────────────────────

export const queryKeys = {
  subjects: ['subjects'] as const,
  containers: ['containers'] as const,
  counterparties: ['counterparties'] as const,
  tags: ['tags'] as const,
  transactions: (params?: Record<string, string>) => ['transactions', params] as const,
  recurrences: ['recurrences'] as const,
  budget: ['budget'] as const,
  stats: ['stats'] as const,
  smartRules: ['smart-rules'] as const,
}

// ── Subjects ────────────────────────────────────────────────

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects,
    queryFn: async () => {
      const data = await subjectsApi.list()
      return snakeToCamel<Subject[]>(data as never)
    },
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Subject>) => subjectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects })
    },
  })
}

export function useUpdateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subject> }) =>
      subjectsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects })
    },
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subjectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects })
    },
  })
}

// ── Containers ──────────────────────────────────────────────

export function useContainers() {
  return useQuery({
    queryKey: queryKeys.containers,
    queryFn: async () => {
      const data = await containersApi.list()
      return snakeToCamel<(Container & { subjectName?: string })[]>(data as never)
    },
  })
}

export function useCreateContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Container>) => containersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.containers })
    },
  })
}

export function useUpdateContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Container> }) =>
      containersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.containers })
    },
  })
}

export function useToggleContainerPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      containersApi.update(id, { isPinned } as Partial<Container>),
    onMutate: async ({ id, isPinned }) => {
      await qc.cancelQueries({ queryKey: queryKeys.containers })
      const previous = qc.getQueryData<Container[]>(queryKeys.containers)
      qc.setQueryData<Container[]>(queryKeys.containers, (old) =>
        old?.map((c) => (c.id === id ? { ...c, isPinned } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.containers, context.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.containers })
    },
  })
}

export function useDeleteContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => containersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.containers })
    },
  })
}

// ── Counterparties ──────────────────────────────────────────

export function useCounterparties() {
  return useQuery({
    queryKey: queryKeys.counterparties,
    queryFn: async () => {
      const data = await counterpartiesApi.list()
      return snakeToCamel<Counterparty[]>(data as never)
    },
  })
}

export function useCreateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Counterparty>) => counterpartiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.counterparties })
    },
  })
}

export function useUpdateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Counterparty> }) =>
      counterpartiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.counterparties })
    },
  })
}

export function useDeleteCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => counterpartiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.counterparties })
    },
  })
}

// ── Tags ────────────────────────────────────────────────────

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const data = await tagsApi.list()
      return snakeToCamel<Tag[]>(data as never)
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Tag>) => tagsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tag> }) =>
      tagsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

// ── Transactions ────────────────────────────────────────────

export function useTransactions(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: async () => {
      const data = await transactionsApi.list(params)
      return {
        rows: snakeToCamel<Transaction[]>(data.rows as never),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
      } as TransactionListResponse & { rows: Transaction[] }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Transaction> & { tagIds?: string[] }) =>
      transactionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> & { tagIds?: string[] } }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

// ── Recurrences ─────────────────────────────────────────────

export function useRecurrences() {
  return useQuery({
    queryKey: queryKeys.recurrences,
    queryFn: async () => {
      const data = await recurrencesApi.list()
      return snakeToCamel<(Recurrence & { containerName?: string; containerColor?: string; counterpartyName?: string })[]>(data as never)
    },
  })
}

export function useCreateRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Recurrence>) => recurrencesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recurrences })
    },
  })
}

export function useUpdateRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Recurrence> }) =>
      recurrencesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recurrences })
    },
  })
}

export function useDeleteRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurrencesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recurrences })
    },
  })
}

// ── Budget ──────────────────────────────────────────────────

export function useBudgetPeriods() {
  return useQuery({
    queryKey: queryKeys.budget,
    queryFn: async () => {
      const data = await budgetApi.listPeriods()
      return snakeToCamel<BudgetPeriodWithAllocations[]>(data as never)
    },
  })
}

export function useCreateBudgetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string }) =>
      budgetApi.createPeriod(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budget })
    },
  })
}

export function useDeleteBudgetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetApi.deletePeriod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budget })
    },
  })
}

export function useCreateBudgetAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { periodId: string; tagId?: string; allocatedAmount: string; currency?: string }) =>
      budgetApi.createAllocation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budget })
    },
  })
}

export function useDeleteBudgetAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetApi.deleteAllocation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budget })
    },
  })
}

// ── Smart Rules ─────────────────────────────────────────────

export function useSmartRules() {
  return useQuery({
    queryKey: queryKeys.smartRules,
    queryFn: async () => {
      const data = await smartRulesApi.list()
      return snakeToCamel<SmartRule[]>(data as never)
    },
  })
}

export function useCreateSmartRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SmartRule>) => smartRulesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.smartRules })
    },
  })
}

export function useUpdateSmartRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SmartRule> }) =>
      smartRulesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.smartRules })
    },
  })
}

export function useDeleteSmartRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => smartRulesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.smartRules })
    },
  })
}

// ── Stats (Dashboard) ───────────────────────────────────────

interface DashboardStats {
  balances: Array<{ currency: string; total: string }>
  monthly: {
    monthlyIncome: number
    monthlyExpenses: number
    transactionCount: number
  }
  pending: {
    pendingCredits: number
    pendingDebits: number
  }
  recentTransactions: Transaction[]
  activeContainers: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const data = await statsApi.getDashboard()
      return snakeToCamel<DashboardStats>(data as never)
    },
  })
}
