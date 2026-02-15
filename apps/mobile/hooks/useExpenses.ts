import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Expense, PaginatedExpenses } from './types';

interface ExpenseFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  createdById?: string;
  sort?: 'date' | 'createdAt';
}

export function useExpenses(familyId: string | null, filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.createdById) params.set('createdById', filters.createdById);
  if (filters.sort) params.set('sort', filters.sort);

  const query = params.toString();

  return useQuery({
    queryKey: ['expenses', familyId, filters],
    queryFn: () => apiFetch<PaginatedExpenses>(`/families/${familyId}/expenses${query ? `?${query}` : ''}`),
    enabled: !!familyId,
  });
}

export function useInfiniteExpenses(familyId: string | null, filters: Omit<ExpenseFilters, 'page'> = {}) {
  const buildParams = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.createdById) params.set('createdById', filters.createdById);
    if (filters.sort) params.set('sort', filters.sort);
    return params.toString();
  };

  return useInfiniteQuery({
    queryKey: ['expenses-infinite', familyId, filters],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<PaginatedExpenses>(`/families/${familyId}/expenses?${buildParams(pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return totalFetched < lastPage.meta.total ? allPages.length + 1 : undefined;
    },
    enabled: !!familyId,
  });
}

export function useExpense(familyId: string | null, expenseId: string | null) {
  return useQuery({
    queryKey: ['expenses', familyId, expenseId],
    queryFn: () => apiFetch<Expense>(`/families/${familyId}/expenses/${expenseId}`),
    enabled: !!familyId && !!expenseId,
  });
}

export function useCreateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description: string; date: string; categoryId: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['expenses-infinite', familyId] });
      await queryClient.cancelQueries({ queryKey: ['expenses', familyId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useUpdateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string; date?: string; categoryId?: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useDeleteExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/expenses/${id}`, { method: 'DELETE' }),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses-infinite', familyId] });
      const previousData = queryClient.getQueriesData({ queryKey: ['expenses-infinite', familyId] });
      queryClient.setQueriesData(
        { queryKey: ['expenses-infinite', familyId] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.filter((e: Expense) => e.id !== deletedId),
            })),
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
