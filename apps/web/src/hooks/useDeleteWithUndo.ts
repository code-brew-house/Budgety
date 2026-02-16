'use client';

import { useRef, useCallback } from 'react';
import { notifications } from '@mantine/notifications';

interface UseDeleteWithUndoOptions {
  onDelete: (id: string) => void;
  entityName?: string;
  delay?: number;
}

export function useDeleteWithUndo({ onDelete, entityName = 'item', delay = 3000 }: UseDeleteWithUndoOptions) {
  const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleDelete = useCallback((id: string) => {
    const existing = pendingRef.current.get(id);
    if (existing) clearTimeout(existing);

    const notificationId = `delete-${id}`;

    const timer = setTimeout(() => {
      pendingRef.current.delete(id);
      notifications.hide(notificationId);
      onDelete(id);
    }, delay);

    pendingRef.current.set(id, timer);

    notifications.show({
      id: notificationId,
      title: `${entityName} will be deleted`,
      message: 'Click undo to cancel',
      color: 'red',
      autoClose: delay,
      withCloseButton: false,
    });

    return () => {
      clearTimeout(timer);
      pendingRef.current.delete(id);
      notifications.hide(notificationId);
    };
  }, [onDelete, entityName, delay]);

  return { scheduleDelete };
}
