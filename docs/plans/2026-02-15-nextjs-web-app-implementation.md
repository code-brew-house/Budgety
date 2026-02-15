# Next.js Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first responsive Next.js web application for Budgety with full feature parity to the mobile app, deployed as a PWA on Dokploy.

**Architecture:** Next.js 15 App Router with client-side data fetching via TanStack Query, Mantine v7 UI with adaptive layout (bottom tabs on mobile, sidebar on desktop), BetterAuth cookie-based sessions, and PWA support via next-pwa.

**Tech Stack:** Next.js 15, Mantine v7, Mantine Charts, TanStack Query v5, BetterAuth React client, Zustand, Tabler Icons, next-pwa

---

### Task 1: Scaffold Next.js App & Install Dependencies

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`

**Step 1: Create the Next.js app via create-next-app**

Run from repo root:
```bash
cd apps && pnpm create next-app@latest web --typescript --eslint --app --src-dir --no-tailwind --no-turbopack --import-alias "@/*"
```

Select defaults when prompted. This creates `apps/web/` with App Router structure.

**Step 2: Install Mantine and project dependencies**

Run from `apps/web`:
```bash
pnpm add @mantine/core @mantine/hooks @mantine/charts @mantine/dates @mantine/form @mantine/notifications @mantine/nprogress recharts dayjs @tabler/icons-react @tanstack/react-query better-auth zustand
```

```bash
pnpm add -D postcss postcss-preset-mantine postcss-simple-vars
```

**Step 3: Configure PostCSS for Mantine**

Create `apps/web/postcss.config.mjs`:
```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};

export default config;
```

**Step 4: Configure next.config.ts**

Replace `apps/web/next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
```

**Step 5: Configure tsconfig.json**

Replace `apps/web/tsconfig.json`:
```json
{
  "extends": "@budgety/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 6: Verify it compiles**

Run: `cd apps/web && pnpm dev`
Expected: Dev server starts on port 3000 (may conflict with API — we'll fix port later)

Stop the server (Ctrl+C).

**Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js app with Mantine dependencies"
```

---

### Task 2: Shared TypeScript Config for Next.js

**Files:**
- Create: `packages/typescript-config/nextjs.json`

**Step 1: Create the Next.js tsconfig preset**

Create `packages/typescript-config/nextjs.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  }
}
```

**Step 2: Verify the web app still compiles with the shared preset**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/typescript-config/nextjs.json
git commit -m "feat(typescript-config): add Next.js tsconfig preset"
```

---

### Task 3: Monorepo Integration

**Files:**
- Modify: `package.json` (root)
- Modify: `turbo.json`
- Modify: `apps/web/package.json`

**Step 1: Add dev:web script to root package.json**

Add to root `package.json` scripts:
```json
"dev:web": "turbo run dev --filter=web"
```

**Step 2: Update turbo.json to include .next output**

Update the `build` task outputs in `turbo.json`:
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".expo/**", ".next/**"]
}
```

**Step 3: Set web dev port to 3001 to avoid API conflict**

In `apps/web/package.json`, update the dev script:
```json
"dev": "next dev -p 3001"
```

**Step 4: Verify monorepo commands work**

Run from repo root: `pnpm dev:web`
Expected: Next.js dev server starts on port 3001

**Step 5: Commit**

```bash
git add package.json turbo.json apps/web/package.json
git commit -m "feat: integrate web app into monorepo with turbo"
```

---

### Task 4: API Client & TypeScript Types

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/formatINR.ts`

**Step 1: Create the API fetch wrapper**

Create `apps/web/src/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }

  return res.json();
}
```

**Step 2: Create type definitions**

Create `apps/web/src/lib/types.ts` — copy the types from the mobile app since they share the same API:
```typescript
export interface Family {
  id: string;
  name: string;
  currency: string;
  monthlyBudget: number | null;
  largeExpenseThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface FamilyDetail extends Family {
  members: FamilyMember[];
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  familyId: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  familyId: string;
  createdById: string;
  category: { id: string; name: string; icon: string | null };
  createdBy: { id: string; name: string; displayName: string | null; avatarUrl: string | null };
}

export interface PaginatedExpenses {
  data: Expense[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategoryBudget {
  id: string;
  amount: number;
  month: string;
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
}

export interface BudgetData {
  overallBudget: number | null;
  categoryBudgets: CategoryBudget[];
}

export interface MemberSpending {
  month: string;
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
  members: {
    userId: string;
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalSpent: number;
    percentOfTotal: number;
    topCategories: {
      categoryId: string;
      name: string;
      icon: string | null;
      amount: number;
    }[];
  }[];
}

export interface BudgetUtilization {
  month: string;
  categories: {
    categoryId: string;
    name: string;
    icon: string | null;
    budgeted: number;
    spent: number;
    utilizationPercent: number;
  }[];
}

export interface CategorySplit {
  month: string;
  categories: {
    categoryId: string;
    name: string;
    icon: string | null;
    amount: number;
    percent: number;
  }[];
}

export interface DailySpending {
  month: string;
  days: {
    date: string;
    amount: number;
  }[];
}

export interface MonthlyTrend {
  months: {
    month: string;
    amount: number;
  }[];
}

export interface TopExpenses {
  month: string;
  expenses: Expense[];
}

export interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  familyId: string;
  createdById: string;
  category: { id: string; name: string; icon: string | null };
  createdBy: { id: string; name: string; displayName: string | null; avatarUrl: string | null };
}

export interface PaginatedRecurringExpenses {
  data: RecurringExpense[];
  total: number;
  page: number;
  limit: number;
}

export interface Invite {
  code: string;
  expiresAt: string;
}
```

**Step 3: Create INR formatting utility**

