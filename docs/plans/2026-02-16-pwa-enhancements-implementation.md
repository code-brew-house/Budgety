# PWA Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the Budgety PWA with service worker caching, Framer Motion animations, offline write support, and in-app notifications across 4 independently deployable phases.

**Architecture:** Phase 1 adds a Workbox service worker via next-pwa and optimistic mutation updates. Phase 2 layers Framer Motion for page transitions, gestures (pull-to-refresh, swipe-to-delete), skeletons, and empty states. Phase 3 enables offline expense mutations with localStorage persistence. Phase 4 adds a Notification model to the API and a polling-based notification center on the web.

**Tech Stack:** Next.js 16, @ducanh2912/next-pwa, Framer Motion, Mantine v8, TanStack Query v5, NestJS v11, Prisma (PostgreSQL)

---

## Phase 1: Service Worker & Performance Foundation

### Task 1: Set Up Service Worker with next-pwa

**Files:**
- Modify: `apps/web/package.json` (add dependency)
- Modify: `apps/web/next.config.ts` (wrap with withPWA)
- Modify: `apps/web/.gitignore` (ignore generated SW files)

**Step 1: Install next-pwa**

Run from repo root:
```bash
pnpm --filter web add @ducanh2912/next-pwa
```

**Step 2: Configure next.config.ts**

Replace `apps/web/next.config.ts` with:

```typescript
import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  cacheStartUrl: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // Never cache auth endpoints
        urlPattern: /\/api\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        // API GET requests: network first with 30s cache fallback
        urlPattern: /\/families\/.*\/(expenses|reports|budgets|categories)/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-data',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30,
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // Static assets: cache first, 30-day TTL
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        // Google Fonts
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

**Step 3: Add generated files to .gitignore**

Append to `apps/web/.gitignore`:

```
# PWA generated files
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/swe-worker-*.js
```

**Step 4: Verify build**

```bash
pnpm --filter web build
```

Expected: Build succeeds. `public/sw.js` is generated.

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts apps/web/.gitignore pnpm-lock.yaml
git commit -m "feat(web): add service worker with next-pwa and runtime caching strategies"
```

---

### Task 2: Add Optimistic Updates to Expense Mutations

**Files:**
- Modify: `apps/web/src/hooks/useExpenses.ts`

**Step 1: Update useCreateExpense with optimistic update**

In `apps/web/src/hooks/useExpenses.ts`, replace the `useCreateExpense` function:

```typescript
export function useCreateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description: string; date: string; categoryId: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', familyId] });
      await queryClient.cancelQueries({ queryKey: ['expenses-infinite', familyId] });

      const previousExpenses = queryClient.getQueryData(['expenses', familyId]);

      // Optimistic entry with temp ID
      const optimistic: Partial<Expense> = {
        id: `temp-${Date.now()}`,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date,
        categoryId: newExpense.categoryId,
        familyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: '',
        category: { id: newExpense.categoryId, name: '', icon: null },
        createdBy: { id: '', name: '', displayName: null, avatarUrl: null },
      };

      queryClient.setQueryData(
        ['expenses', familyId],
        (old: PaginatedExpenses | undefined) =>
          old ? { ...old, data: [optimistic as Expense, ...old.data], total: old.total + 1 } : old,
      );

      return { previousExpenses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', familyId], context.previousExpenses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 2: Update useUpdateExpense with optimistic update**

Replace `useUpdateExpense`:

```typescript
export function useUpdateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string; date?: string; categoryId?: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', familyId] });
      const previousExpenses = queryClient.getQueryData(['expenses', familyId]);

      queryClient.setQueryData(
        ['expenses', familyId],
        (old: PaginatedExpenses | undefined) =>
          old
            ? {
                ...old,
                data: old.data.map((e) =>
                  e.id === updated.id ? { ...e, ...updated, updatedAt: new Date().toISOString() } : e,
                ),
              }
            : old,
      );

      return { previousExpenses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', familyId], context.previousExpenses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 3: Update useDeleteExpense with optimistic update**

Replace `useDeleteExpense`:

```typescript
export function useDeleteExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/expenses/${id}`, { method: 'DELETE' }),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', familyId] });
      const previousExpenses = queryClient.getQueryData(['expenses', familyId]);

      queryClient.setQueryData(
        ['expenses', familyId],
        (old: PaginatedExpenses | undefined) =>
          old
            ? { ...old, data: old.data.filter((e) => e.id !== deletedId), total: old.total - 1 }
            : old,
      );

      return { previousExpenses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', familyId], context.previousExpenses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 4: Verify build**

```bash
pnpm --filter web build
```

Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add apps/web/src/hooks/useExpenses.ts
git commit -m "feat(web): add optimistic updates to expense mutations"
```

---

### Task 3: Create PWA Install Prompt

**Files:**
- Create: `apps/web/src/components/InstallPrompt.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (add install banner)

**Step 1: Create InstallPrompt component**

Create `apps/web/src/components/InstallPrompt.tsx`:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Group, CloseButton } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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
```

**Step 2: Add InstallPrompt to app layout**

In `apps/web/src/app/(app)/layout.tsx`, import and add the component inside `<AppShell.Main>` above `{children}`:

Add import:
```typescript
import { InstallPrompt } from '@/components/InstallPrompt';
```

Update the `<AppShell.Main>` section:
```tsx
<AppShell.Main>
  <InstallPrompt />
  {children}
