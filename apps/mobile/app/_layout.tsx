import '@/global.css';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/lib/queryClient';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider>
          <Slot />
          <OfflineBanner />
          <Toast />
        </GluestackUIProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
