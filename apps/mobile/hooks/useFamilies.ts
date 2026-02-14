import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Family, FamilyDetail, Invite } from './types';

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => apiFetch<Family[]>('/families'),
  });
}

export function useFamilyDetail(familyId: string | null) {
  return useQuery({
    queryKey: ['families', familyId],
    queryFn: () => apiFetch<FamilyDetail>(`/families/${familyId}`),
    enabled: !!familyId,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; currency?: string; monthlyBudget?: number }) =>
      apiFetch<Family>('/families', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useUpdateFamily(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; currency?: string; monthlyBudget?: number; largeExpenseThreshold?: number }) =>
      apiFetch<Family>(`/families/${familyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useDeleteFamily(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/families/${familyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useJoinFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<Family>('/families/join', { method: 'POST', body: JSON.stringify({ code }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useCreateInvite(familyId: string) {
  return useMutation({
    mutationFn: () => apiFetch<Invite>(`/families/${familyId}/invites`, { method: 'POST' }),
  });
}

export function useUpdateMemberRole(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'ADMIN' | 'MEMBER' }) =>
      apiFetch(`/families/${familyId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}

export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/families/${familyId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}