Create `apps/web/src/lib/formatINR.ts`:
```typescript
/** Indian comma grouping: last 3 digits, then groups of 2. "100000" → "1,00,000" */
export function formatINR(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length <= 3) return digits;

  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

/** Remove commas for numeric submission */
export function stripINRFormatting(value: string): string {
  return value.replace(/,/g, '');
}

/** Format a number as ₹ with Indian grouping */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/
git commit -m "feat(web): add API client, type definitions, and INR formatting"
```

---

### Task 5: Auth Client & Zustand Stores

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/stores/authStore.ts`
- Create: `apps/web/src/stores/familyStore.ts`

**Step 1: Create BetterAuth React client**

Create `apps/web/src/lib/auth.ts`:
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Step 2: Create auth store**

Create `apps/web/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));
```

**Step 3: Create family store with localStorage persistence**

Create `apps/web/src/stores/familyStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      setActiveFamilyId: (id) => set({ activeFamilyId: id }),
    }),
    { name: 'budgety-family' },
  ),
);
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/stores/
git commit -m "feat(web): add BetterAuth client and Zustand stores"
```

---

### Task 6: Auth Middleware & Pages

**Files:**
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/signup/page.tsx`

**Step 1: Create Next.js middleware for auth redirects**

Create `apps/web/src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!sessionCookie && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
};
```

**Step 2: Create auth layout**

Create `apps/web/src/app/(auth)/layout.tsx`:
```tsx
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
```

**Step 3: Create login page**

Create `apps/web/src/app/(auth)/login/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { authClient } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (authError) {
        setError(authError.message || 'Login failed');
        return;
      }
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Title ta="center" mb={4}>Budgety</Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Sign in to your account
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <TextInput
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        mb="md"
        {...form.getInputProps('email')}
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        autoComplete="current-password"
        mb="lg"
        {...form.getInputProps('password')}
      />

      <Button type="submit" fullWidth loading={loading}>
        Sign In
      </Button>

      <Text c="dimmed" size="sm" ta="center" mt="md">
        Don&apos;t have an account?{' '}
        <Anchor href="/signup" fw={500}>Sign Up</Anchor>
      </Text>
    </form>
  );
}
```

**Step 4: Create signup page**

Create `apps/web/src/app/(auth)/signup/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { authClient } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : 'Name is required'),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (authError) {
        setError(authError.message || 'Signup failed');
        return;
      }
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Title ta="center" mb={4}>Budgety</Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Create your account
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <TextInput
        label="Name"
        placeholder="Your name"
        autoComplete="name"
        mb="md"
        {...form.getInputProps('name')}
      />

      <TextInput
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        mb="md"
        {...form.getInputProps('email')}
      />

      <PasswordInput
        label="Password"
        placeholder="Min 8 characters"
        autoComplete="new-password"
        mb="lg"
        {...form.getInputProps('password')}
      />

      <Button type="submit" fullWidth loading={loading}>
        Sign Up
      </Button>

      <Text c="dimmed" size="sm" ta="center" mt="md">
        Already have an account?{' '}
        <Anchor href="/login" fw={500}>Sign In</Anchor>
      </Text>
    </form>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/app/\(auth\)/
git commit -m "feat(web): add auth middleware, login, and signup pages"
```

---

### Task 7: Root Layout with Providers

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/lib/queryClient.ts`
- Create: `apps/web/src/app/providers.tsx`

**Step 1: Create query client**

Create `apps/web/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
      },
      mutations: {
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: error.message,
            color: 'red',
          });
        },
      },
    },
  });
}
```

**Step 2: Create providers component**

Create `apps/web/src/app/providers.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Notifications } from '@mantine/notifications';
import { makeQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Notifications position="top-right" />
      {children}
    </QueryClientProvider>
  );
}
```

**Step 3: Update root layout**

Replace `apps/web/src/app/layout.tsx`:
```tsx
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';

import type { Metadata, Viewport } from 'next';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Budgety',
  description: 'Family budget tracker',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#228be6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="light">
          <Providers>{children}</Providers>
        </MantineProvider>
      </body>
    </html>
  );
}
```

**Step 4: Remove the default Next.js page and globals**

Delete `apps/web/src/app/page.tsx` and `apps/web/src/app/globals.css` (we use Mantine instead).

Create a minimal `apps/web/src/app/page.tsx` redirect:
```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add root layout with Mantine, TanStack Query, and notifications"
```

---

### Task 8: App Shell — Adaptive Sidebar + Bottom Tabs

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/AppNavbar.tsx`
- Create: `apps/web/src/components/BottomTabs.tsx`
- Create: `apps/web/src/components/FamilySwitcher.tsx`

This is the core layout task. Mantine's `AppShell` provides the adaptive shell with header, navbar, and footer sections.

**Step 1: Create the family switcher component**

Create `apps/web/src/components/FamilySwitcher.tsx`:
```tsx
'use client';

import { Menu, Button, Text } from '@mantine/core';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFamilyStore } from '@/stores/familyStore';
import type { Family } from '@/lib/types';

interface FamilySwitcherProps {
  families: Family[] | undefined;
}

export function FamilySwitcher({ families }: FamilySwitcherProps) {
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();
  const queryClient = useQueryClient();
  const activeFamily = families?.find((f) => f.id === activeFamilyId);

  const handleSwitch = (familyId: string) => {
    setActiveFamilyId(familyId);
    queryClient.invalidateQueries();
  };

  if (!families?.length) return null;

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="subtle" rightSection={<IconChevronDown size={14} />} size="compact-sm">
          {activeFamily?.name ?? 'Select Family'}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {families.map((f) => (
          <Menu.Item
            key={f.id}
            onClick={() => handleSwitch(f.id)}
            rightSection={f.id === activeFamilyId ? <IconCheck size={14} /> : null}
          >
            {f.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
```

