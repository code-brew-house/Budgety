'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Group, UnstyledButton, Text, Stack } from '@mantine/core';
import {
  IconHome,
  IconReceipt,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: IconHome },
  { href: '/expenses', label: 'Expenses', icon: IconReceipt },
  { href: '/reports', label: 'Reports', icon: IconChartBar },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <Group grow h="100%" px="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <UnstyledButton key={tab.href} component={Link} href={tab.href} py="xs">
            <Stack align="center" gap={2}>
              <tab.icon
                size={22}
                stroke={1.5}
                color={isActive ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'}
              />
              <Text
                size="xs"
                c={isActive ? 'blue.6' : 'gray.6'}
                fw={isActive ? 600 : 400}
              >
                {tab.label}
              </Text>
            </Stack>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
