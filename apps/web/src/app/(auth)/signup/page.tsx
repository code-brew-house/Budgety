'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : 'Name is required'),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (authError) {
        setError(authError.message || 'Signup failed');
        return;
      }
      router.replace('/');
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
        Create your account
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <TextInput
        label="Name"
        placeholder="Your name"
        autoComplete="name"
        mb="md"
        {...form.getInputProps('name')}
      />

      <TextInput
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        mb="md"
        {...form.getInputProps('email')}
      />

      <PasswordInput
        label="Password"
        placeholder="Min 8 characters"
        autoComplete="new-password"
        mb="lg"
        {...form.getInputProps('password')}
      />

      <Button type="submit" fullWidth loading={loading}>
        Sign Up
      </Button>

      <Text c="dimmed" size="sm" ta="center" mt="md">
        Already have an account?{' '}
        <Anchor href="/login" fw={500}>Sign In</Anchor>
      </Text>
    </form>
  );
}
