# PWA Enhancements Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

Four-phase enhancement plan for the Budgety PWA (Next.js + Mantine + TanStack Query). Each phase is independently deployable.

## Phase 1: Service Worker & Performance Foundation

### Dependencies

- `@ducanh2912/next-pwa` — Workbox-based service worker generation for Next.js

### Service Worker Configuration

Wrap `next.config.ts` with `withPWA()`:

- **Precache:** App shell (HTML, JS, CSS, fonts, icons)
- **Runtime cache strategies:**
  - `/api/auth/*` — NetworkOnly (never cache auth)
  - `GET /families/*/expenses*`, `GET /families/*/reports*` — NetworkFirst, fallback to cache (30s TTL)
  - Static assets (`/_next/static/*`, images) — CacheFirst (30-day TTL)
  - Google Fonts / CDN — StaleWhileRevalidate

### Optimistic Updates

Enhance `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`:

- `onMutate`: Cancel outgoing queries, snapshot previous data, insert optimistic entry
- `onError`: Roll back to snapshot
- `onSettled`: Invalidate queries to refetch server truth

### Install Prompt

- Capture `beforeinstallprompt` event in a React context
- Surface a dismissable install banner in the app header (stored in localStorage)

---

## Phase 2: UX & Polish with Framer Motion

### Dependencies

- `framer-motion` — Animation, gesture support, layout animations, AnimatePresence

### Page Transitions

- `PageTransition` wrapper in `(app)/layout.tsx`
- `<AnimatePresence mode="wait">` keyed by `pathname`
- Fade in / slide up on enter, fade out on exit (150-200ms, `easeOut`)

### Skeleton Loaders

Use Mantine's `<Skeleton>` component on all data-fetching pages:

- **Dashboard:** 4 stat card skeletons + list skeleton
- **Expenses:** Card list skeleton (5 rows)
- **Reports:** Chart placeholder skeletons (rect blocks)
- **Settings sub-pages:** Form field skeletons

### Empty States

Show illustrated empty states when data is empty (not loading):

- **No expenses:** "No expenses yet" + CTA to add first expense
- **No categories:** "Using default categories" + CTA to create custom
- **No families:** "Create or join a family to get started"
- Use Tabler icons as lightweight illustrations

### Pull-to-Refresh (Mobile)

- Framer Motion `useDragControls` on main content area
- Drag down past 60px threshold triggers `queryClient.invalidateQueries()`
- Spinner indicator during refresh
- Mobile only (`useMediaQuery('(max-width: 48em)')`)

### Swipe-to-Delete on Expense Cards

- Framer Motion drag gesture (`drag="x"`, constrained left)
- Reveal red delete action on swipe left past threshold
- Confirm via Mantine modal before deletion
- Desktop: existing delete button in detail view

### Toast with Undo

For destructive actions (delete expense, remove category):

- Mantine notification with "Undo" action button
- Delay actual API call by 3 seconds
- "Undo" cancels the mutation; timeout executes deletion

### Loading/Error Boundaries

- Shared `ErrorFallback` component (icon + message + retry button)
- TanStack Query `isError` state handling per page
- `NavigationProgress` from `@mantine/nprogress` for route changes

---

## Phase 3: Offline Write Support

### Online/Offline Detection

- `useNetworkStatus` hook wrapping `navigator.onLine` + `online`/`offline` events
- Persistent yellow alert banner when offline: "You're offline. Changes will sync when you reconnect."
- Animated in/out with Framer Motion

### Mutation Queue

Configure `queryClient` with `networkMode: 'offlineFirst'` on mutations.

**Offline-safe mutations:**

- `useCreateExpense` — queue new expenses
- `useUpdateExpense` — queue edits
- `useDeleteExpense` — queue deletions

**Online-only mutations (too complex for offline):**

- Family management, budget changes, category CRUD, auth operations

### Pending Sync Indicator

- Offline-created expenses get a temporary client-generated UUID
- "Pending" badge (clock icon) on optimistic expense cards
- Auto-retry on reconnection via TanStack Query
- `onSettled` invalidation replaces optimistic entry with server response

### Mutation Persistence

- `@tanstack/query-sync-storage-persister` + `persistQueryClient` to save pending mutations to `localStorage`
- On app reload, pending mutations are restored and retried when online
- Only persist mutations, not full query cache

### Conflict Handling

- **Last-write-wins:** offline edits overwrite concurrent server edits
- **Deletes:** if already deleted server-side (404), silently discard
- **Creates:** no conflict possible

---

## Phase 4: In-App Notifications (Polling)

### API — New NotificationModule

**Prisma Schema:**

```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   // BUDGET_THRESHOLD, RECURRING_DUE, EXPENSE_ADDED, MEMBER_JOINED
  title     String
  body      String
  data      Json?    // optional payload (e.g. { expenseId, familyId })
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyId  String?
  family    Family?  @relation(fields: [familyId], references: [id], onDelete: Cascade)
}
```

**Notification Types:**

| Type | Trigger | Recipients |
|------|---------|------------|
| `BUDGET_THRESHOLD` | Monthly spend hits 80% / 100% of budget | All family members |
| `RECURRING_DUE` | Recurring expense due today | Expense creator |
| `EXPENSE_ADDED` | Expense added > large expense threshold | Other family members |
| `MEMBER_JOINED` | New member joins family | Existing family members |

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List user's notifications (paginated, newest first). Query: `?unreadOnly=true&limit=20&cursor=<id>` |
| PATCH | `/notifications/:id/read` | Mark single notification as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Dismiss a notification |

All endpoints protected by `SessionGuard`, scoped to `userId`.

**Notification Creation:**

- `NotificationService` injected into `ExpenseService`, `BudgetService`, `FamilyService`
- On relevant events, call `notificationService.create()` for each target user
- Budget threshold check runs inside `ExpenseService.create()` after expense is saved

### Web — Notification Center

**`useNotifications` Hook:**

- `useQuery` with `refetchInterval: 30000` (30s polling) for unread count
- `refetchIntervalInBackground: false` — pauses polling when tab is hidden (Page Visibility API)
- Full notification list fetched on-demand when dropdown opens (cursor-based pagination)
- `useMutation` for mark-read, mark-all-read, dismiss

**UI — Bell Icon in Header:**

- `IconBell` (Tabler) in app header, next to "Add Expense" button
- Red badge with unread count when > 0
- Click opens Mantine `Popover` dropdown with notification list
- Each notification: type icon, title, body, relative time, unread dot
- "Mark all as read" link at top
- Click notification → mark read + navigate to related resource
- Swipe left to dismiss (mobile, reuse Framer Motion gesture from Phase 2)

---

## Phase Ordering & Dependencies

```
Phase 1 (Service Worker & Performance)
  └─► Phase 2 (UX & Polish)        — independent, can start in parallel
  └─► Phase 3 (Offline Support)     — depends on Phase 1 (service worker)
Phase 4 (Notifications)             — independent of Phases 1-3
```

Recommended order: Phase 1 → Phase 2 + Phase 3 in parallel → Phase 4
