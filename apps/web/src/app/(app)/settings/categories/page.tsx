'use client';

import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  TextInput,
  Button,
  Badge,
  ActionIcon,
  Modal,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useFamilyStore } from '@/stores/familyStore';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';

export default function CategoriesPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: categories, isLoading } = useCategories(activeFamilyId);

  const createCategory = useCreateCategory(activeFamilyId ?? '');
  const updateCategory = useUpdateCategory(activeFamilyId ?? '');
  const deleteCategory = useDeleteCategory(activeFamilyId ?? '');

  const [newName, setNewName] = useState('');
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>No Family Selected</Title>
        <Text c="dimmed">Select or create a family to manage categories.</Text>
      </Stack>
    );
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setNewName('');
          notifications.show({ title: 'Category created', message: 'New category added.', color: 'green' });
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editTarget || !editName.trim()) return;
    updateCategory.mutate(
      { id: editTarget.id, name: editName.trim() },
      {
        onSuccess: () => {
          setEditTarget(null);
          notifications.show({ title: 'Category updated', message: 'Category name changed.', color: 'green' });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ title: 'Category deleted', message: 'Category has been removed.', color: 'green' });
      },
    });
  };

  return (
    <Stack>
      <Title order={2}>Categories</Title>

      {/* Add Category */}
      <Card withBorder>
        <Text fw={500} mb="sm">Add Category</Text>
        <Group>
          <TextInput
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={handleCreate} loading={createCategory.isPending}>
            Add
          </Button>
        </Group>
      </Card>

      {/* Category List */}
      {isLoading ? (
        <Loader />
      ) : !categories?.length ? (
        <Text c="dimmed" ta="center">No categories found.</Text>
      ) : (
        <Stack gap="xs">
          {categories.map((cat) => (
            <Card key={cat.id} withBorder p="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={500}>{cat.name}</Text>
                  {cat.isDefault && (
                    <Badge size="xs" variant="light" color="gray">Default</Badge>
                  )}
                </Group>
                {!cat.isDefault && (
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setEditTarget({ id: cat.id, name: cat.name });
                        setEditName(cat.name);
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Edit Modal */}
      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Category">
        <Stack>
          <TextInput
            label="Category Name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <Button onClick={handleUpdate} loading={updateCategory.isPending}>
            Save
          </Button>
        </Stack>
      </Modal>

      {/* Delete confirmation */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category">
        <Text size="sm">
          Are you sure you want to delete <b>{deleteTarget?.name}</b>?
        </Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="red" onClick={handleDelete} loading={deleteCategory.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
