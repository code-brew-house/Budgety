'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  NumberInput,
  Button,
  ActionIcon,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilies } from '@/hooks/useFamilies';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets, useSetOverallBudget, useUpsertCategoryBudgets } from '@/hooks/useBudgets';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function navigateMonth(month: string, direction: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y!, m! - 1 + direction);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y!, m! - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function BudgetPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: families } = useFamilies();
  const activeFamily = families?.find((f) => f.id === activeFamilyId);
  const [month, setMonth] = useState(getCurrentMonth);
  const { data: categories } = useCategories(activeFamilyId);
  const { data: budgetData, isLoading } = useBudgets(activeFamilyId, month);

  const [overallBudget, setOverallBudget] = useState<number | string>('');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number | string>>({});

  const setOverall = useSetOverallBudget(activeFamilyId ?? '');
  const upsertCategory = useUpsertCategoryBudgets(activeFamilyId ?? '');

  // Sync state when budget data loads
  useEffect(() => {
    if (activeFamily) {
      setOverallBudget(activeFamily.monthlyBudget ?? '');
    }
  }, [activeFamily]);

  useEffect(() => {
    if (budgetData && categories) {
      const map: Record<string, number | string> = {};
      for (const cat of categories) {
        const existing = budgetData.categoryBudgets.find((b) => b.categoryId === cat.id);
        map[cat.id] = existing?.amount ?? '';
      }
      setCategoryBudgets(map);
    }
  }, [budgetData, categories]);

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family to manage budgets.</Text>
      </Stack>
    );
  }

  const handleSaveOverall = () => {
    const val = typeof overallBudget === 'string' ? parseFloat(overallBudget) : overallBudget;
    if (!val || isNaN(val)) return;
    setOverall.mutate(
      { monthlyBudget: val },
      {
        onSuccess: () => {
          notifications.show({ title: 'Budget saved', message: 'Overall budget updated.', color: 'green' });
        },
      },
    );
  };

  const handleSaveCategoryBudgets = () => {
    const budgets = Object.entries(categoryBudgets)
      .filter(([, v]) => v !== '' && !isNaN(Number(v)))
      .map(([categoryId, amount]) => ({
        categoryId,
        amount: Number(amount),
      }));
    if (!budgets.length) return;
    upsertCategory.mutate(
      { month, budgets },
      {
        onSuccess: () => {
          notifications.show({ title: 'Budgets saved', message: 'Category budgets updated.', color: 'green' });
        },
      },
    );
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Budget</Title>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => setMonth((m) => navigateMonth(m, -1))}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={500} size="sm" miw={140} ta="center">
            {formatMonthLabel(month)}
          </Text>
          <ActionIcon variant="subtle" onClick={() => setMonth((m) => navigateMonth(m, 1))}>
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Overall Budget */}
      <Card withBorder>
        <Text fw={500} mb="sm">Overall Monthly Budget</Text>
        <Group>
          <NumberInput
            prefix="₹"
            thousandSeparator=","
            placeholder="0"
            value={overallBudget}
            onChange={setOverallBudget}
            min={0}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSaveOverall} loading={setOverall.isPending}>
            Save
          </Button>
        </Group>
      </Card>

      {/* Per-category Budgets */}
      <Card withBorder>
        <Text fw={500} mb="sm">Category Budgets</Text>
        {isLoading ? (
          <Loader size="sm" />
        ) : !categories?.length ? (
          <Text size="sm" c="dimmed">No categories found.</Text>
        ) : (
          <Stack gap="xs">
            {categories.map((cat) => (
              <Group key={cat.id}>
                <Text size="sm" w={140} truncate>
                  {cat.name}
                </Text>
                <NumberInput
                  size="xs"
                  prefix="₹"
                  thousandSeparator=","
                  placeholder="0"
                  value={categoryBudgets[cat.id] ?? ''}
                  onChange={(val) =>
                    setCategoryBudgets((prev) => ({ ...prev, [cat.id]: val }))
                  }
                  min={0}
                  style={{ flex: 1 }}
                />
              </Group>
            ))}
            <Button onClick={handleSaveCategoryBudgets} loading={upsertCategory.isPending}>
              Save Category Budgets
            </Button>
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
