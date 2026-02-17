'use client';

import { Menu, Button, Text } from '@mantine/core';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFamilyStore } from '@/stores/familyStore';
import type { Family } from '@/lib/types';

interface FamilySwitcherProps {
  families: Family[] | undefined;
}

export function FamilySwitcher({ families }: FamilySwitcherProps) {
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();
  const queryClient = useQueryClient();
  const activeFamily = families?.find((f) => f.id === activeFamilyId);

  const handleSwitch = (familyId: string) => {
    setActiveFamilyId(familyId);
    queryClient.invalidateQueries();
  };

  if (!families?.length) return null;

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="subtle" rightSection={<IconChevronDown size={14} />} size="compact-sm" style={{ maxWidth: 140 }}>
          <Text size="sm" truncate>{activeFamily?.name ?? 'Select Family'}</Text>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {families.map((f) => (
          <Menu.Item
            key={f.id}
            onClick={() => handleSwitch(f.id)}
            rightSection={f.id === activeFamilyId ? <IconCheck size={14} /> : null}
          >
            {f.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
