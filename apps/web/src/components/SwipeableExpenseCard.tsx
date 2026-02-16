'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Paper, Group, Stack, Text, ThemeIcon, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import type { Expense } from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatCurrency } from '@/lib/formatINR';
import dayjs from 'dayjs';

const DELETE_THRESHOLD = -80;

interface SwipeableExpenseCardProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  isLargeExpense?: boolean;
}

export function SwipeableExpenseCard({ expense, onDelete, onClick, isLargeExpense }: SwipeableExpenseCardProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const constraintsRef = useRef(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < DELETE_THRESHOLD) {
      onDelete(expense.id);
    }
  };

  const card = (
    <Paper
      p="md"
      withBorder
      style={{ cursor: 'pointer', borderLeft: isLargeExpense ? '3px solid var(--mantine-color-red-5)' : undefined }}
      onClick={() => onClick(expense.id)}
    >
      <Group wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="xl">
          <CategoryIcon name={expense.category.icon} size={20} />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text fw={500} size="sm" lineClamp={1}>{expense.description}</Text>
          <Text size="xs" c="dimmed">
            {expense.category.name} · {dayjs(expense.date).format('DD MMM')}
          </Text>
        </Stack>
        <Text fw={600} size="sm">{formatCurrency(expense.amount)}</Text>
      </Group>
    </Paper>
  );

  if (!isMobile) return card;

  return (
    <div ref={constraintsRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          paddingRight: 16,
          opacity: deleteOpacity,
        }}
      >
        <ActionIcon color="red" variant="filled" size="lg" radius="xl">
          <IconTrash size={18} />
        </ActionIcon>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, position: 'relative', zIndex: 1 }}
      >
        {card}
      </motion.div>
    </div>
  );
}
