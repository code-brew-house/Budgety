'use client';

import { useEffect } from 'react';
import { Stack, Title, TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useUser, useUpdateUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();
  const updateUser = useUpdateUser();

  const form = useForm({
    initialValues: {
      displayName: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.setValues({ displayName: user.displayName ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = (values: typeof form.values) => {
    updateUser.mutate(
      { displayName: values.displayName || undefined },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Profile updated',
            message: 'Your display name has been saved.',
            color: 'green',
          });
        },
      },
    );
  };

  if (isLoading) return null;

  return (
    <Stack>
      <Title order={2}>Profile</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack maw={400}>
          <TextInput
            label="Email"
            value={user?.email ?? ''}
            disabled
          />
          <TextInput
            label="Display Name"
            placeholder="Enter your name"
            {...form.getInputProps('displayName')}
          />
          <Button type="submit" loading={updateUser.isPending}>
            Save
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
