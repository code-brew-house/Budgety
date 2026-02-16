'use client';

import { useState } from 'react';
import {
  Title,
  Text,
  Card,
  Group,
  Stack,
  ActionIcon,
  Progress,
  Badge,
} from '@mantine/core';
import { PieChart } from '@mantine/charts';
import { BarChart } from '@mantine/charts';
import { LineChart } from '@mantine/charts';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ReportsSkeleton } from '@/components/skeletons/ReportsSkeleton';
import { useFamilyStore } from '@/stores/familyStore';
import {
  useCategorySplit,
  useDailySpending,
  useMonthlyTrend,
  useBudgetUtilization,
  useMemberSpending,
  useTopExpenses,
} from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatINR';

const CHART_COLORS = [
  'blue.6', 'teal.6', 'orange.6', 'grape.6', 'pink.6',
  'cyan.6', 'lime.6', 'indigo.6', 'yellow.6', 'red.6',
  'violet.6', 'green.6',
];

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

export default function ReportsPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const [month, setMonth] = useState(getCurrentMonth);

  const { data: categorySplit, isPending: categoryPending } = useCategorySplit(activeFamilyId, month);
  const { data: dailySpending, isPending: dailyPending } = useDailySpending(activeFamilyId, month);
  const { data: monthlyTrend, isPending: trendPending } = useMonthlyTrend(activeFamilyId, 6);
  const { data: budgetUtil } = useBudgetUtilization(activeFamilyId, month);
  const { data: memberSpending } = useMemberSpending(activeFamilyId, month);
  const { data: topExpenses } = useTopExpenses(activeFamilyId, month, 5);

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family to view reports.</Text>
      </Stack>
    );
  }

  const isLoading = categoryPending || dailyPending || trendPending;
  if (isLoading) return <ReportsSkeleton />;

  const pieData = (categorySplit?.categories ?? []).map((c, i) => ({
    name: c.name,
    value: c.amount,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  }));

  const barData = (dailySpending?.days ?? []).map((d) => ({
    date: d.date.split('-')[2],
    amount: d.amount,
  }));

  const lineData = (monthlyTrend?.months ?? []).map((m) => ({
    month: m.month,
    amount: m.amount,
  }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Reports</Title>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => setMonth((m) => navigateMonth(m, -1))}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={500} size="sm" miw={140} ta="center">
            {formatMonthLabel(month)}
          </Text>
          <ActionIcon
            variant="subtle"
            onClick={() => setMonth((m) => navigateMonth(m, 1))}
            disabled={month >= getCurrentMonth()}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Category Split */}
      <Card withBorder>
        <Text fw={500} mb="sm">Category Split</Text>
        {pieData.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">No data for this month</Text>
        ) : (
          <PieChart
            data={pieData}
            withTooltip
            tooltipDataSource="segment"
            size={220}
            mx="auto"
          />
        )}
      </Card>

      {/* Daily Spending */}
      <Card withBorder>
        <Text fw={500} mb="sm">Daily Spending</Text>
        {barData.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">No data for this month</Text>
        ) : (
          <BarChart
            h={250}
            data={barData}
            dataKey="date"
            series={[{ name: 'amount', color: 'blue.6' }]}
            tickLine="y"
          />
        )}
      </Card>

      {/* Monthly Trend */}
      <Card withBorder>
        <Text fw={500} mb="sm">Monthly Trend</Text>
        {lineData.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">No data available</Text>
        ) : (
          <LineChart
            h={250}
            data={lineData}
            dataKey="month"
            series={[{ name: 'amount', color: 'blue.6' }]}
            curveType="monotone"
            tickLine="y"
          />
        )}
      </Card>

      {/* Budget Utilization */}
      <Card withBorder>
        <Text fw={500} mb="sm">Budget Utilization</Text>
        {!budgetUtil?.categories?.length ? (
          <Text size="sm" c="dimmed" ta="center">No budget data for this month</Text>
        ) : (
          <Stack gap="sm">
            {budgetUtil.categories.map((cat) => {
              const pct = Math.min(cat.utilizationPercent, 100);
              const color = cat.utilizationPercent > 90 ? 'red' : cat.utilizationPercent > 70 ? 'yellow' : 'blue';
              return (
                <div key={cat.categoryId}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">{cat.name}</Text>
                    <Text size="xs" c="dimmed">
                      {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)} ({cat.utilizationPercent.toFixed(0)}%)
                    </Text>
                  </Group>
                  <Progress value={pct} color={color} size="sm" radius="md" />
                </div>
              );
            })}
          </Stack>
        )}
      </Card>

      {/* Member Spending */}
      <Card withBorder>
        <Text fw={500} mb="sm">Member Spending</Text>
        {!memberSpending?.members?.length ? (
          <Text size="sm" c="dimmed" ta="center">No data for this month</Text>
        ) : (
          <Stack gap="xs">
            {memberSpending.members.map((m) => (
              <Group key={m.userId} justify="space-between">
                <Text size="sm">{m.displayName || m.name}</Text>
                <Group gap="xs">
                  <Text size="sm" fw={500}>{formatCurrency(m.totalSpent)}</Text>
                  <Badge size="sm" variant="light">{m.percentOfTotal.toFixed(0)}%</Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      {/* Top Expenses */}
      <Card withBorder>
        <Text fw={500} mb="sm">Top Expenses</Text>
        {!topExpenses?.expenses?.length ? (
          <Text size="sm" c="dimmed" ta="center">No expenses this month</Text>
        ) : (
          <Stack gap="xs">
            {topExpenses.expenses.map((expense, idx) => (
              <Group key={expense.id} justify="space-between">
                <Group gap="xs">
                  <Badge size="sm" variant="light" color="gray" circle>
                    {idx + 1}
                  </Badge>
                  <div>
                    <Text size="sm" fw={500}>{expense.description}</Text>
                    <Text size="xs" c="dimmed">
                      {expense.category?.name} &middot;{' '}
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </div>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(expense.amount)}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