**Step 2: Create the sidebar navbar component (desktop)**

Create `apps/web/src/components/AppNavbar.tsx`:
```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NavLink, Stack, Divider, Text } from '@mantine/core';
import {
  IconHome,
  IconReceipt,
  IconChartBar,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';
import { authClient } from '@/lib/auth';
import { FamilySwitcher } from './FamilySwitcher';
import type { Family } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: IconHome },
  { href: '/expenses', label: 'Expenses', icon: IconReceipt },
  { href: '/reports', label: 'Reports', icon: IconChartBar },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

interface AppNavbarProps {
  families: Family[] | undefined;
}

export function AppNavbar({ families }: AppNavbarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  return (
    <Stack justify="space-between" h="100%">
      <Stack gap={0}>
        <FamilySwitcher families={families} />
        <Divider my="sm" />
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            leftSection={<item.icon size={20} stroke={1.5} />}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </Stack>
      <NavLink
        label="Logout"
        leftSection={<IconLogout size={20} stroke={1.5} />}
        onClick={handleLogout}
        c="red"
      />
    </Stack>
  );
}
```

**Step 3: Create the bottom tabs component (mobile)**

Create `apps/web/src/components/BottomTabs.tsx`:
```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Group, UnstyledButton, Text, Stack } from '@mantine/core';
import {
  IconHome,
  IconReceipt,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: IconHome },
  { href: '/expenses', label: 'Expenses', icon: IconReceipt },
  { href: '/reports', label: 'Reports', icon: IconChartBar },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <Group grow h="100%" px="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <UnstyledButton key={tab.href} component={Link} href={tab.href} py="xs">
            <Stack align="center" gap={2}>
              <tab.icon
                size={22}
                stroke={1.5}
                color={isActive ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'}
              />
              <Text
                size="xs"
                c={isActive ? 'blue.6' : 'gray.6'}
                fw={isActive ? 600 : 400}
              >
                {tab.label}
              </Text>
            </Stack>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
```

**Step 4: Create the app layout with adaptive shell**

Create `apps/web/src/app/(app)/layout.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { AppShell, Burger, Group, Text, ActionIcon, Box } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/AppNavbar';
import { BottomTabs } from '@/components/BottomTabs';
import { FamilySwitcher } from '@/components/FamilySwitcher';
import { useFamilies } from '@/hooks/useFamilies';
import { useFamilyStore } from '@/stores/familyStore';
import { useSession } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: families } = useFamilies();
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  // Auto-select first family if none selected
  useEffect(() => {
    if (families?.length && !activeFamilyId) {
      setActiveFamilyId(families[0].id);
    }
  }, [families, activeFamilyId, setActiveFamilyId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace('/login');
    }
  }, [session, sessionPending, router]);

  if (sessionPending) {
    return null;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        isMobile
          ? { width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }
          : { width: 260, breakpoint: 'sm' }
      }
      footer={isMobile ? { height: 60 } : undefined}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            {isMobile && (
              <Burger opened={opened} onClick={toggle} size="sm" />
            )}
            <Text fw={700} size="lg">Budgety</Text>
          </Group>
          <Group>
            {isMobile && <FamilySwitcher families={families} />}
            <ActionIcon
              component={Link}
              href="/expenses/add"
              variant="filled"
              size="lg"
              radius="xl"
              aria-label="Add expense"
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppNavbar families={families} />
      </AppShell.Navbar>

      {isMobile && (
        <AppShell.Footer>
          <BottomTabs />
        </AppShell.Footer>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
```

**Step 5: Create placeholder dashboard page**

Create `apps/web/src/app/(app)/dashboard/page.tsx`:
```tsx
import { Title } from '@mantine/core';

export default function DashboardPage() {
  return <Title order={2}>Dashboard</Title>;
}
```

**Step 6: Update root page redirect to dashboard**

Ensure `apps/web/src/app/page.tsx` redirects to `/dashboard`:
```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

**Step 7: Verify the layout**

Run: `cd apps/web && pnpm dev`
Visit `http://localhost:3001`. You should be redirected to `/login`. After logging in, you should see the adaptive shell with sidebar (desktop) or bottom tabs (mobile).

**Step 8: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add adaptive app shell with sidebar and bottom tabs"
```

---

### Task 9: Query Hooks

**Files:**
- Create: `apps/web/src/hooks/useFamilies.ts`
- Create: `apps/web/src/hooks/useExpenses.ts`
- Create: `apps/web/src/hooks/useCategories.ts`
- Create: `apps/web/src/hooks/useBudgets.ts`
- Create: `apps/web/src/hooks/useReports.ts`
- Create: `apps/web/src/hooks/useRecurringExpenses.ts`
- Create: `apps/web/src/hooks/useUser.ts`

Port all hooks from the mobile app. The patterns are identical — only the import paths change (`@/lib/api` and `@/lib/types` instead of mobile equivalents).

**Step 1: Create useFamilies hook**

Create `apps/web/src/hooks/useFamilies.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Family, FamilyDetail, Invite } from '@/lib/types';

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => apiFetch<Family[]>('/families'),
  });
}

export function useFamilyDetail(familyId: string | null) {
  return useQuery({
    queryKey: ['families', familyId],
    queryFn: () => apiFetch<FamilyDetail>(`/families/${familyId}`),
    enabled: !!familyId,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; currency?: string; monthlyBudget?: number }) =>
      apiFetch<Family>('/families', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useUpdateFamily(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; currency?: string; monthlyBudget?: number; largeExpenseThreshold?: number }) =>
      apiFetch<Family>(`/families/${familyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useDeleteFamily(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/families/${familyId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useJoinFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<Family>('/families/join', { method: 'POST', body: JSON.stringify({ code }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useCreateInvite(familyId: string) {
  return useMutation({
    mutationFn: () => apiFetch<Invite>(`/families/${familyId}/invites`, { method: 'POST' }),
  });
}

export function useUpdateMemberRole(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'ADMIN' | 'MEMBER' }) =>
      apiFetch(`/families/${familyId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families', familyId] }); },
  });
}

