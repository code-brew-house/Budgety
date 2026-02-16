'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Loader, Center } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';

const THRESHOLD = 60;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const queryClient = useQueryClient();

  const spinnerOpacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const spinnerScale = useTransform(y, [0, THRESHOLD], [0.5, 1]);

  const handleDragEnd = useCallback(async () => {
    if (y.get() >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      await queryClient.invalidateQueries();
      setIsRefreshing(false);
    }
  }, [y, isRefreshing, queryClient]);

  if (!isMobile) return <>{children}</>;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <motion.div style={{ opacity: spinnerOpacity, scale: spinnerScale }}>
        <Center py="xs">
          <Loader size="sm" />
        </Center>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y, touchAction: 'pan-x' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