</AppShell.Main>
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/InstallPrompt.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add PWA install prompt banner"
```

---

## Phase 2: UX & Polish with Framer Motion

### Task 4: Add Page Transitions with Framer Motion

**Files:**
- Modify: `apps/web/package.json` (add dependency)
- Create: `apps/web/src/components/PageTransition.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (wrap children)

**Step 1: Install framer-motion**

```bash
pnpm --filter web add framer-motion
```

**Step 2: Create PageTransition component**

Create `apps/web/src/components/PageTransition.tsx`:

```typescript
'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 3: Wrap children in app layout**

In `apps/web/src/app/(app)/layout.tsx`, import and wrap:

Add import:
```typescript
import { PageTransition } from '@/components/PageTransition';
```

Update `<AppShell.Main>`:
```tsx
<AppShell.Main>
  <InstallPrompt />
  <PageTransition>{children}</PageTransition>
</AppShell.Main>
```

**Step 4: Verify build**

```bash
pnpm --filter web build
```

**Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/PageTransition.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add page transition animations with Framer Motion"
```

---

### Task 5: Add Skeleton Loaders

**Files:**
- Create: `apps/web/src/components/skeletons/DashboardSkeleton.tsx`
- Create: `apps/web/src/components/skeletons/ExpenseListSkeleton.tsx`
- Create: `apps/web/src/components/skeletons/ReportsSkeleton.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/expenses/page.tsx`
- Modify: `apps/web/src/app/(app)/reports/page.tsx`

**Step 1: Create DashboardSkeleton**

Create `apps/web/src/components/skeletons/DashboardSkeleton.tsx`:

```typescript
import { Skeleton, Stack, Group, Paper, SimpleGrid } from '@mantine/core';

export function DashboardSkeleton() {
  return (
    <Stack>
      {/* Stats cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} p="md" withBorder>
            <Skeleton height={12} width="60%" mb="xs" />
            <Skeleton height={24} width="40%" />
          </Paper>
        ))}
      </SimpleGrid>

      {/* Budget progress */}
      <Paper p="md" withBorder>
        <Skeleton height={14} width="30%" mb="sm" />
        <Skeleton height={20} radius="xl" />
      </Paper>

      {/* Recent expenses */}
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
```

**Step 2: Create ExpenseListSkeleton**

Create `apps/web/src/components/skeletons/ExpenseListSkeleton.tsx`:

```typescript
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
```

**Step 3: Create ReportsSkeleton**

Create `apps/web/src/components/skeletons/ReportsSkeleton.tsx`:

```typescript
import { Skeleton, Stack, Paper, SimpleGrid } from '@mantine/core';

export function ReportsSkeleton() {
  return (
    <Stack>
      {/* Month selector */}
      <Skeleton height={36} width={200} />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* Chart placeholders */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} p="md" withBorder>
            <Skeleton height={14} width="40%" mb="md" />
            <Skeleton height={200} radius="sm" />
          </Paper>
        ))}
      </SimpleGrid>

      {/* Budget utilization */}
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
```

**Step 4: Integrate skeletons into pages**

In each page component, wrap the loading state. The pattern is to replace `if (isLoading) return null;` or similar with the skeleton component.

For `apps/web/src/app/(app)/dashboard/page.tsx`: import `DashboardSkeleton` and render it when data is loading.

For `apps/web/src/app/(app)/expenses/page.tsx`: import `ExpenseListSkeleton` and render it when data is loading.

For `apps/web/src/app/(app)/reports/page.tsx`: import `ReportsSkeleton` and render it when data is loading.

The pattern for each page:
```tsx
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

// Inside the component, where loading is checked:
if (isLoading) return <DashboardSkeleton />;
```

**Step 5: Verify build**

```bash
pnpm --filter web build
```

**Step 6: Commit**

