'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Title,
  Text,
  Group,
  Stack,
  Select,
  Button,
  Modal,
  Skeleton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExpenseListSkeleton } from '@/components/skeletons/ExpenseListSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyDetail } from '@/hooks/useFamilies';
import { useInfiniteExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { SwipeableExpenseCard } from '@/components/SwipeableExpenseCard';

export default function ExpensesPage() {
  const router = useRouter();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: family } = useFamilyDetail(activeFamilyId);
  const { data: categories } = useCategories(activeFamilyId);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [sort, setSort] = useState<string>('createdAt');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startDate = dateRange[0] ?? undefined;
  const endDate = dateRange[1] ?? undefined;

  const filters = {
    limit: 20,
    sort: sort as 'date' | 'createdAt',
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteExpenses(activeFamilyId, filters);

  const deleteMutation = useDeleteExpense(activeFamilyId ?? '');

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const allExpenses = data?.pages.flatMap((p) => p.data) ?? [];
  const largeThreshold = family?.largeExpenseThreshold ?? 0;

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        notifications.show({ title: 'Deleted', message: 'Expense deleted successfully', color: 'green' });
        setDeleteId(null);
      },
      onError: () => {
        notifications.show({ title: 'Error', message: 'Failed to delete expense', color: 'red' });
      },
    });
  };

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family to view expenses.</Text>
      </Stack>
    );
  }

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Expenses</Title>
        <Button component={Link} href="/expenses/add" leftSection={<IconPlus size={16} />} size="sm">
          Add
        </Button>
      </Group>

      <Group grow wrap="wrap">
        <Select
          placeholder="All categories"
          data={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          searchable
          size="sm"
        />
        <DatePickerInput
          type="range"
          placeholder="Date range"
          value={dateRange}
          onChange={setDateRange}
          clearable
          size="sm"
        />
        <Select
          placeholder="Sort"
          data={[
            { value: 'createdAt', label: 'Newest first' },
            { value: 'date', label: 'By date' },
          ]}
          value={sort}
          onChange={(v) => setSort(v ?? 'createdAt')}
          size="sm"
        />
      </Group>

      {isPending ? (
        <ExpenseListSkeleton />
      ) : allExpenses.length === 0 ? (
        <EmptyState type="expenses" />
      ) : (
        <Stack gap="xs">
          {allExpenses.map((expense) => (
              <SwipeableExpenseCard
                key={expense.id}
                expense={expense}
                isLargeExpense={largeThreshold > 0 && expense.amount >= largeThreshold}
                onClick={(id) => router.push(`/expenses/${id}`)}
                onDelete={(id) => setDeleteId(id)}
              />
          ))}

          <div ref={loadMoreRef} style={{ height: 1 }} />
          {isFetchingNextPage && (
            <Stack gap="xs">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={60} />
              ))}
            </Stack>
          )}
        </Stack>
      )}

      <Modal opened={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense" centered>
        <Text size="sm" mb="lg">Are you sure you want to delete this expense? This action cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="red" onClick={handleDelete} loading={deleteMutation.isPending}>Delete</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
