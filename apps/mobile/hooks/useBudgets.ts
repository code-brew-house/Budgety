import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BudgetData } from './types';

export function useBudgets(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['budgets', familyId, month],
    queryFn: () => apiFetch<BudgetData>(`/families/${familyId}/budgets?month=${month}`),
    enabled: !!familyId,
  });
}

export function useSetOverallBudget(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { monthlyBudget: number }) =>
      apiFetch(`/families/${familyId}/budgets`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useUpsertCategoryBudgets(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string; budgets: { categoryId: string; amount: number }[] }) =>
      apiFetch(`/families/${familyId}/budgets/categories`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