```bash
git add apps/web/src/components/skeletons/ apps/web/src/app/\(app\)/dashboard/page.tsx apps/web/src/app/\(app\)/expenses/page.tsx apps/web/src/app/\(app\)/reports/page.tsx
git commit -m "feat(web): add skeleton loaders for dashboard, expenses, and reports"
```

---

### Task 6: Add Empty States

**Files:**
- Create: `apps/web/src/components/EmptyState.tsx`
- Modify: `apps/web/src/app/(app)/expenses/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Step 1: Create EmptyState component**

Create `apps/web/src/components/EmptyState.tsx`:

```typescript
import { Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconReceipt, IconUsers, IconCategory } from '@tabler/icons-react';
import Link from 'next/link';

interface EmptyStateProps {
  type: 'expenses' | 'families' | 'categories';
}

const config = {
  expenses: {
    icon: IconReceipt,
    title: 'No expenses yet',
    description: 'Start tracking your spending by adding your first expense.',
    action: { label: 'Add Expense', href: '/expenses/add' },
  },
  families: {
    icon: IconUsers,
    title: 'No family yet',
    description: 'Create or join a family to start tracking budgets together.',
    action: { label: 'Go to Settings', href: '/settings/family' },
  },
  categories: {
    icon: IconCategory,
    title: 'Using default categories',
    description: 'Create custom categories to better organize your expenses.',
    action: { label: 'Manage Categories', href: '/settings/categories' },
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const { icon: Icon, title, description, action } = config[type];

  return (
    <Stack align="center" py="xl" gap="md">
      <ThemeIcon size={64} radius="xl" variant="light" color="gray">
        <Icon size={32} stroke={1.5} />
      </ThemeIcon>
      <Text fw={600} size="lg">{title}</Text>
      <Text c="dimmed" ta="center" maw={300}>{description}</Text>
      <Button component={Link} href={action.href} variant="light">
        {action.label}
      </Button>
    </Stack>
  );
}
```

**Step 2: Add empty states to expense list page**

In `apps/web/src/app/(app)/expenses/page.tsx`, after the loading check, add:

```tsx
import { EmptyState } from '@/components/EmptyState';

// After loading check, before rendering the list:
if (!isLoading && expenses.length === 0) {
  return <EmptyState type="expenses" />;
}
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/EmptyState.tsx apps/web/src/app/\(app\)/expenses/page.tsx apps/web/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(web): add empty state illustrations for expenses and dashboard"
```

---

### Task 7: Create Pull-to-Refresh

**Files:**
- Create: `apps/web/src/components/PullToRefresh.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Step 1: Create PullToRefresh component**

Create `apps/web/src/components/PullToRefresh.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Loader, Center } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';

const THRESHOLD = 60;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const queryClient = useQueryClient();

  const spinnerOpacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const spinnerScale = useTransform(y, [0, THRESHOLD], [0.5, 1]);

  const handleDragEnd = useCallback(async () => {
    if (y.get() >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      await queryClient.invalidateQueries();
      setIsRefreshing(false);
    }
  }, [y, isRefreshing, queryClient]);

  if (!isMobile) return <>{children}</>;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <motion.div style={{ opacity: spinnerOpacity, scale: spinnerScale }}>
        <Center py="xs">
          <Loader size="sm" />
        </Center>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y, touchAction: 'pan-x' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
```

**Step 2: Add to app layout**

In `apps/web/src/app/(app)/layout.tsx`, wrap the content:

```tsx
import { PullToRefresh } from '@/components/PullToRefresh';

// In the render, wrap PageTransition inside PullToRefresh:
<AppShell.Main>
  <InstallPrompt />
  <PullToRefresh>
    <PageTransition>{children}</PageTransition>
  </PullToRefresh>
</AppShell.Main>
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/PullToRefresh.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add pull-to-refresh gesture on mobile"
```

---

### Task 8: Create Swipe-to-Delete Expense Cards

**Files:**
- Create: `apps/web/src/components/SwipeableExpenseCard.tsx`
- Modify: `apps/web/src/app/(app)/expenses/page.tsx` (use new component)

**Step 1: Create SwipeableExpenseCard**

Create `apps/web/src/components/SwipeableExpenseCard.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Paper, Group, Stack, Text, ThemeIcon, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import type { Expense } from '@/lib/types';
import { formatINR } from '@/lib/formatINR';
import dayjs from 'dayjs';

const DELETE_THRESHOLD = -80;

interface SwipeableExpenseCardProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  isLargeExpense?: boolean;
}

export function SwipeableExpenseCard({ expense, onDelete, onClick, isLargeExpense }: SwipeableExpenseCardProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const constraintsRef = useRef(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < DELETE_THRESHOLD) {
      onDelete(expense.id);
    }
  };

  const card = (
    <Paper
      p="md"
      withBorder
      style={{ cursor: 'pointer', borderLeft: isLargeExpense ? '3px solid var(--mantine-color-red-5)' : undefined }}
      onClick={() => onClick(expense.id)}
    >
      <Group wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="xl">
          <Text size="sm">{expense.category.icon || '💰'}</Text>
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text fw={500} size="sm" lineClamp={1}>{expense.description}</Text>
          <Text size="xs" c="dimmed">
            {expense.category.name} · {dayjs(expense.date).format('DD MMM')}
          </Text>
        </Stack>
        <Text fw={600} size="sm">{formatINR(expense.amount)}</Text>
      </Group>
    </Paper>
  );

  if (!isMobile) return card;

  return (
    <div ref={constraintsRef} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Delete action behind */}
      <motion.div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          paddingRight: 16,
          opacity: deleteOpacity,
        }}
      >
        <ActionIcon color="red" variant="filled" size="lg" radius="xl">
          <IconTrash size={18} />
        </ActionIcon>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, position: 'relative', zIndex: 1 }}
      >
        {card}
      </motion.div>
    </div>
  );
}
```

**Step 2: Update expenses page to use SwipeableExpenseCard**

In `apps/web/src/app/(app)/expenses/page.tsx`, replace the existing expense list rendering with `SwipeableExpenseCard`. Import the component and use it where expense cards are mapped.

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/SwipeableExpenseCard.tsx apps/web/src/app/\(app\)/expenses/page.tsx
git commit -m "feat(web): add swipe-to-delete gesture on expense cards"
```

---

### Task 9: Create Delete-with-Undo Pattern

**Files:**
- Create: `apps/web/src/hooks/useDeleteWithUndo.ts`
- Modify: `apps/web/src/app/(app)/expenses/page.tsx` (use new hook)

**Step 1: Create useDeleteWithUndo hook**

Create `apps/web/src/hooks/useDeleteWithUndo.ts`:

```typescript
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
    // Clear existing timer for this ID if any
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
      onClose: () => {
        // If closed without undo, timer handles deletion
      },
    });

    // Return undo function
    return () => {
      clearTimeout(timer);
      pendingRef.current.delete(id);
      notifications.hide(notificationId);
    };
  }, [onDelete, entityName, delay]);

  return { scheduleDelete };
}
```

**Note:** The Mantine notification `message` field can accept a React node. For the undo button, modify the `message` to include a clickable element. Alternatively, this can be enhanced in the integration step to pass a custom notification with an Undo button — the consuming component handles the undo action by calling the returned function.

**Step 2: Integrate into expenses page**

In `apps/web/src/app/(app)/expenses/page.tsx`, use the hook:

```tsx
const deleteMutation = useDeleteExpense(activeFamilyId!);
const { scheduleDelete } = useDeleteWithUndo({
  onDelete: (id) => deleteMutation.mutate(id),
  entityName: 'Expense',
});

