import { Skeleton, Stack, Group, Paper } from '@mantine/core';

export function ExpenseListSkeleton() {
  return (
    <Stack>
      {Array.from({ length: 5 }).map((_, i) => (
        <Paper key={i} p="md" withBorder>
          <Group wrap="nowrap">
            <Skeleton circle height={40} />
            <Stack gap={4} style={{ flex: 1 }}>
              <Skeleton height={14} width="60%" />
              <Skeleton height={10} width="35%" />
            </Stack>
            <Stack gap={4} align="flex-end">
              <Skeleton height={14} width={70} />
              <Skeleton height={10} width={50} />
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
