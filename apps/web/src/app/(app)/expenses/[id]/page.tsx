'use client';

import { useEffect, useState } from 'react';
import {
  Title,
  Stack,
  NumberInput,
  TextInput,
  Select,
  Button,
  Group,
  Modal,
  Text,
  Skeleton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useParams, useRouter } from 'next/navigation';
import { useFamilyStore } from '@/stores/familyStore';
import { useCategories } from '@/hooks/useCategories';
import { useExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);

  const { data: expense, isPending } = useExpense(activeFamilyId, expenseId);
  const { data: categories } = useCategories(activeFamilyId);
  const updateExpense = useUpdateExpense(activeFamilyId ?? '');
  const deleteExpense = useDeleteExpense(activeFamilyId ?? '');

  const [showDelete, setShowDelete] = useState(false);

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

  useEffect(() => {
    if (expense) {
      form.setValues({
        amount: expense.amount,
        description: expense.description,
        date: new Date(expense.date),
        categoryId: expense.categoryId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense]);

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family first.</Text>
      </Stack>
    );
  }

  if (isPending) {
    return (
      <Stack maw={500}>
        <Skeleton height={30} width={200} />
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </Stack>
    );
  }

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  const handleSubmit = form.onSubmit((values) => {
    updateExpense.mutate(
      {
        id: expenseId,
        amount: values.amount,
        description: values.description,
        date: values.date.toISOString().split('T')[0],
        categoryId: values.categoryId,
      },
      {
        onSuccess: () => {
          notifications.show({ title: 'Updated', message: 'Expense updated successfully', color: 'green' });
          router.push('/expenses');
        },
        onError: () => {
          notifications.show({ title: 'Error', message: 'Failed to update expense', color: 'red' });
        },
      },
    );
  });

  const handleDelete = () => {
    deleteExpense.mutate(expenseId, {
      onSuccess: () => {
        notifications.show({ title: 'Deleted', message: 'Expense deleted successfully', color: 'green' });
        router.push('/expenses');
      },
      onError: () => {
        notifications.show({ title: 'Error', message: 'Failed to delete expense', color: 'red' });
      },
    });
  };

  return (
    <Stack maw={500}>
      <Title order={2}>Edit Expense</Title>

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

          <Group>
            <Button type="submit" loading={updateExpense.isPending} flex={1}>
              Save Changes
            </Button>
            <Button
              color="red"
              variant="outline"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal opened={showDelete} onClose={() => setShowDelete(false)} title="Delete Expense" centered>
        <Text size="sm" mb="lg">Are you sure you want to delete this expense? This action cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button color="red" onClick={handleDelete} loading={deleteExpense.isPending}>Delete</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
