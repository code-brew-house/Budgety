'use client';

import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Group, CloseButton } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <Alert
      variant="light"
      color="blue"
      icon={<IconDownload size={18} />}
      withCloseButton={false}
      px="md"
      py="xs"
    >
      <Group justify="space-between" wrap="nowrap">
        <span style={{ fontSize: 'var(--mantine-font-size-sm)' }}>
          Install Budgety for a better experience
        </span>
        <Group gap="xs" wrap="nowrap">
          <Button size="compact-sm" variant="filled" onClick={handleInstall}>
            Install
          </Button>
          <CloseButton size="sm" onClick={handleDismiss} />
        </Group>
      </Group>
    </Alert>
  );
}
