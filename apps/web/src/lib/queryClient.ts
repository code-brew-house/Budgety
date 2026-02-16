import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
        gcTime: 1000 * 60 * 60 * 24, // 24 hours — needed for persistence
      },
      mutations: {
        retry: 3,
      },
    },
  });
}