// In SwipeableExpenseCard or delete handler:
// Replace direct deleteMutation.mutate(id) with scheduleDelete(id)
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/hooks/useDeleteWithUndo.ts apps/web/src/app/\(app\)/expenses/page.tsx
git commit -m "feat(web): add delete-with-undo toast pattern for expenses"
```

---

### Task 10: Add Error Fallback and Navigation Progress

**Files:**
- Create: `apps/web/src/components/ErrorFallback.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (add NavigationProgress)

**Step 1: Create ErrorFallback component**

Create `apps/web/src/components/ErrorFallback.tsx`:

```typescript
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
```

**Step 2: Add NavigationProgress to app layout**

In `apps/web/src/app/(app)/layout.tsx`, add the navigation progress bar:

Add import:
```typescript
import { NavigationProgress, nprogress } from '@mantine/nprogress';
```

Add `<NavigationProgress />` as the first child inside `<AppShell>`:

```tsx
<AppShell ...>
  <NavigationProgress />
  <AppShell.Header>
    ...
```

Note: `@mantine/nprogress` is already in the project dependencies. The `NavigationProgress` component automatically shows a progress bar during Next.js route transitions.

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/ErrorFallback.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add error fallback component and navigation progress bar"
```

---

## Phase 3: Offline Write Support

### Task 11: Create Network Status Detection and Offline Banner

**Files:**
- Create: `apps/web/src/hooks/useNetworkStatus.ts`
- Create: `apps/web/src/components/OfflineBanner.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Step 1: Create useNetworkStatus hook**

Create `apps/web/src/hooks/useNetworkStatus.ts`:

```typescript
'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isOnline };
}
```

**Step 2: Create OfflineBanner component**

