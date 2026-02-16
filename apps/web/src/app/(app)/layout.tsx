'use client';

import { useEffect } from 'react';
import { AppShell, Burger, Group, Text, ActionIcon } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/AppNavbar';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BottomTabs } from '@/components/BottomTabs';
import { FamilySwitcher } from '@/components/FamilySwitcher';
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';
import { useSession } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: families } = useFamilies();
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  // Auto-select first family if none selected
  useEffect(() => {
    if (families?.length && !activeFamilyId) {
      setActiveFamilyId(families[0]!.id);
    }
  }, [families, activeFamilyId, setActiveFamilyId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace('/login');
    }
  }, [session, sessionPending, router]);

  if (sessionPending) {
    return null;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        isMobile
          ? { width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }
          : { width: 260, breakpoint: 'sm' }
      }
      footer={isMobile ? { height: 60 } : undefined}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            {isMobile && (
              <Burger opened={opened} onClick={toggle} size="sm" />
            )}
            <Text fw={700} size="lg">Budgety</Text>
          </Group>
          <Group>
            {isMobile && <FamilySwitcher families={families} />}
            <ActionIcon
              component={Link}
              href="/expenses/add"
              variant="filled"
              size="lg"
              radius="xl"
              aria-label="Add expense"
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppNavbar families={families} />
      </AppShell.Navbar>

      {isMobile && (
        <AppShell.Footer>
          <BottomTabs />
        </AppShell.Footer>
      )}

      <AppShell.Main>
        <InstallPrompt />
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
