import { Skeleton, Stack, Group, Paper, SimpleGrid } from '@mantine/core';

export function DashboardSkeleton() {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} p="md" withBorder>
            <Skeleton height={12} width="60%" mb="xs" />
            <Skeleton height={24} width="40%" />
          </Paper>
        ))}
      </SimpleGrid>
      <Paper p="md" withBorder>
        <Skeleton height={14} width="30%" mb="sm" />
        <Skeleton height={20} radius="xl" />
      </Paper>
      <Paper p="md" withBorder>
        <Skeleton height={16} width="40%" mb="md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Group key={i} mb="sm" wrap="nowrap">
            <Skeleton circle height={36} />
            <Stack gap={4} style={{ flex: 1 }}>
              <Skeleton height={12} width="70%" />
              <Skeleton height={10} width="40%" />
            </Stack>
            <Skeleton height={14} width={60} />
          </Group>
        ))}
      </Paper>
    </Stack>
  );
}
