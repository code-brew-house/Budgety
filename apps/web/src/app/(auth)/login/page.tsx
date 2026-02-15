'use client';

import { useState } from 'react';
import {
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { authClient } from '@/lib/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (authError) {
        setError(authError.message || 'Login failed');
        return;
      }
      window.location.href = '/';
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Title ta="center" mb={4}>Budgety</Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Sign in to your account
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <TextInput
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        mb="md"
        {...form.getInputProps('email')}
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        autoComplete="current-password"
        mb="lg"
        {...form.getInputProps('password')}
      />

      <Button type="submit" fullWidth loading={loading}>
        Sign In
      </Button>

      <Text c="dimmed" size="sm" ta="center" mt="md">
        Don&apos;t have an account?{' '}
        <Anchor href="/signup" fw={500}>Sign Up</Anchor>
      </Text>
    </form>
  );
}
