# Next.js Web App Design

## Overview

A mobile-first responsive Next.js web application for Budgety, deployed as a PWA on Dokploy. Full feature parity with the existing Expo mobile app. Uses Mantine for UI and Mantine Charts for data visualization.

## Tech Stack

- **Next.js 15** — App Router, standalone output for Dokploy
- **Mantine v7** — UI components, responsive utilities
- **Mantine Charts** — Built on Recharts, consistent Mantine theming
- **TanStack Query v5** — Server state management (mirrors mobile patterns)
- **BetterAuth React client** — Cookie-based session auth (email/password only)
- **next-pwa / @serwist/next** — Service worker, manifest, offline caching
- **Zustand** — Client state (active family ID, UI preferences)

App lives at `apps/web/` in the monorepo.

## Architecture

### Data Fetching

All client-side via TanStack Query hitting the NestJS API directly. No SSR for data — the app is fully authenticated with no public pages. Pages use `"use client"` with query hooks.

### API Communication

Same domain behind a reverse proxy. Next.js serves the frontend, `/api/*` routes are proxied to the NestJS backend. `NEXT_PUBLIC_API_URL` env var configures the base URL.

### Auth Flow

- BetterAuth React client (`createAuthClient`) with cookie-based sessions
- Next.js middleware checks session cookie, redirects unauthenticated users to `/login`
- On 401 API response, redirect to login and clear session
- Login/signup pages redirect to `/` if already authenticated

### API Client

- Thin wrapper around `fetch` with base URL from env
- `credentials: 'include'` for session cookies
- Response interceptor for 401 handling
- TypeScript types for all request/response shapes (manually defined, matching API DTOs)

## Navigation & Layout

### Mobile (< 768px)

- Top header bar: app title, active family name, user avatar
- Bottom tab bar: Dashboard, Expenses, Reports, Settings
- FAB for "Add Expense" on Dashboard and Expenses tabs
- Full viewport pages between header and bottom tabs

### Desktop (>= 768px)

- Fixed left sidebar (~240px) with nav links, family switcher, user profile at bottom
- Sidebar collapsible to icon-only mode (~60px)
- Main content area with max-width container
- "Add Expense" as a prominent button in sidebar or page header

### Route Structure

```
app/
  layout.tsx          — Root: Providers (Mantine, QueryClient, Auth)
  (auth)/
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx        — Authenticated shell: sidebar/bottom tabs
    page.tsx          — Dashboard
    expenses/
      page.tsx        — Expense list with filters
      add/page.tsx    — Add expense form
      [id]/page.tsx   — Expense detail/edit
    reports/page.tsx  — All 6 report charts
    settings/
      page.tsx        — Settings overview
      family/page.tsx — Family management
      budget/page.tsx — Budget management
      recurring/page.tsx — Recurring expenses
      categories/page.tsx — Category management
      profile/page.tsx — User profile
```

## Pages & Features

### Dashboard (`/`)

- Monthly budget progress bar (spent vs budget, color-coded)
- Budget utilization summary by top categories
- Recent expenses list (last 5-10)
- Quick stats: total spent this month, daily average, days remaining
- Family member spending breakdown (mini cards)

### Expenses (`/expenses`)

- Filterable list: date range, category, member
- Sort by date or amount
- Infinite scroll pagination
- Expense card: amount (INR formatted), description, category icon/name, date, who added it
- Swipe-to-delete on mobile, hover delete button on desktop
- **Add** (`/expenses/add`): amount, description, date picker, category picker, optional recurring toggle
- **Detail** (`/expenses/[id]`): view/edit form, delete with confirmation

### Reports (`/reports`)

Month selector at top. Six chart sections stacked vertically:

1. **Category Split** — Donut/pie chart (Mantine PieChart)
2. **Daily Spending** — Bar chart (Mantine BarChart)
3. **Monthly Trend** — Line/area chart (Mantine LineChart)
4. **Budget Utilization** — Progress bars per category (Mantine Progress)
5. **Member Spending** — Horizontal bar chart or cards per member
6. **Top Expenses** — Ranked list with amounts

### Settings

- **Profile** — Display name, avatar, email (read-only)
- **Family Management** — List families, create/join, member list with roles, invite codes, remove members
- **Budget Management** — Overall monthly budget, per-category limits with month selector
- **Recurring Expenses** — List, create, edit, toggle active, delete
- **Categories** — Defaults + custom, CRUD for custom (admin only)
- Logout

## State Management

### Server State (TanStack Query)

- Query key convention: `['families', familyId, 'resource', ...params]`
- Hooks: `useExpenses`, `useBudgets`, `useReports`, `useCategories`, `useRecurringExpenses`, `useFamilies`, `useUser`
- Optimistic updates for expense create/edit/delete
- Infinite query for expense list pagination
- Query invalidation on mutations (expense change invalidates expenses + reports + budgets)
- Stale time: 30s for frequently changing data, 5min for stable data

### Client State (Zustand)

- Active family ID (persisted to localStorage)
- Sidebar collapsed state
- UI preferences

## PWA Configuration

- Web app manifest: name "Budgety", `display: standalone`, `orientation: portrait`
- Caching strategies:
  - App shell (HTML, JS, CSS, fonts) — Cache first
  - API GET requests — Network first, fallback to cache
  - Static assets — Cache first
- Install prompt: banner suggesting "Add to Home Screen" on first visit
- Offline banner when no network connection
- Offline mutation queuing out of scope for v1

## Deployment (Dokploy)

- Next.js standalone output mode (`output: 'standalone'`)
- Build: `pnpm install --frozen-lockfile && pnpm --filter web build`
- Run: `node apps/web/.next/standalone/server.js`
- Env vars: `NEXT_PUBLIC_API_URL`, `NODE_ENV`
- Reverse proxy: Dokploy routes `/api/*` to NestJS, everything else to Next.js

## Monorepo Integration

- `apps/web/` — already covered by `apps/*` glob in `pnpm-workspace.yaml`
- New tsconfig preset `nextjs.json` in `packages/typescript-config`
- Turbo tasks: `dev`, `build`, `lint` in `apps/web/package.json`
- Root script: `pnpm dev:web` added to root `package.json`

## Design Principles

- **Mobile-first**: All components designed for ~375px, then enhanced for tablet (768px) and desktop (1024px+)
- **INR formatting**: Indian comma grouping (1,00,000) via shared `formatINR` utility
- **Money precision**: Floats truncated to 2 decimals (not rounded), matching API behavior
- **Consistency**: Mirror mobile app patterns (query keys, optimistic updates, auth flow)
