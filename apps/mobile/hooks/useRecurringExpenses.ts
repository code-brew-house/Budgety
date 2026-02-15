import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { RecurringExpense, PaginatedRecurringExpenses } from './types';

export function useRecurringExpenses(familyId: string | null) {
  return useQuery({
    queryKey: ['recurring-expenses', familyId],
    queryFn: () => apiFetch<PaginatedRecurringExpenses>(`/families/${familyId}/recurring-expenses`),
    enabled: !!familyId,
  });
}

export function useCreateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      description: string;
      frequency: string;
      startDate: string;
      endDate?: string;
      categoryId: string;
    }) =>
      apiFetch<RecurringExpense>(`/families/${familyId}/recurring-expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}

export function useUpdateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string; frequency?: string; endDate?: string; categoryId?: string; isActive?: boolean }) =>
      apiFetch<RecurringExpense>(`/families/${familyId}/recurring-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}

export function useDeleteRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/recurring-expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', familyId] });
    },
  });
}
