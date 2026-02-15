'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NavLink, Stack, Divider } from '@mantine/core';
import {
  IconHome,
  IconReceipt,
  IconChartBar,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';
import { authClient } from '@/lib/auth';
import { FamilySwitcher } from './FamilySwitcher';
import type { Family } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: IconHome },
  { href: '/expenses', label: 'Expenses', icon: IconReceipt },
  { href: '/reports', label: 'Reports', icon: IconChartBar },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

interface AppNavbarProps {
  families: Family[] | undefined;
}

export function AppNavbar({ families }: AppNavbarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  return (
    <Stack justify="space-between" h="100%">
      <Stack gap={0}>
        <FamilySwitcher families={families} />
        <Divider my="sm" />
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            leftSection={<item.icon size={20} stroke={1.5} />}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </Stack>
      <NavLink
        label="Logout"
        leftSection={<IconLogout size={20} stroke={1.5} />}
        onClick={handleLogout}
        c="red"
      />
    </Stack>
  );
}
