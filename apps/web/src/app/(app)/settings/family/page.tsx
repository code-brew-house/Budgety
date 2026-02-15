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
  Select,
  Modal,
  CopyButton,
  ActionIcon,
  Tooltip,
  Divider,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconTrash } from '@tabler/icons-react';
import {
  useFamilies,
  useFamilyDetail,
  useCreateFamily,
  useJoinFamily,
  useCreateInvite,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/useFamilies';

export default function FamilyPage() {
  const { data: families, isLoading } = useFamilies();
  const [managingFamilyId, setManagingFamilyId] = useState<string | null>(null);
  const [createOpened, createHandlers] = useDisclosure(false);
  const [joinOpened, joinHandlers] = useDisclosure(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const createFamily = useCreateFamily();
  const joinFamily = useJoinFamily();

  const handleCreate = () => {
    if (!newFamilyName.trim()) return;
    createFamily.mutate(
      { name: newFamilyName.trim() },
      {
        onSuccess: () => {
          setNewFamilyName('');
          createHandlers.close();
          notifications.show({ title: 'Family created', message: 'Your new family is ready.', color: 'green' });
        },
      },
    );
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinFamily.mutate(joinCode.trim(), {
      onSuccess: () => {
        setJoinCode('');
        joinHandlers.close();
        notifications.show({ title: 'Joined family', message: 'You have joined the family.', color: 'green' });
      },
      onError: () => {
        notifications.show({ title: 'Failed to join', message: 'Invalid or expired invite code.', color: 'red' });
      },
    });
  };

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Title order={2}>Family Management</Title>

      {/* My Families */}
      <Card withBorder>
        <Text fw={500} mb="sm">My Families</Text>
        {!families?.length ? (
          <Text size="sm" c="dimmed">You are not part of any family yet.</Text>
        ) : (
          <Stack gap="xs">
            {families.map((f) => (
              <Group key={f.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>{f.name}</Text>
                  <Text size="xs" c="dimmed">{f.currency}</Text>
                </div>
                <Button
                  size="xs"
                  variant={managingFamilyId === f.id ? 'filled' : 'light'}
                  onClick={() => setManagingFamilyId(managingFamilyId === f.id ? null : f.id)}
                >
                  {managingFamilyId === f.id ? 'Close' : 'Manage'}
                </Button>
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      {/* Create / Join buttons */}
      <Group>
        <Button variant="light" onClick={createHandlers.open}>Create Family</Button>
        <Button variant="light" onClick={joinHandlers.open}>Join Family</Button>
      </Group>

      {/* Create Family Form */}
      <Modal opened={createOpened} onClose={createHandlers.close} title="Create Family">
        <Stack>
          <TextInput
            label="Family Name"
            placeholder="My Family"
            value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.currentTarget.value)}
          />
          <Button onClick={handleCreate} loading={createFamily.isPending}>
            Create
          </Button>
        </Stack>
      </Modal>

      {/* Join Family Form */}
      <Modal opened={joinOpened} onClose={joinHandlers.close} title="Join Family">
        <Stack>
          <TextInput
            label="Invite Code"
            placeholder="Enter invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.currentTarget.value)}
          />
          <Button onClick={handleJoin} loading={joinFamily.isPending}>
            Join
          </Button>
        </Stack>
      </Modal>

      {/* Family Detail */}
      {managingFamilyId && (
        <FamilyDetailSection familyId={managingFamilyId} />
      )}
    </Stack>
  );
}

function FamilyDetailSection({ familyId }: { familyId: string }) {
  const { data: detail, isLoading } = useFamilyDetail(familyId);
  const createInvite = useCreateInvite(familyId);
  const updateRole = useUpdateMemberRole(familyId);
  const removeMember = useRemoveMember(familyId);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const handleGenerateInvite = () => {
    createInvite.mutate(undefined, {
      onSuccess: (data) => {
        setInviteCode(data.code);
      },
    });
  };

  const handleRemoveMember = () => {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.id, {
      onSuccess: () => {
        setRemoveTarget(null);
        notifications.show({ title: 'Member removed', message: `${removeTarget.name} has been removed.`, color: 'green' });
      },
    });
  };

  if (isLoading) return <Loader />;
  if (!detail) return null;

  return (
    <Card withBorder>
      <Text fw={500} mb="sm">{detail.name} — Members</Text>
      <Stack gap="xs">
        {detail.members.map((member) => (
          <Group key={member.id} justify="space-between" wrap="wrap">
            <div>
              <Text size="sm" fw={500}>
                {member.user.displayName || member.user.name}
              </Text>
              <Text size="xs" c="dimmed">{member.user.email}</Text>
            </div>
            <Group gap="xs">
              <Badge color={member.role === 'ADMIN' ? 'green' : 'blue'} variant="light">
                {member.role}
              </Badge>
              <Select
                size="xs"
                w={110}
                data={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'MEMBER', label: 'Member' },
                ]}
                value={member.role}
                onChange={(val) => {
                  if (val && val !== member.role) {
                    updateRole.mutate({ memberId: member.id, role: val as 'ADMIN' | 'MEMBER' });
                  }
                }}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() =>
                  setRemoveTarget({
                    id: member.id,
                    name: member.user.displayName || member.user.name,
                  })
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        ))}
      </Stack>

      <Divider my="sm" />

      <Group>
        <Button size="xs" variant="light" onClick={handleGenerateInvite} loading={createInvite.isPending}>
          Generate Invite Code
        </Button>
      </Group>

      {inviteCode && (
        <Group mt="xs" gap="xs">
          <TextInput size="xs" value={inviteCode} readOnly style={{ flex: 1 }} />
          <CopyButton value={inviteCode} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'}>
                <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      )}

      {/* Remove confirmation modal */}
      <Modal opened={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Member">
        <Text size="sm">
          Are you sure you want to remove <b>{removeTarget?.name}</b> from the family?
        </Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button color="red" onClick={handleRemoveMember} loading={removeMember.isPending}>
            Remove
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
