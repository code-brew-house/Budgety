'use client';

import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Switch,
  Button,
  Modal,
  TextInput,
  NumberInput,
  SegmentedControl,
  Select,
  ActionIcon,
  Loader,
} from '@mantine/core';
import { DatePickerInput, type DateValue } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { useFamilyStore } from '@/stores/familyStore';
import { useCategories } from '@/hooks/useCategories';
import {
  useRecurringExpenses,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
} from '@/hooks/useRecurringExpenses';
import { formatCurrency } from '@/lib/formatINR';

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

export default function RecurringPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: recurringData, isLoading } = useRecurringExpenses(activeFamilyId);
  const { data: categories } = useCategories(activeFamilyId);
  const [addOpened, addHandlers] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string } | null>(null);

  const createRecurring = useCreateRecurringExpense(activeFamilyId ?? '');
  const updateRecurring = useUpdateRecurringExpense(activeFamilyId ?? '');
  const deleteRecurring = useDeleteRecurringExpense(activeFamilyId ?? '');

  // Add form state
  const [newAmount, setNewAmount] = useState<number | string>('');
  const [newDescription, setNewDescription] = useState('');
  const [newFrequency, setNewFrequency] = useState('MONTHLY');
  const [newStartDate, setNewStartDate] = useState<DateValue>(new Date());
  const [newEndDate, setNewEndDate] = useState<DateValue>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family to manage recurring expenses.</Text>
      </Stack>
    );
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateRecurring.mutate({ id, isActive });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRecurring.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ title: 'Deleted', message: 'Recurring expense removed.', color: 'green' });
      },
    });
  };

  const handleCreate = () => {
    const amount = typeof newAmount === 'string' ? parseFloat(newAmount) : newAmount;
    if (!amount || !newDescription.trim() || !newStartDate || !newCategoryId) return;
    createRecurring.mutate(
      {
        amount,
        description: newDescription.trim(),
        frequency: newFrequency,
        startDate: new Date(newStartDate).toISOString().split('T')[0]!,
        endDate: newEndDate ? new Date(newEndDate).toISOString().split('T')[0] : undefined,
        categoryId: newCategoryId,
      },
      {
        onSuccess: () => {
          addHandlers.close();
          setNewAmount('');
          setNewDescription('');
          setNewFrequency('MONTHLY');
          setNewStartDate(new Date());
          setNewEndDate(null);
          setNewCategoryId(null);
          notifications.show({ title: 'Created', message: 'Recurring expense added.', color: 'green' });
        },
      },
    );
  };

  const items = recurringData?.data ?? [];
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Recurring Expenses</Title>
        <Button leftSection={<IconPlus size={16} />} size="sm" onClick={addHandlers.open}>
          Add
        </Button>
      </Group>

      {isLoading ? (
        <Loader />
      ) : !items.length ? (
        <Text c="dimmed" ta="center">No recurring expenses yet.</Text>
      ) : (
        <Stack gap="xs">
          {items.map((item) => (
            <Card key={item.id} withBorder p="sm">
              <Group justify="space-between" wrap="wrap">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb={4}>
                    <Text size="sm" fw={500}>{item.description}</Text>
                    <Badge size="xs" variant="light">{item.frequency}</Badge>
                  </Group>
                  <Text size="sm">{formatCurrency(item.amount)}</Text>
                  <Text size="xs" c="dimmed">
                    Next: {new Date(item.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </div>
                <Group gap="xs">
                  <Switch
                    checked={item.isActive}
                    onChange={(e) => handleToggleActive(item.id, e.currentTarget.checked)}
                    size="sm"
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => setDeleteTarget({ id: item.id, desc: item.description })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add Modal */}
      <Modal opened={addOpened} onClose={addHandlers.close} title="Add Recurring Expense">
        <Stack>
          <TextInput
            label="Description"
            placeholder="Netflix subscription"
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
          />
          <NumberInput
            label="Amount"
            prefix="₹"
            thousandSeparator=","
            placeholder="0"
            value={newAmount}
            onChange={setNewAmount}
            min={0}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>Frequency</Text>
            <SegmentedControl
              fullWidth
              data={FREQUENCY_OPTIONS}
              value={newFrequency}
              onChange={setNewFrequency}
            />
          </div>
          <Select
            label="Category"
            placeholder="Select category"
            data={categoryOptions}
            value={newCategoryId}
            onChange={setNewCategoryId}
          />
          <DatePickerInput
            label="Start Date"
            value={newStartDate}
            onChange={setNewStartDate}
          />
          <DatePickerInput
            label="End Date (optional)"
            value={newEndDate}
            onChange={setNewEndDate}
            clearable
          />
          <Button onClick={handleCreate} loading={createRecurring.isPending}>
            Create
          </Button>
        </Stack>
      </Modal>

      {/* Delete confirmation */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Recurring Expense">
        <Text size="sm">
          Are you sure you want to delete <b>{deleteTarget?.desc}</b>?
        </Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="red" onClick={handleDelete} loading={deleteRecurring.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
