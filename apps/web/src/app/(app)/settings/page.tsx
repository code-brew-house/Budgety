'use client';

import { Stack, Title, NavLink } from '@mantine/core';
import {
  IconUser,
  IconUsers,
  IconWallet,
  IconRepeat,
  IconCategory,
  IconLogout,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

const links = [
  { label: 'Profile', href: '/settings/profile', icon: IconUser },
  { label: 'Family', href: '/settings/family', icon: IconUsers },
  { label: 'Budget', href: '/settings/budget', icon: IconWallet },
  { label: 'Recurring Expenses', href: '/settings/recurring', icon: IconRepeat },
  { label: 'Categories', href: '/settings/categories', icon: IconCategory },
];

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Stack>
      <Title order={2}>Settings</Title>
      <Stack gap={0}>
        {links.map((link) => (
          <NavLink
            key={link.href}
            label={link.label}
            leftSection={<link.icon size={20} />}
            component={Link}
            href={link.href}
          />
        ))}
        <NavLink
          label="Logout"
          leftSection={<IconLogout size={20} />}
          onClick={handleLogout}
          c="red"
        />
      </Stack>
    </Stack>
  );
}
