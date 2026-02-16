import { Skeleton, Stack, Paper, SimpleGrid } from '@mantine/core';

export function ReportsSkeleton() {
  return (
    <Stack>
      <Skeleton height={36} width={200} />
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} p="md" withBorder>
            <Skeleton height={14} width="40%" mb="md" />
            <Skeleton height={200} radius="sm" />
          </Paper>
        ))}
      </SimpleGrid>
      <Paper p="md" withBorder>
        <Skeleton height={14} width="35%" mb="md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Stack key={i} gap={4} mb="sm">
            <Skeleton height={12} width="50%" />
            <Skeleton height={16} radius="xl" />
          </Stack>
        ))}
      </Paper>
    </Stack>
  );
}
