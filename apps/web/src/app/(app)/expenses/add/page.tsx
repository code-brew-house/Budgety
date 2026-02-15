'use client';

import { useState } from 'react';
import {
  Title,
  Stack,
  NumberInput,
  TextInput,
  Select,
  Button,
  Switch,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useFamilyStore } from '@/stores/familyStore';
import { useCategories } from '@/hooks/useCategories';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useCreateRecurringExpense } from '@/hooks/useRecurringExpenses';

export default function AddExpensePage() {
  const router = useRouter();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: categories } = useCategories(activeFamilyId);
  const createExpense = useCreateExpense(activeFamilyId ?? '');
  const createRecurring = useCreateRecurringExpense(activeFamilyId ?? '');

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [endDate, setEndDate] = useState<Date | null>(null);

  const form = useForm({
    initialValues: {
      amount: 0,
      description: '',
      date: new Date(),
      categoryId: '',
    },
    validate: {
      amount: (v) => (v > 0 ? null : 'Amount must be positive'),
      description: (v) => (v.trim() ? null : 'Description is required'),
      categoryId: (v) => (v ? null : 'Category is required'),
    },
  });

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family first.</Text>
      </Stack>
    );
  }

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  const handleSubmit = form.onSubmit((values) => {
    const dateStr = values.date.toISOString().split('T')[0]!;

    if (isRecurring) {
      createRecurring.mutate(
        {
          amount: values.amount,
          description: values.description,
          categoryId: values.categoryId,
          frequency,
          startDate: dateStr,
          ...(endDate ? { endDate: endDate.toISOString().split('T')[0] } : {}),
        },
        {
          onSuccess: () => {
            notifications.show({ title: 'Created', message: 'Recurring expense created', color: 'green' });
            router.push('/expenses');
          },
          onError: () => {
            notifications.show({ title: 'Error', message: 'Failed to create recurring expense', color: 'red' });
          },
        },
      );
    } else {
      createExpense.mutate(
        {
          amount: values.amount,
          description: values.description,
          date: dateStr,
          categoryId: values.categoryId,
        },
        {
          onSuccess: () => {
            notifications.show({ title: 'Created', message: 'Expense added successfully', color: 'green' });
            router.push('/expenses');
          },
          onError: () => {
            notifications.show({ title: 'Error', message: 'Failed to add expense', color: 'red' });
          },
        },
      );
    }
  });

  const isSubmitting = createExpense.isPending || createRecurring.isPending;

  return (
    <Stack maw={500}>
      <Title order={2}>Add Expense</Title>

      <form onSubmit={handleSubmit}>
        <Stack>
          <NumberInput
            label="Amount"
            prefix="₹ "
            thousandSeparator=","
            min={0}
            placeholder="0"
            {...form.getInputProps('amount')}
          />

          <TextInput
            label="Description"
            placeholder="What was this expense for?"
            {...form.getInputProps('description')}
          />

          <DatePickerInput
            label="Date"
            placeholder="Select date"
            maxDate={new Date()}
            {...form.getInputProps('date')}
          />

          <Select
            label="Category"
            placeholder="Select category"
            data={categoryOptions}
            searchable
            {...form.getInputProps('categoryId')}
          />

          <Switch
            label="Recurring expense"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.currentTarget.checked)}
          />

          {isRecurring && (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>Frequency</Text>
                <SegmentedControl
                  fullWidth
                  value={frequency}
                  onChange={setFrequency}
                  data={[
                    { value: 'DAILY', label: 'Daily' },
                    { value: 'WEEKLY', label: 'Weekly' },
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'YEARLY', label: 'Yearly' },
                  ]}
                />
              </div>
              <DatePickerInput
                label="End date (optional)"
                placeholder="No end date"
                value={endDate}
                onChange={setEndDate}
                clearable
                minDate={form.values.date}
              />
            </>
          )}

          <Button type="submit" loading={isSubmitting} fullWidth>
            {isRecurring ? 'Create Recurring Expense' : 'Add Expense'}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
