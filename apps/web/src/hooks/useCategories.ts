import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';

export function useCategories(familyId: string | null) {
  return useQuery({
    queryKey: ['categories', familyId],
    queryFn: () => apiFetch<Category[]>(`/families/${familyId}/categories`),
    enabled: !!familyId,
  });
}

export function useCreateCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; icon?: string }) =>
      apiFetch<Category>(`/families/${familyId}/categories`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories', familyId] }); },
  });
}

export function useUpdateCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; icon?: string }) =>
      apiFetch<Category>(`/families/${familyId}/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories', familyId] }); },
  });
}

export function useDeleteCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories', familyId] }); },
  });
}
