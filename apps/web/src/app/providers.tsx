'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Notifications } from '@mantine/notifications';
import { makeQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [persister] = useState(() =>
    typeof window !== 'undefined'
      ? createSyncStoragePersister({ storage: window.localStorage })
      : undefined,
  );

  if (!persister) {
    // SSR fallback — provide QueryClient without persistence
    return (
      <QueryClientProvider client={queryClient}>
        <Notifications position="top-right" />
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      <Notifications position="top-right" />
      {children}
    </PersistQueryClientProvider>
  );
}