export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/families/${familyId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['families', familyId] }); },
  });
}
```

**Step 2: Create useExpenses hook**

Create `apps/web/src/hooks/useExpenses.ts` — same as mobile's `hooks/useExpenses.ts` but with web imports:
```typescript
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Expense, PaginatedExpenses } from '@/lib/types';

interface ExpenseFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  createdById?: string;
  sort?: 'date' | 'createdAt';
}

export function useExpenses(familyId: string | null, filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.createdById) params.set('createdById', filters.createdById);
  if (filters.sort) params.set('sort', filters.sort);
  const query = params.toString();

  return useQuery({
    queryKey: ['expenses', familyId, filters],
    queryFn: () => apiFetch<PaginatedExpenses>(`/families/${familyId}/expenses${query ? `?${query}` : ''}`),
    enabled: !!familyId,
  });
}

export function useInfiniteExpenses(familyId: string | null, filters: Omit<ExpenseFilters, 'page'> = {}) {
  const buildParams = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.createdById) params.set('createdById', filters.createdById);
    if (filters.sort) params.set('sort', filters.sort);
    return params.toString();
  };

  return useInfiniteQuery({
    queryKey: ['expenses-infinite', familyId, filters],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<PaginatedExpenses>(`/families/${familyId}/expenses?${buildParams(pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return totalFetched < lastPage.meta.total ? allPages.length + 1 : undefined;
    },
    enabled: !!familyId,
  });
}

export function useExpense(familyId: string | null, expenseId: string | null) {
  return useQuery({
    queryKey: ['expenses', familyId, expenseId],
    queryFn: () => apiFetch<Expense>(`/families/${familyId}/expenses/${expenseId}`),
    enabled: !!familyId && !!expenseId,
  });
}

export function useCreateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description: string; date: string; categoryId: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useUpdateExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string; date?: string; categoryId?: string }) =>
      apiFetch<Expense>(`/families/${familyId}/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}

export function useDeleteExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/families/${familyId}/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-infinite', familyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId] });
      queryClient.invalidateQueries({ queryKey: ['reports', familyId] });
    },
  });
}
```

**Step 3: Create remaining hooks**

Create `apps/web/src/hooks/useCategories.ts`, `apps/web/src/hooks/useBudgets.ts`, `apps/web/src/hooks/useReports.ts`, `apps/web/src/hooks/useRecurringExpenses.ts` — port directly from mobile equivalents, changing only import paths from `@/lib/api` and `@/lib/types`.

Create `apps/web/src/hooks/useUser.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface User {
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  createdAt: string;
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => apiFetch<User>('/users/me'),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { displayName?: string; avatarUrl?: string }) =>
      apiFetch<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user'] }); },
  });
}
```

**Step 4: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(web): add all TanStack Query hooks"
```

---

### Task 10: Dashboard Page

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Step 1: Build the full dashboard**

Replace `apps/web/src/app/(app)/dashboard/page.tsx`:
```tsx
'use client';

import {
  Title,
  Text,
  Card,
  Group,
  Stack,
  Progress,
  SimpleGrid,
  Skeleton,
  Badge,
} from '@mantine/core';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyDetail } from '@/hooks/useFamilies';
import { useExpenses } from '@/hooks/useExpenses';
import { useMemberSpending } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatINR';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const month = getCurrentMonth();
  const { data: family } = useFamilyDetail(activeFamilyId);
  const { data: spending, isPending: spendingPending } = useMemberSpending(activeFamilyId, month);
  const { data: recentExpenses, isPending: expensesPending } = useExpenses(activeFamilyId, {
    limit: 10,
    sort: 'createdAt',
  });

  if (!activeFamilyId) {
    return (
      <Stack align="center" justify="center" mih={300}>
        <Title order={3}>Welcome to Budgety</Title>
        <Text c="dimmed">Create or join a family in Settings to get started.</Text>
      </Stack>
    );
  }

  const hasBudget = (family?.monthlyBudget ?? 0) > 0;
  const totalSpent = spending?.totalSpent ?? 0;
  const totalBudget = spending?.totalBudget ?? 0;
  const utilization = spending?.utilizationPercent ?? 0;
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = new Date().getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyAvg = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;

  const progressColor = utilization > 90 ? 'red' : utilization > 70 ? 'yellow' : 'blue';

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      {/* Budget Progress */}
      {hasBudget && (
        <Card withBorder>
          <Text fw={500} mb="xs">Monthly Budget</Text>
          <Progress value={Math.min(utilization, 100)} color={progressColor} size="lg" radius="md" />
          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">{formatCurrency(totalSpent)} spent</Text>
            <Text size="sm" c="dimmed">{formatCurrency(totalBudget)} budget</Text>
          </Group>
        </Card>
      )}

      {/* Quick Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Spent</Text>
          <Text size="xl" fw={700}>{formatCurrency(totalSpent)}</Text>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Daily Avg</Text>
          <Text size="xl" fw={700}>{formatCurrency(Math.round(dailyAvg))}</Text>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Days Left</Text>
          <Text size="xl" fw={700}>{daysRemaining}</Text>
        </Card>
        {hasBudget && (
          <Card withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Remaining</Text>
            <Text size="xl" fw={700} c={totalBudget - totalSpent < 0 ? 'red' : undefined}>
              {formatCurrency(Math.max(totalBudget - totalSpent, 0))}
            </Text>
          </Card>
        )}
      </SimpleGrid>

      {/* Member Spending */}
      {spending?.members && spending.members.length > 0 && (
        <Card withBorder>
          <Text fw={500} mb="sm">Member Spending</Text>
          <Stack gap="xs">
            {spending.members.map((m) => (
              <Group key={m.userId} justify="space-between">
                <Text size="sm">{m.displayName || m.name}</Text>
                <Group gap="xs">
                  <Text size="sm" fw={500}>{formatCurrency(m.totalSpent)}</Text>
                  <Badge size="sm" variant="light">{m.percentOfTotal.toFixed(0)}%</Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card withBorder>
        <Text fw={500} mb="sm">Recent Expenses</Text>
        {expensesPending ? (
          <Stack gap="xs">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </Stack>
        ) : (
          <Stack gap="xs">
            {recentExpenses?.data.map((expense) => (
              <Group key={expense.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>{expense.description}</Text>
                  <Text size="xs" c="dimmed">
                    {expense.category?.name} &middot; {expense.createdBy?.displayName || expense.createdBy?.name}
                  </Text>
                </div>
                <Text size="sm" fw={600}>{formatCurrency(expense.amount)}</Text>
              </Group>
            ))}
            {recentExpenses?.data.length === 0 && (
              <Text size="sm" c="dimmed" ta="center">No expenses yet</Text>
            )}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/
git commit -m "feat(web): add dashboard page with budget progress and recent expenses"
```

