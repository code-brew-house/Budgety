'use client';

import {
  Title,
  Text,
  Card,
  Group,
  Stack,
  Progress,
  SimpleGrid,
  Skeleton,
  Badge,
} from '@mantine/core';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyDetail } from '@/hooks/useFamilies';
import { useExpenses } from '@/hooks/useExpenses';
import { useMemberSpending } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatINR';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const month = getCurrentMonth();
  const { data: family, isPending: familyPending } = useFamilyDetail(activeFamilyId);
  const { data: spending, isPending: spendingPending } = useMemberSpending(activeFamilyId, month);
  const { data: recentExpenses, isPending: expensesPending } = useExpenses(activeFamilyId, {
    limit: 10,
    sort: 'createdAt',
  });

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>Welcome to Budgety</Title>
        <Text c="dimmed">Create or join a family in Settings to get started.</Text>
      </Stack>
    );
  }

  const isLoading = familyPending || spendingPending || expensesPending;
  if (isLoading) return <DashboardSkeleton />;

  const hasBudget = (family?.monthlyBudget ?? 0) > 0;
  const totalSpent = spending?.totalSpent ?? 0;
  const totalBudget = spending?.totalBudget ?? 0;
  const utilization = spending?.utilizationPercent ?? 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyAvg = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const progressColor = utilization > 90 ? 'red' : utilization > 70 ? 'yellow' : 'blue';

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      {hasBudget && (
        <Card withBorder>
          <Text fw={500} mb="xs">Monthly Budget</Text>
          <Progress value={Math.min(utilization, 100)} color={progressColor} size="lg" radius="md" />
          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">{formatCurrency(totalSpent)} spent</Text>
            <Text size="sm" c="dimmed">{formatCurrency(totalBudget)} budget</Text>
          </Group>
        </Card>
      )}

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Spent</Text>
          <Text size="xl" fw={700}>{formatCurrency(totalSpent)}</Text>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Daily Avg</Text>
          <Text size="xl" fw={700}>{formatCurrency(Math.round(dailyAvg))}</Text>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Days Left</Text>
          <Text size="xl" fw={700}>{daysRemaining}</Text>
        </Card>
        {hasBudget && (
          <Card withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Remaining</Text>
            <Text size="xl" fw={700} c={totalBudget - totalSpent < 0 ? 'red' : undefined}>
              {formatCurrency(Math.max(totalBudget - totalSpent, 0))}
            </Text>
          </Card>
        )}
      </SimpleGrid>

      {spending?.members && spending.members.length > 0 && (
        <Card withBorder>
          <Text fw={500} mb="sm">Member Spending</Text>
          <Stack gap="xs">
            {spending.members.map((m) => (
              <Group key={m.userId} justify="space-between">
                <Text size="sm">{m.displayName || m.name}</Text>
                <Group gap="xs">
                  <Text size="sm" fw={500}>{formatCurrency(m.totalSpent)}</Text>
                  <Badge size="sm" variant="light">{m.percentOfTotal.toFixed(0)}%</Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      <Card withBorder>
        <Text fw={500} mb="sm">Recent Expenses</Text>
        {expensesPending ? (
          <Stack gap="xs">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={40} />)}
          </Stack>
        ) : (
          <Stack gap="xs">
            {recentExpenses?.data.map((expense) => (
              <Group key={expense.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>{expense.description}</Text>
                  <Text size="xs" c="dimmed">
                    {expense.category?.name} &middot; {expense.createdBy?.displayName || expense.createdBy?.name}
                  </Text>
                </div>
                <Text size="sm" fw={600}>{formatCurrency(expense.amount)}</Text>
              </Group>
            ))}
            {recentExpenses?.data.length === 0 && (
              <Text size="sm" c="dimmed" ta="center">No expenses yet</Text>
            )}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
