import { Center, Stack } from '@mantine/core';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Center mih="100vh">
      <Stack w="100%" maw={400} px="md">
        {children}
      </Stack>
    </Center>
  );
}