---

### Task 11: Expenses Pages

**Files:**
- Create: `apps/web/src/app/(app)/expenses/page.tsx`
- Create: `apps/web/src/app/(app)/expenses/add/page.tsx`
- Create: `apps/web/src/app/(app)/expenses/[id]/page.tsx`

**Step 1: Create expense list page**

Create `apps/web/src/app/(app)/expenses/page.tsx`:
```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Title,
  Card,
  Group,
  Text,
  Stack,
  Select,
  ActionIcon,
  Loader,
  Center,
  Menu,
  Modal,
  Button,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconEdit, IconDots } from '@tabler/icons-react';
import Link from 'next/link';
import { useInfiniteExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyDetail } from '@/hooks/useFamilies';
import { formatCurrency } from '@/lib/formatINR';
import { notifications } from '@mantine/notifications';

export default function ExpensesPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: categories } = useCategories(activeFamilyId);
  const { data: family } = useFamilyDetail(activeFamilyId);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const filters = {
    limit: 20,
    sort: 'date' as const,
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    ...(startDate ? { startDate: startDate.toISOString().split('T')[0] } : {}),
    ...(endDate ? { endDate: endDate.toISOString().split('T')[0] } : {}),
  };

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteExpenses(activeFamilyId, filters);
  const deleteExpense = useDeleteExpense(activeFamilyId!);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const expenses = data?.pages.flatMap((p) => p.data) ?? [];

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteExpense.mutate(deleteTarget, {
      onSuccess: () => {
        notifications.show({ title: 'Deleted', message: 'Expense deleted', color: 'green' });
        closeDelete();
      },
    });
  };

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Stack>
      <Title order={2}>Expenses</Title>

      {/* Filters */}
      <Group>
        <Select
          placeholder="All categories"
          data={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          size="sm"
        />
        <DatePickerInput placeholder="Start date" value={startDate} onChange={setStartDate} clearable size="sm" />
        <DatePickerInput placeholder="End date" value={endDate} onChange={setEndDate} clearable size="sm" />
      </Group>

      {/* Expense List */}
      {isPending ? (
        <Center><Loader /></Center>
      ) : expenses.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No expenses found</Text>
      ) : (
        <Stack gap="xs">
          {expenses.map((expense, i) => {
            const isLarge =
              family?.largeExpenseThreshold != null &&
              expense.amount >= family.largeExpenseThreshold;
            return (
              <Card
                key={expense.id}
                withBorder
                ref={i === expenses.length - 1 ? lastElementRef : undefined}
                style={isLarge ? { borderColor: 'var(--mantine-color-yellow-5)' } : undefined}
              >
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ flex: 1 }}>
                    {isLarge && (
                      <Text size="xs" fw={600} c="yellow.7">Large Expense</Text>
                    )}
                    <Text fw={500}>{expense.description}</Text>
                    <Text size="xs" c="dimmed">
                      {expense.category?.name} &middot;{' '}
                      {expense.createdBy?.displayName || expense.createdBy?.name} &middot;{' '}
                      {new Date(expense.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={600}>{formatCurrency(expense.amount)}</Text>
                    <Menu shadow="md" width={120}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" size="sm">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          component={Link}
                          href={`/expenses/${expense.id}`}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => { setDeleteTarget(expense.id); openDelete(); }}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Group>
              </Card>
            );
          })}
          {isFetchingNextPage && (
            <Center py="md"><Loader size="sm" /></Center>
          )}
        </Stack>
      )}

      {/* Delete Confirmation Modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Expense" centered size="sm">
        <Text size="sm" mb="lg">Are you sure you want to delete this expense?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDelete}>Cancel</Button>
          <Button color="red" onClick={handleDelete} loading={deleteExpense.isPending}>Delete</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
```

**Step 2: Create add expense page**

