import { Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ message = 'Something went wrong', onRetry }: ErrorFallbackProps) {
  return (
    <Stack align="center" py="xl" gap="md">
      <ThemeIcon size={64} radius="xl" variant="light" color="red">
        <IconAlertTriangle size={32} stroke={1.5} />
      </ThemeIcon>
      <Text fw={600} size="lg">Oops!</Text>
      <Text c="dimmed" ta="center" maw={300}>{message}</Text>
      {onRetry && (
        <Button variant="light" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Stack>
  );
}
