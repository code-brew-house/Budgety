import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MemberSpending, BudgetUtilization, CategorySplit, DailySpending, MonthlyTrend, TopExpenses } from './types';

export function useMemberSpending(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'member-spending', month],
    queryFn: () => apiFetch<MemberSpending>(`/families/${familyId}/reports/member-spending?month=${month}`),
    enabled: !!familyId,
  });
}

export function useBudgetUtilization(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'budget-utilization', month],
    queryFn: () => apiFetch<BudgetUtilization>(`/families/${familyId}/reports/budget-utilization?month=${month}`),
    enabled: !!familyId,
  });
}

export function useCategorySplit(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'category-split', month],
    queryFn: () => apiFetch<CategorySplit>(`/families/${familyId}/reports/category-split?month=${month}`),
    enabled: !!familyId,
  });
}

export function useDailySpending(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['reports', familyId, 'daily-spending', month],
    queryFn: () => apiFetch<DailySpending>(`/families/${familyId}/reports/daily-spending?month=${month}`),
    enabled: !!familyId,
  });
}

export function useMonthlyTrend(familyId: string | null, months = 6) {
  return useQuery({
    queryKey: ['reports', familyId, 'monthly-trend', months],
    queryFn: () => apiFetch<MonthlyTrend>(`/families/${familyId}/reports/monthly-trend?months=${months}`),
    enabled: !!familyId,
  });
}

export function useTopExpenses(familyId: string | null, month: string, limit = 5) {
  return useQuery({
    queryKey: ['reports', familyId, 'top-expenses', month, limit],
    queryFn: () => apiFetch<TopExpenses>(`/families/${familyId}/reports/top-expenses?month=${month}&limit=${limit}`),
    enabled: !!familyId,
  });
}
