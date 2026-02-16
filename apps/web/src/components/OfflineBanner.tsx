'use client';

import { Alert } from '@mantine/core';
import { IconWifiOff } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Alert
            variant="light"
            color="yellow"
            icon={<IconWifiOff size={18} />}
            py="xs"
            radius={0}
          >
            You&apos;re offline. Changes will sync when you reconnect.
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