Create `apps/web/src/app/(app)/expenses/add/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Title,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Switch,
  Group,
  Card,
  SegmentedControl,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useFamilyStore } from '@/stores/familyStore';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useCreateRecurringExpense } from '@/hooks/useRecurringExpenses';
import { useCategories } from '@/hooks/useCategories';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export default function AddExpensePage() {
  const router = useRouter();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const createExpense = useCreateExpense(activeFamilyId!);
  const createRecurring = useCreateRecurringExpense(activeFamilyId!);
  const { data: categories } = useCategories(activeFamilyId);

  const [amount, setAmount] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<string>('MONTHLY');
  const [endDate, setEndDate] = useState<Date | null>(null);

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!amount || numericAmount <= 0) {
      notifications.show({ title: 'Error', message: 'Enter a valid amount', color: 'red' });
      return;
    }
    if (!description.trim()) {
      notifications.show({ title: 'Error', message: 'Enter a description', color: 'red' });
      return;
    }
    if (!categoryId) {
      notifications.show({ title: 'Error', message: 'Select a category', color: 'red' });
      return;
    }
    if (!date) {
      notifications.show({ title: 'Error', message: 'Select a date', color: 'red' });
      return;
    }

    const dateStr = date.toISOString().split('T')[0]!;

    if (isRecurring) {
      createRecurring.mutate(
        {
          amount: numericAmount,
          description: description.trim(),
          frequency,
          startDate: dateStr,
          ...(endDate ? { endDate: endDate.toISOString().split('T')[0] } : {}),
          categoryId,
        },
        {
          onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Recurring expense created', color: 'green' });
            router.back();
          },
        },
      );
    } else {
      createExpense.mutate(
        { amount: numericAmount, description: description.trim(), date: dateStr, categoryId },
        {
          onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Expense added', color: 'green' });
            router.back();
          },
        },
      );
    }
  };

  return (
    <Stack maw={500}>
      <Title order={2}>Add Expense</Title>

      <NumberInput
        label="Amount"
        placeholder="0.00"
        value={amount}
        onChange={setAmount}
        min={0}
        decimalScale={2}
        prefix="₹"
        thousandSeparator=","
        size="md"
      />

      <TextInput
        label="Description"
        placeholder="What was this expense for?"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        size="md"
      />

      <DatePickerInput label="Date" value={date} onChange={setDate} size="md" />

      <Select
        label="Category"
        placeholder="Select a category"
        data={categoryOptions}
        value={categoryId}
        onChange={setCategoryId}
        searchable
        size="md"
      />

      <Switch
        label="Make this recurring"
        checked={isRecurring}
        onChange={(e) => setIsRecurring(e.currentTarget.checked)}
      />

      {isRecurring && (
        <Card withBorder>
          <Stack>
            <SegmentedControl
              data={FREQUENCIES.map((f) => ({ value: f, label: f.charAt(0) + f.slice(1).toLowerCase() }))}
              value={frequency}
              onChange={setFrequency}
              fullWidth
            />
            <DatePickerInput label="End Date (optional)" value={endDate} onChange={setEndDate} clearable />
          </Stack>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        loading={createExpense.isPending || createRecurring.isPending}
        size="md"
        fullWidth
      >
        {isRecurring ? 'Add Recurring Expense' : 'Add Expense'}
      </Button>
    </Stack>
  );
}
```

**Step 3: Create expense detail/edit page**

Create `apps/web/src/app/(app)/expenses/[id]/page.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Title,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  Loader,
  Center,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useFamilyStore } from '@/stores/familyStore';
import { useExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: expense, isPending } = useExpense(activeFamilyId, expenseId);
  const updateExpense = useUpdateExpense(activeFamilyId!);
  const deleteExpense = useDeleteExpense(activeFamilyId!);
  const { data: categories } = useCategories(activeFamilyId);

  const [amount, setAmount] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setDescription(expense.description);
      setCategoryId(expense.categoryId);
      setDate(new Date(expense.date));
    }
  }, [expense]);

  if (isPending) return <Center><Loader /></Center>;

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

  const handleSave = () => {
    if (!date || !categoryId) return;
    updateExpense.mutate(
      {
        id: expenseId,
        amount: Number(amount),
        description: description.trim(),
        date: date.toISOString().split('T')[0],
        categoryId,
      },
      {
        onSuccess: () => {
          notifications.show({ title: 'Saved', message: 'Expense updated', color: 'green' });
          router.back();
        },
      },
    );
  };

  const handleDelete = () => {
    deleteExpense.mutate(expenseId, {
      onSuccess: () => {
        notifications.show({ title: 'Deleted', message: 'Expense deleted', color: 'green' });
        router.push('/expenses');
      },
    });
  };

  return (
    <Stack maw={500}>
      <Title order={2}>Edit Expense</Title>

      <NumberInput label="Amount" value={amount} onChange={setAmount} min={0} decimalScale={2} prefix="₹" thousandSeparator="," size="md" />
      <TextInput label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} size="md" />
      <DatePickerInput label="Date" value={date} onChange={setDate} size="md" />
      <Select label="Category" data={categoryOptions} value={categoryId} onChange={setCategoryId} searchable size="md" />

      <Group>
        <Button onClick={handleSave} loading={updateExpense.isPending} flex={1}>Save</Button>
        <Button color="red" variant="outline" onClick={handleDelete} loading={deleteExpense.isPending}>Delete</Button>
      </Group>
    </Stack>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/expenses/
git commit -m "feat(web): add expense list, add, and detail/edit pages"
```

---

### Task 12: Reports Page

**Files:**
- Create: `apps/web/src/app/(app)/reports/page.tsx`

**Step 1: Build the reports page with Mantine Charts**