Create `apps/web/src/components/OfflineBanner.tsx`:

```typescript
'use client';

import { Alert } from '@mantine/core';
import { IconWifiOff } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Alert
            variant="light"
            color="yellow"
            icon={<IconWifiOff size={18} />}
            py="xs"
            radius={0}
          >
            You're offline. Changes will sync when you reconnect.
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 3: Add OfflineBanner to app layout**

In `apps/web/src/app/(app)/layout.tsx`, import and add above `<AppShell.Header>`:

```tsx
import { OfflineBanner } from '@/components/OfflineBanner';

// Inside AppShell, before Header:
<AppShell ...>
  <NavigationProgress />
  <OfflineBanner />
  <AppShell.Header>
```

**Step 4: Verify build**

```bash
pnpm --filter web build
```

**Step 5: Commit**

```bash
git add apps/web/src/hooks/useNetworkStatus.ts apps/web/src/components/OfflineBanner.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add offline detection and banner"
```

---

### Task 12: Configure Offline Mutations

**Files:**
- Modify: `apps/web/src/lib/queryClient.ts`
- Modify: `apps/web/src/hooks/useExpenses.ts`

**Step 1: Update queryClient for offline support**

Replace `apps/web/src/lib/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
        gcTime: 1000 * 60 * 60 * 24, // 24 hours — needed for persistence
      },
      mutations: {
        retry: 3,
      },
    },
  });
}
```

**Step 2: Add networkMode to expense mutations**

In `apps/web/src/hooks/useExpenses.ts`, add `networkMode: 'offlineFirst'` to each of the three mutation hooks (`useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`):

```typescript
return useMutation({
  networkMode: 'offlineFirst',
  mutationFn: ...
  // rest unchanged
});
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/queryClient.ts apps/web/src/hooks/useExpenses.ts
git commit -m "feat(web): enable offlineFirst network mode for expense mutations"
```

---

### Task 13: Add Mutation Persistence

**Files:**
- Modify: `apps/web/package.json` (add dependencies)
- Modify: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/hooks/useExpenses.ts` (add mutationKey)

**Step 1: Install persistence packages**

```bash
pnpm --filter web add @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

**Step 2: Add mutation keys to expense mutations**

In `apps/web/src/hooks/useExpenses.ts`, add `mutationKey` to each mutation hook so they can be identified for persistence:

```typescript
// In useCreateExpense:
return useMutation({
  mutationKey: ['createExpense', familyId],
  networkMode: 'offlineFirst',
  // ...
});

// In useUpdateExpense:
return useMutation({
  mutationKey: ['updateExpense', familyId],
  networkMode: 'offlineFirst',
  // ...
});

