'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Notifications } from '@mantine/notifications';
import { makeQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Notifications position="top-right" />
      {children}
    </QueryClientProvider>
  );
}
