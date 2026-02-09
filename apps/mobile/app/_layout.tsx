import '@/global.css';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider>
        <Slot />
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
