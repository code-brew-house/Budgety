import { Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconReceipt, IconUsers, IconCategory } from '@tabler/icons-react';
import Link from 'next/link';

interface EmptyStateProps {
  type: 'expenses' | 'families' | 'categories';
}

const config = {
  expenses: {
    icon: IconReceipt,
    title: 'No expenses yet',
    description: 'Start tracking your spending by adding your first expense.',
    action: { label: 'Add Expense', href: '/expenses/add' },
  },
  families: {
    icon: IconUsers,
    title: 'No family yet',
    description: 'Create or join a family to start tracking budgets together.',
    action: { label: 'Go to Settings', href: '/settings/family' },
  },
  categories: {
    icon: IconCategory,
    title: 'Using default categories',
    description: 'Create custom categories to better organize your expenses.',
    action: { label: 'Manage Categories', href: '/settings/categories' },
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const { icon: Icon, title, description, action } = config[type];

  return (
    <Stack align="center" py="xl" gap="md">
      <ThemeIcon size={64} radius="xl" variant="light" color="gray">
        <Icon size={32} stroke={1.5} />
      </ThemeIcon>
      <Text fw={600} size="lg">{title}</Text>
      <Text c="dimmed" ta="center" maw={300}>{description}</Text>
      <Button component={Link} href={action.href} variant="light">
        {action.label}
      </Button>
    </Stack>
  );
}