Create `apps/web/src/app/(app)/reports/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import {
  Title,
  Card,
  Text,
  Stack,
  Group,
  ActionIcon,
  Progress,
  Badge,
} from '@mantine/core';
import { PieChart } from '@mantine/charts';
import { BarChart } from '@mantine/charts';
import { LineChart } from '@mantine/charts';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useFamilyStore } from '@/stores/familyStore';
import {
  useCategorySplit,
  useDailySpending,
  useMonthlyTrend,
  useBudgetUtilization,
  useMemberSpending,
  useTopExpenses,
} from '@/hooks/useReports';
import { formatCurrency } from '@/lib/formatINR';

const CHART_COLORS = [
  'blue.6', 'teal.6', 'orange.6', 'grape.6', 'pink.6',
  'cyan.6', 'lime.6', 'indigo.6', 'yellow.6', 'red.6',
  'violet.6', 'green.6',
];

function getMonthLabel(month: string) {
  const [y, m] = month.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function navigateMonth(month: string, direction: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y!, m! - 1 + direction);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  const { data: categorySplit } = useCategorySplit(activeFamilyId, month);
  const { data: dailySpending } = useDailySpending(activeFamilyId, month);
  const { data: monthlyTrend } = useMonthlyTrend(activeFamilyId, 6);
  const { data: budgetUtil } = useBudgetUtilization(activeFamilyId, month);
  const { data: memberSpending } = useMemberSpending(activeFamilyId, month);
  const { data: topExpenses } = useTopExpenses(activeFamilyId, month, 5);

  // Prepare chart data
  const pieData = categorySplit?.categories.map((c, i) => ({
    name: c.name,
    value: c.amount,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  })) ?? [];

  const barData = dailySpending?.days.map((d) => ({
    date: new Date(d.date).getDate().toString(),
    amount: d.amount,
  })) ?? [];

  const lineData = monthlyTrend?.months.map((m) => ({
    month: m.month,
    amount: m.amount,
  })) ?? [];

  return (
    <Stack>
      {/* Month Selector */}
      <Group justify="space-between">
        <Title order={2}>Reports</Title>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => setMonth(navigateMonth(month, -1))}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={500}>{getMonthLabel(month)}</Text>
          <ActionIcon variant="subtle" onClick={() => setMonth(navigateMonth(month, 1))}>
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Category Split */}
      <Card withBorder>
        <Text fw={500} mb="md">Category Split</Text>
        {pieData.length > 0 ? (
          <PieChart data={pieData} withTooltip withLabelsLine labelsType="percent" size={220} mx="auto" />
        ) : (
          <Text c="dimmed" ta="center" py="md">No data</Text>
        )}
      </Card>

      {/* Daily Spending */}
      <Card withBorder>
        <Text fw={500} mb="md">Daily Spending</Text>
        {barData.length > 0 ? (
          <BarChart h={250} data={barData} dataKey="date" series={[{ name: 'amount', color: 'blue.6' }]} />
        ) : (
          <Text c="dimmed" ta="center" py="md">No data</Text>
        )}
      </Card>

      {/* Monthly Trend */}
      <Card withBorder>
        <Text fw={500} mb="md">Monthly Trend</Text>
        {lineData.length > 0 ? (
          <LineChart h={250} data={lineData} dataKey="month" series={[{ name: 'amount', color: 'blue.6' }]} curveType="monotone" />
        ) : (
          <Text c="dimmed" ta="center" py="md">No data</Text>
        )}
      </Card>

      {/* Budget Utilization */}
      <Card withBorder>
        <Text fw={500} mb="md">Budget Utilization</Text>
        {budgetUtil?.categories && budgetUtil.categories.length > 0 ? (
          <Stack gap="sm">
            {budgetUtil.categories.map((c) => (
              <div key={c.categoryId}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{c.name}</Text>
                  <Text size="xs" c="dimmed">
                    {formatCurrency(c.spent)} / {formatCurrency(c.budgeted)}
                  </Text>
                </Group>
                <Progress
                  value={Math.min(c.utilizationPercent, 100)}
                  color={c.utilizationPercent > 90 ? 'red' : c.utilizationPercent > 70 ? 'yellow' : 'blue'}
                  size="sm"
                />
              </div>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="md">No budget data</Text>
        )}
      </Card>

      {/* Member Spending */}
      <Card withBorder>
        <Text fw={500} mb="md">Member Spending</Text>
        {memberSpending?.members && memberSpending.members.length > 0 ? (
          <Stack gap="xs">
            {memberSpending.members.map((m) => (
              <Group key={m.userId} justify="space-between">
                <Text size="sm">{m.displayName || m.name}</Text>
                <Group gap="xs">
                  <Text size="sm" fw={500}>{formatCurrency(m.totalSpent)}</Text>
                  <Badge size="sm" variant="light">{m.percentOfTotal.toFixed(0)}%</Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="md">No data</Text>
        )}
      </Card>

      {/* Top Expenses */}
      <Card withBorder>
        <Text fw={500} mb="md">Top Expenses</Text>
        {topExpenses?.expenses && topExpenses.expenses.length > 0 ? (
          <Stack gap="xs">
            {topExpenses.expenses.map((e, i) => (
              <Group key={e.id} justify="space-between">
                <Group gap="xs">
                  <Badge size="sm" variant="filled" circle>{i + 1}</Badge>
                  <div>
                    <Text size="sm" fw={500}>{e.description}</Text>
                    <Text size="xs" c="dimmed">{e.category?.name}</Text>
                  </div>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(e.amount)}</Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="md">No data</Text>
        )}
      </Card>
    </Stack>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/reports/
git commit -m "feat(web): add reports page with 6 chart sections"
```

---

### Task 13: Settings Pages

**Files:**
- Create: `apps/web/src/app/(app)/settings/page.tsx`
- Create: `apps/web/src/app/(app)/settings/profile/page.tsx`
- Create: `apps/web/src/app/(app)/settings/family/page.tsx`
- Create: `apps/web/src/app/(app)/settings/budget/page.tsx`
- Create: `apps/web/src/app/(app)/settings/recurring/page.tsx`
- Create: `apps/web/src/app/(app)/settings/categories/page.tsx`

**Step 1: Create settings overview page**