// In useDeleteExpense:
return useMutation({
  mutationKey: ['deleteExpense', familyId],
  networkMode: 'offlineFirst',
  // ...
});
```

**Step 3: Update providers.tsx with PersistQueryClientProvider**

Replace `apps/web/src/app/providers.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Notifications } from '@mantine/notifications';
import { makeQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [persister] = useState(() =>
    typeof window !== 'undefined'
      ? createSyncStoragePersister({ storage: window.localStorage })
      : undefined,
  );

  if (!persister) {
    // SSR: render without persistence
    return (
      <Notifications position="top-right" />
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      <Notifications position="top-right" />
      {children}
    </PersistQueryClientProvider>
  );
}
```

**Step 4: Verify build**

```bash
pnpm --filter web build
```

**Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/app/providers.tsx apps/web/src/hooks/useExpenses.ts
git commit -m "feat(web): add mutation persistence for offline expense operations"
```

---

## Phase 4: In-App Notifications

### Task 14: Add Notification Model and Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add Notification model to schema**

Append to `apps/api/prisma/schema.prisma`, before the closing of the file:

```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   // BUDGET_THRESHOLD, RECURRING_DUE, EXPENSE_ADDED, MEMBER_JOINED
  title     String
  body      String
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyId  String?
  family    Family?  @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

Also add the relation fields to existing models:

In the `User` model, add:
```prisma
notifications Notification[]
```

In the `Family` model, add:
```prisma
notifications Notification[]
```

**Step 2: Generate migration**

```bash
cd apps/api && npx prisma migrate dev --name add-notifications
```

Expected: Migration created successfully, Prisma Client regenerated.

**Step 3: Verify the migration**

```bash
cd apps/api && npx prisma migrate status
```

Expected: All migrations applied.

**Step 4: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(api): add Notification model with user and family relations"
```

---

### Task 15: Create NotificationService with Tests

**Files:**
- Create: `apps/api/src/notification/notification.service.ts`
- Create: `apps/api/src/notification/notification.service.spec.ts`

**Step 1: Write the failing test**

Create `apps/api/src/notification/notification.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: { notification: Record<string, jest.Mock>; familyMember: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      familyMember: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const expected = { id: '1', type: 'EXPENSE_ADDED', title: 'New expense', body: 'Test', userId: 'u1' };
      prisma.notification.create.mockResolvedValue(expected);

      const result = await service.create({
        type: 'EXPENSE_ADDED',
        title: 'New expense',
        body: 'Test',
        userId: 'u1',
        familyId: 'f1',
      });

      expect(result).toEqual(expected);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { type: 'EXPENSE_ADDED', title: 'New expense', body: 'Test', userId: 'u1', familyId: 'f1', data: undefined },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated notifications', async () => {
      const notifications = [{ id: '1' }, { id: '2' }];
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findAllForUser('u1', { limit: 20 });

      expect(result.data).toEqual(notifications);
      expect(result.total).toBe(2);
    });

    it('should filter unread only', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAllForUser('u1', { limit: 20, unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('u1');

      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = { id: '1', isRead: true };
      prisma.notification.update.mockResolvedValue(notification);

      const result = await service.markAsRead('1', 'u1');

      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead('u1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('dismiss', () => {
    it('should delete a notification', async () => {
      prisma.notification.delete.mockResolvedValue({ id: '1' });

      await service.dismiss('1', 'u1');

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: '1', userId: 'u1' },
      });
    });
  });

  describe('notifyFamilyMembers', () => {
    it('should create notifications for all family members except excluded user', async () => {
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);
      prisma.notification.create.mockResolvedValue({});

      await service.notifyFamilyMembers({
        familyId: 'f1',
        excludeUserId: 'u1',
        type: 'EXPENSE_ADDED',
        title: 'New expense',
        body: 'Alice added an expense of ₹500',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=notification.service.spec
```

Expected: FAIL — `Cannot find module './notification.service'`

**Step 3: Implement NotificationService**

Create `apps/api/src/notification/notification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationDto {
  type: string;
  title: string;
  body: string;
  userId: string;
  familyId?: string;
  data?: Record<string, unknown>;
}

interface NotifyFamilyDto {
  familyId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        userId: dto.userId,
        familyId: dto.familyId,
        data: dto.data,
      },
    });
  }

  async findAllForUser(
    userId: string,
    options: { limit?: number; cursor?: string; unreadOnly?: boolean },
  ) {
    const limit = options.limit || 20;
    const where: { userId: string; isRead?: boolean } = { userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    const findOptions: {
      where: typeof where;
      orderBy: { createdAt: 'desc' };
      take: number;
      skip?: number;
      cursor?: { id: string };
    } = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
    };

    if (options.cursor) {
      findOptions.cursor = { id: options.cursor };
      findOptions.skip = 1;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany(findOptions),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async dismiss(id: string, userId: string) {
    return this.prisma.notification.delete({
      where: { id, userId },
    });
  }

  async notifyFamilyMembers(dto: NotifyFamilyDto) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: dto.familyId },
      select: { userId: true },
    });

    const targetUserIds = members
      .map((m) => m.userId)
      .filter((id) => id !== dto.excludeUserId);

    await Promise.all(
      targetUserIds.map((userId) =>
        this.create({
          type: dto.type,
          title: dto.title,
          body: dto.body,
          userId,
          familyId: dto.familyId,
          data: dto.data,
        }),
      ),
    );
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=notification.service.spec
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/api/src/notification/
git commit -m "feat(api): add NotificationService with full CRUD and family notification"
```

---

### Task 16: Create NotificationController with DTOs and Module

**Files:**
- Create: `apps/api/src/notification/dto/query-notifications.dto.ts`
- Create: `apps/api/src/notification/notification.controller.ts`
- Create: `apps/api/src/notification/notification.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create DTO**

Create `apps/api/src/notification/dto/query-notifications.dto.ts`:

```typescript
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value || 20)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;
}
```

**Step 2: Create controller**

Create `apps/api/src/notification/notification.controller.ts`:

```typescript
import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationService.findAllForUser(user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    await this.notificationService.markAllAsRead(user.id);
    return { success: true };
  }

  @Delete(':id')
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.dismiss(id, user.id);
  }
}
```

**Step 3: Create module**

Create `apps/api/src/notification/notification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

**Step 4: Register in AppModule**

In `apps/api/src/app.module.ts`, add:

Import:
```typescript
import { NotificationModule } from './notification/notification.module';
```

Add to `imports` array:
```typescript
imports: [
  // ... existing modules
  NotificationModule,
],
```

**Step 5: Verify build**

```bash
cd apps/api && pnpm build
```

