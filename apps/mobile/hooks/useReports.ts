import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MemberSpending, BudgetUtilization } from './types';

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
