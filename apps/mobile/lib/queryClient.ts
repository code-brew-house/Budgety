import { QueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
    mutations: {
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message,
        });
      },
    },
  },
});
