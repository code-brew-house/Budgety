'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Popover,
  Stack,
  Group,
  Text,
  UnstyledButton,
  Divider,
  ScrollArea,
  Loader,
  Center,
} from '@mantine/core';
import { IconBell, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/lib/types';

dayjs.extend(relativeTime);

const typeIcons: Record<string, string> = {
  BUDGET_THRESHOLD: '⚠️',
  RECURRING_DUE: '🔄',
  EXPENSE_ADDED: '💸',
  MEMBER_JOINED: '👋',
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (n: Notification) => void;
}) {
  return (
    <UnstyledButton
      onClick={() => onRead(notification)}
      p="sm"
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        backgroundColor: notification.isRead
          ? undefined
          : 'var(--mantine-color-blue-0)',
      }}
      w="100%"
    >
      <Group wrap="nowrap" gap="sm">
        <Text size="lg">{typeIcons[notification.type] || '🔔'}</Text>
        <Stack gap={2} style={{ flex: 1 }}>
          <Group justify="space-between" wrap="nowrap">
            <Text
              size="sm"
              fw={notification.isRead ? 400 : 600}
              lineClamp={1}
            >
              {notification.title}
            </Text>
            {!notification.isRead && (
              <Badge size="xs" circle color="blue" variant="filled">
                {' '}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {notification.body}
          </Text>
          <Text size="xs" c="dimmed">
            {dayjs(notification.createdAt).fromNow()}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

export function NotificationCenter() {
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const {
    data: notificationData,
    isLoading,
    refetch,
  } = useNotifications({ limit: 20 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count || 0;

  const handleOpen = (isOpen: boolean) => {
    setOpened(isOpen);
    if (isOpen) {
      refetch();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on notification type
    const data = notification.data as Record<string, string> | null;
    if (data?.expenseId && data?.familyId) {
      router.push(`/expenses/${data.expenseId}`);
    } else if (data?.familyId) {
      router.push('/dashboard');
    }

    setOpened(false);
  };

  return (
    <Popover
      width={360}
      position="bottom-end"
      shadow="md"
      opened={opened}
      onChange={handleOpen}
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => handleOpen(!opened)}
          aria-label="Notifications"
          pos="relative"
        >
          <IconBell size={22} stroke={1.5} />
          {unreadCount > 0 && (
            <Badge
              size="xs"
              color="red"
              variant="filled"
              circle
              pos="absolute"
              top={2}
              right={2}
              style={{ fontSize: 9, padding: '0 4px', minWidth: 16 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Group justify="space-between" p="sm" pb="xs">
          <Text fw={600} size="sm">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <UnstyledButton onClick={() => markAllAsRead.mutate()}>
              <Group gap={4}>
                <IconCheck size={14} />
                <Text size="xs" c="blue">
                  Mark all read
                </Text>
              </Group>
            </UnstyledButton>
          )}
        </Group>
        <Divider />
        <ScrollArea.Autosize mah={400}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : !notificationData?.data.length ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              No notifications
            </Text>
          ) : (
            <Stack gap={0} p="xs">
              {notificationData.data.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleNotificationClick}
                />
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