**Step 6: Commit**

```bash
git add apps/api/src/notification/ apps/api/src/app.module.ts
git commit -m "feat(api): add notification controller, DTOs, and module"
```

---

### Task 17: Integrate Notification Triggers into Existing Services

**Files:**
- Modify: `apps/api/src/expense/expense.module.ts`
- Modify: `apps/api/src/expense/expense.service.ts`
- Modify: `apps/api/src/family/family.module.ts`
- Modify: `apps/api/src/family/family.service.ts`

**Step 1: Add NotificationModule to ExpenseModule imports**

In `apps/api/src/expense/expense.module.ts`, import `NotificationModule` and add to `imports` array.

**Step 2: Inject NotificationService into ExpenseService**

In `apps/api/src/expense/expense.service.ts`:

Add import:
```typescript
import { NotificationService } from '../notification/notification.service';
```

Add to constructor:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly notificationService: NotificationService,
) {}
```

In the `create` method, after the expense is created, add notification trigger:

```typescript
async create(familyId: string, userId: string, dto: CreateExpenseDto) {
  const expense = await this.prisma.expense.create({
    data: { /* existing */ },
    select: expenseSelect,
  });

  // Check if expense exceeds large expense threshold
  const family = await this.prisma.family.findUnique({
    where: { id: familyId },
    select: { largeExpenseThreshold: true, monthlyBudget: true },
  });

  if (family?.largeExpenseThreshold && expense.amount >= family.largeExpenseThreshold) {
    await this.notificationService.notifyFamilyMembers({
      familyId,
      excludeUserId: userId,
      type: 'EXPENSE_ADDED',
      title: 'Large expense added',
      body: `${expense.createdBy.displayName || expense.createdBy.name} added "${expense.description}" for ${expense.amount}`,
      data: { expenseId: expense.id, familyId },
    });
  }

  // Check budget threshold (80% and 100%)
  if (family?.monthlyBudget) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { _sum } = await this.prisma.expense.aggregate({
      where: {
        familyId,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      _sum: { amount: true },
    });

    const totalSpent = _sum.amount || 0;
    const utilization = totalSpent / family.monthlyBudget;

    if (utilization >= 1) {
      await this.notificationService.notifyFamilyMembers({
        familyId,
        type: 'BUDGET_THRESHOLD',
        title: 'Budget exceeded!',
        body: `Monthly spending has exceeded the budget of ${family.monthlyBudget}`,
        data: { familyId, utilization: Math.round(utilization * 100) },
      });
    } else if (utilization >= 0.8) {
      await this.notificationService.notifyFamilyMembers({
        familyId,
        type: 'BUDGET_THRESHOLD',
        title: 'Budget alert: 80% used',
        body: `Monthly spending has reached ${Math.round(utilization * 100)}% of the budget`,
        data: { familyId, utilization: Math.round(utilization * 100) },
      });
    }
  }

  return expense;
}
```

**Step 3: Add NotificationModule to FamilyModule imports**

In `apps/api/src/family/family.module.ts`, import `NotificationModule` and add to `imports` array.

**Step 4: Inject NotificationService into FamilyService**

In `apps/api/src/family/family.service.ts`:

Add import and constructor injection (same pattern as ExpenseService).

In the `joinFamily` method, after the member is created, add:

```typescript
// After creating the family member, before returning:
await this.notificationService.notifyFamilyMembers({
  familyId: invite.familyId,
  excludeUserId: userId,
  type: 'MEMBER_JOINED',
  title: 'New member joined',
  body: `A new member has joined the family`,
  data: { familyId: invite.familyId, userId },
});
```

**Step 5: Verify build and tests**

```bash
cd apps/api && pnpm build && pnpm test
```

Expected: Build succeeds. Tests pass (existing tests may need mock updates for the new NotificationService dependency).

**Step 6: Commit**

```bash
git add apps/api/src/expense/ apps/api/src/family/
git commit -m "feat(api): integrate notification triggers into expense and family services"
```

---

### Task 18: Create useNotifications Hook

**Files:**
- Create: `apps/web/src/hooks/useNotifications.ts`
- Modify: `apps/web/src/lib/types.ts` (add Notification type)

**Step 1: Add Notification type**

Append to `apps/web/src/lib/types.ts`:

```typescript
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  userId: string;
  familyId: string | null;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
}
```

**Step 2: Create useNotifications hook**

Create `apps/web/src/hooks/useNotifications.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PaginatedNotifications } from '@/lib/types';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiFetch<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}

