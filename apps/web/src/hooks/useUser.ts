import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface User {
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  createdAt: string;
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => apiFetch<User>('/users/me'),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { displayName?: string; avatarUrl?: string }) =>
      apiFetch<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user'] }); },
  });
}