Create `apps/web/src/app/(app)/settings/page.tsx`:
```tsx
'use client';

import { Title, Stack, NavLink } from '@mantine/core';
import Link from 'next/link';
import {
  IconUser,
  IconUsers,
  IconWallet,
  IconRepeat,
  IconCategory,
  IconLogout,
} from '@tabler/icons-react';
import { authClient } from '@/lib/auth';

export default function SettingsPage() {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  return (
    <Stack maw={500}>
      <Title order={2}>Settings</Title>
      <NavLink component={Link} href="/settings/profile" label="Profile" leftSection={<IconUser size={20} />} />
      <NavLink component={Link} href="/settings/family" label="Family" leftSection={<IconUsers size={20} />} />
      <NavLink component={Link} href="/settings/budget" label="Budget" leftSection={<IconWallet size={20} />} />
      <NavLink component={Link} href="/settings/recurring" label="Recurring Expenses" leftSection={<IconRepeat size={20} />} />
      <NavLink component={Link} href="/settings/categories" label="Categories" leftSection={<IconCategory size={20} />} />
      <NavLink label="Logout" leftSection={<IconLogout size={20} />} c="red" onClick={handleLogout} />
    </Stack>
  );
}
```

**Step 2: Create profile page**

Create `apps/web/src/app/(app)/settings/profile/page.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Title, TextInput, Button, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useUser, useUpdateUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const { data: user, isPending } = useUser();
  const updateUser = useUpdateUser();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  const handleSave = () => {
    updateUser.mutate(
      { displayName },
      { onSuccess: () => { notifications.show({ title: 'Saved', message: 'Profile updated', color: 'green' }); } },
    );
  };

  return (
    <Stack maw={400}>
      <Title order={2}>Profile</Title>
      <TextInput label="Email" value={user?.email ?? ''} disabled />
      <TextInput label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} />
      <Button onClick={handleSave} loading={updateUser.isPending}>Save</Button>
    </Stack>
  );
}
```

**Step 3: Create family management page**

Create `apps/web/src/app/(app)/settings/family/page.tsx` — a full page with: list families, create family form, join family form, member management (roles, remove), invite code generation. Use Mantine `Tabs`, `Modal`, `TextInput`, `Select`, `Badge`, and `CopyButton` components. This page should:
- List all families the user belongs to
- Button to create a new family (modal with name input)
- Button to join a family (modal with invite code input)
- When a family is selected, show members with roles
- Admin actions: generate invite code, change member role, remove member

**Step 4: Create budget management page**

Create `apps/web/src/app/(app)/settings/budget/page.tsx` — page to set overall monthly budget and per-category budget limits. Use `NumberInput` for amounts, a month selector, and a list of categories with budget inputs. Uses `useSetOverallBudget` and `useUpsertCategoryBudgets` hooks.

**Step 5: Create recurring expenses page**

Create `apps/web/src/app/(app)/settings/recurring/page.tsx` — list recurring expenses with toggle switches for active/inactive, create form, edit modal, delete with confirmation. Uses `useRecurringExpenses`, `useCreateRecurringExpense`, `useUpdateRecurringExpense`, `useDeleteRecurringExpense` hooks.

**Step 6: Create categories management page**

Create `apps/web/src/app/(app)/settings/categories/page.tsx` — list all categories (defaults grayed out, custom editable), add custom category form, edit/delete custom categories (admin only). Uses `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` hooks.

**Step 7: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/
git commit -m "feat(web): add settings pages (profile, family, budget, recurring, categories)"
```

---

### Task 14: PWA Configuration

**Files:**
- Create: `apps/web/src/app/manifest.ts`
- Create: `apps/web/public/icons/icon-192x192.png`
- Create: `apps/web/public/icons/icon-512x512.png`
- Modify: `apps/web/next.config.ts`

**Step 1: Install next-pwa**

Run from `apps/web`:
```bash
pnpm add next-pwa
```

**Step 2: Create manifest file**

Create `apps/web/src/app/manifest.ts`:
```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Budgety',
    short_name: 'Budgety',
    description: 'Family budget tracker',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#228be6',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

**Step 3: Update next.config.ts with PWA**

```typescript
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

**Step 4: Generate placeholder icons**

Create simple placeholder PNG icons (192x192 and 512x512) in `apps/web/public/icons/`. These can be replaced with proper branding later.

**Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add PWA manifest and service worker configuration"
```

---

### Task 15: Environment & Deployment Config

**Files:**
- Create: `apps/web/.env.local`
- Create: `apps/web/.env.example`
- Modify: `apps/web/next.config.ts` (if needed)

**Step 1: Create environment files**

Create `apps/web/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Create `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Step 2: Add .env.local to .gitignore**

Verify `apps/web/.gitignore` includes `.env.local` (Next.js default `.gitignore` should already have this).

**Step 3: Test full build**

Run from `apps/web`:
```bash
pnpm build
```

Expected: Build succeeds with standalone output in `.next/standalone/`.

**Step 4: Verify standalone runs**

```bash
node .next/standalone/server.js
```

Expected: Server starts and serves the app.

**Step 5: Commit**

```bash
git add apps/web/.env.example
git commit -m "feat(web): add environment config and verify standalone build"
```

---

### Task 16: Final Integration & Smoke Test

**Step 1: Start the full stack**

From repo root:
```bash
pnpm dev
```

This should start both the NestJS API (port 3000) and Next.js web (port 3001).

**Step 2: Smoke test all routes**

1. Visit `http://localhost:3001` — should redirect to `/login`
2. Sign up / sign in — should redirect to `/dashboard`
3. Create a family in settings — should appear in family switcher
4. Add an expense — should appear in expense list and dashboard
5. Check reports — charts should render
6. Check all settings pages work
7. Test on mobile viewport (Chrome DevTools device mode) — bottom tabs should appear
8. Test PWA install prompt (production build only)

**Step 3: Fix any issues found during smoke testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(web): complete Next.js web app with full feature parity"
```