export function useNotifications(options?: { unreadOnly?: boolean; limit?: number; cursor?: string }) {
  const params = new URLSearchParams();
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);
  const query = params.toString();

  return useQuery({
    queryKey: ['notifications', 'list', options],
    queryFn: () => apiFetch<PaginatedNotifications>(`/notifications${query ? `?${query}` : ''}`),
    enabled: false, // Only fetch on demand (when popover opens)
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/hooks/useNotifications.ts apps/web/src/lib/types.ts
git commit -m "feat(web): add useNotifications hook with polling and mutation support"
```

---

### Task 19: Create NotificationCenter UI Component

**Files:**
- Create: `apps/web/src/components/NotificationCenter.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (add to header)

**Step 1: Create NotificationCenter component**

Create `apps/web/src/components/NotificationCenter.tsx`:

```typescript
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

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (n: Notification) => void }) {
  return (
    <UnstyledButton
      onClick={() => onRead(notification)}
      p="sm"
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        backgroundColor: notification.isRead ? undefined : 'var(--mantine-color-blue-0)',
      }}
      w="100%"
    >
      <Group wrap="nowrap" gap="sm">
        <Text size="lg">{typeIcons[notification.type] || '🔔'}</Text>
        <Stack gap={2} style={{ flex: 1 }}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={notification.isRead ? 400 : 600} lineClamp={1}>
              {notification.title}
            </Text>
            {!notification.isRead && (
              <Badge size="xs" circle color="blue" variant="filled">
                {' '}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={2}>{notification.body}</Text>
          <Text size="xs" c="dimmed">{dayjs(notification.createdAt).fromNow()}</Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

export function NotificationCenter() {
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const { data: notificationData, isLoading, refetch } = useNotifications({ limit: 20 });
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
          <Text fw={600} size="sm">Notifications</Text>
          {unreadCount > 0 && (
            <UnstyledButton onClick={() => markAllAsRead.mutate()}>
              <Group gap={4}>
                <IconCheck size={14} />
                <Text size="xs" c="blue">Mark all read</Text>
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
```

**Step 2: Add NotificationCenter to app header**

In `apps/web/src/app/(app)/layout.tsx`, import and add to the header:

Add import:
```typescript
import { NotificationCenter } from '@/components/NotificationCenter';
```

In the header `<Group>` on the right side, add before the "Add Expense" button:

```tsx
<Group>
  {isMobile && <FamilySwitcher families={families} />}
  <NotificationCenter />
  <ActionIcon
    component={Link}
    href="/expenses/add"
    ...
  >
```

**Step 3: Verify build**

```bash
pnpm --filter web build
```

**Step 4: Commit**

```bash
git add apps/web/src/components/NotificationCenter.tsx apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add notification center with bell icon, popover, and unread badge"
```

---

## Summary of All Tasks

| # | Phase | Task | Key Files |
|---|-------|------|-----------|
| 1 | 1 | Service worker with next-pwa | `next.config.ts`, `.gitignore` |
| 2 | 1 | Optimistic updates on mutations | `useExpenses.ts` |
| 3 | 1 | PWA install prompt | `InstallPrompt.tsx`, `(app)/layout.tsx` |
| 4 | 2 | Page transitions | `PageTransition.tsx`, `(app)/layout.tsx` |
| 5 | 2 | Skeleton loaders | `skeletons/*.tsx`, page files |
| 6 | 2 | Empty states | `EmptyState.tsx`, `expenses/page.tsx` |
| 7 | 2 | Pull-to-refresh | `PullToRefresh.tsx`, `(app)/layout.tsx` |
| 8 | 2 | Swipe-to-delete | `SwipeableExpenseCard.tsx`, `expenses/page.tsx` |
| 9 | 2 | Delete with undo | `useDeleteWithUndo.ts`, `expenses/page.tsx` |
| 10 | 2 | Error fallback + nav progress | `ErrorFallback.tsx`, `(app)/layout.tsx` |
| 11 | 3 | Network status + offline banner | `useNetworkStatus.ts`, `OfflineBanner.tsx` |
| 12 | 3 | Offline mutation config | `queryClient.ts`, `useExpenses.ts` |
| 13 | 3 | Mutation persistence | `providers.tsx`, `useExpenses.ts` |
| 14 | 4 | Notification model + migration | `schema.prisma` |
| 15 | 4 | NotificationService + tests | `notification.service.ts`, `.spec.ts` |
| 16 | 4 | NotificationController + module | `controller.ts`, `module.ts`, `dto/` |
| 17 | 4 | Notification triggers | `expense.service.ts`, `family.service.ts` |
| 18 | 4 | useNotifications hook | `useNotifications.ts`, `types.ts` |
| 19 | 4 | NotificationCenter UI | `NotificationCenter.tsx`, `(app)/layout.tsx` |
