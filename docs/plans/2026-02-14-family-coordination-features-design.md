# Family Coordination Features — Design Document

**Date:** 2026-02-14
**Goal:** Add two features focused on family expense visibility and accountability: a Family Activity Feed (Home tab) and a Monthly Family Spending Review (Reports tab).

**Design Reference:** `docs/plans/2026-02-08-family-budget-tracker-design.md`

---

## Context

Budgety is a family-oriented budget tracker for Indian households. The core app (Phases 1-4) covers auth, family management, expense CRUD, budgets, recurring expenses, and reporting charts.

These two additional features address a specific gap: **family members don't know what others are spending in real-time**, and **nobody has a clear picture of who is driving budget overruns**. The features are designed to be non-confrontational — they surface facts, not blame.

---

## Feature 1: Family Activity Feed

### Problem

The Home tab is a placeholder. When a family member opens the app, they see nothing useful. Meanwhile, other members may be logging expenses that affect the shared budget. There's no way to know what's happening without actively checking the expenses list.

### Solution

Replace the Home tab with a real-time activity feed showing all family expenses as they're logged. Each entry shows who spent, how much, on what category, with large expenses visually highlighted.

### Data Model Changes

Add one optional field to the `Family` model:

```prisma
model Family {
  // ... existing fields
  largeExpenseThreshold Float?  // e.g., 1000.0 (INR). Null = no highlighting.
}
```

- Default value: `null` (no highlighting until admin configures it)
- Configurable via `PATCH /families/:id` (ADMIN only)
- Truncated to 2 decimal places like all money fields

No new tables. The feed is a query over existing `Expense` data with the `createdBy` user relation joined.

### API Changes

**Existing endpoint enrichment** — `GET /families/:fid/expenses`:

- Include `createdBy: { id, name, displayName, avatarUrl }` in each expense response
- Add query param `sort=createdAt` (sort by when expense was logged, not expense date). Default remains `sort=date`.
- Already supports pagination (`page`, `limit`) and filtering (`categoryId`, `startDate`, `endDate`, `createdById`)

**Existing endpoint enrichment** — `PATCH /families/:id`:

- Accept `largeExpenseThreshold` field in update DTO (ADMIN only)

No new endpoints required.

### Mobile — Home Tab

Replace `apps/mobile/app/(app)/(tabs)/index.tsx` placeholder:

**Layout (top to bottom):**

1. **Header section**
   - Family name (from active family)
   - Overall budget progress bar: `₹{spent} / ₹{budget}` for current month
   - Color: green (<80%), amber (80-100%), red (>100%)

2. **Activity feed** (`FlatList`)
   - Each card shows:
     - Member avatar (circle with initials fallback) + member name
     - Amount in ₹ (bold, right-aligned)
     - Category icon + category name
     - Description (single line, truncated)
     - Relative timestamp ("2h ago", "yesterday", "Feb 12")
   - **Large expense highlight:** If `amount >= family.largeExpenseThreshold`, card gets an amber left border and subtle tinted background
   - Sorted by `createdAt DESC`
   - Pull-to-refresh
   - Paginated (infinite scroll or "load more")

3. **Empty state**
   - "No expenses yet. Tap + to add the first one."
   - Shown when family has zero expenses

**Data fetching:**
- `useExpenses(familyId, { sort: 'createdAt', limit: 20 })` via TanStack Query
- Family data (name, budget, threshold) from `useFamilies` / family detail query

---

## Feature 2: Monthly Family Spending Review

### Problem

At month-end, families want to understand: who spent how much, which categories are over budget, and how does this month compare to expectations? Currently, the Reports tab is a placeholder. Even when Phase 3 charts are built, there's no unified "family meeting" view that answers these questions at a glance.

### Solution

A read-only review screen showing per-member spending breakdown against the family budget, with visual indicators for budget health. Designed for a parent to open and show the family during a monthly discussion.

### Data Model Changes

None. Aggregates from existing `Expense`, `CategoryBudget`, and `Family.monthlyBudget` data.

### API Changes

**Existing endpoint enrichment** — `GET /families/:fid/reports/member-spending?month=YYYY-MM`:

The response should include:

```json
{
  "month": "2026-02",
  "totalBudget": 50000,
  "totalSpent": 42300,
  "utilizationPercent": 84.6,
  "members": [
    {
      "userId": "u1",
      "name": "Tushar",
      "displayName": null,
      "avatarUrl": null,
      "totalSpent": 28000,
      "percentOfTotal": 66.2,
      "topCategories": [
        { "categoryId": "c1", "name": "Groceries/Kirana", "icon": "shopping-cart", "amount": 12000 },
        { "categoryId": "c7", "name": "Dining Out", "icon": "utensils", "amount": 8000 },
        { "categoryId": "c4", "name": "Transport", "icon": "car", "amount": 5000 }
      ]
    }
  ]
}
```

Key fields:
- `totalBudget`: from `Family.monthlyBudget`
- `utilizationPercent`: `(totalSpent / totalBudget) * 100`
- `percentOfTotal`: each member's share of total family spending
- `topCategories`: top 3 categories by amount for each member

**Existing endpoint** — `GET /families/:fid/reports/budget-utilization?month=YYYY-MM`:

Used alongside member-spending for the category breakdown section. Already planned in the design doc. Response includes per-category budget vs. spent.

No new endpoints required.

### Mobile — Reports Tab / Spending Review Screen

Accessible from the Reports tab (as a prominent section or navigable sub-screen):

**Layout (top to bottom):**

1. **Month selector**
   - Left/right arrows + month label ("February 2026")
   - Defaults to current month

2. **Family budget summary card**
   - Overall progress bar: `₹{spent} / ₹{budget}`
   - Utilization percentage
   - Color coding: green (<80%), amber (80-100%), red (>100%)

3. **Per-member cards** (one per family member)
   - Avatar (initials fallback) + member name
   - Total spent this month (₹)
   - "X% of family spending" label
   - Top 3 categories as compact horizontal mini-bars with amounts

4. **Category breakdown section**
   - List of all categories with expenses this month
   - Each row: category icon + name, spent amount, budget amount (if set), progress bar
   - Progress bar colors: green (<80%), amber (80-100%), red (>100%)
   - Categories without budgets show spent amount only (no bar)

5. **Empty state**
   - "No expenses recorded for {month}."
   - Shown when no expenses exist for the selected month

**Data fetching:**
- `useMemberSpending(familyId, month)` — for member cards
- `useBudgetUtilization(familyId, month)` — for category breakdown
- Both via TanStack Query with `month` as query key

---

## Integration with Existing Phases

These features are **additive** — they don't change any existing planned work:

| Existing Phase | Relationship |
|---|---|
| Phase 2 (Core Features) | Activity feed depends on expense CRUD being built. `largeExpenseThreshold` is a small addition to the Family PATCH endpoint. |
| Phase 3 (Reporting) | Spending review uses the already-planned `member-spending` and `budget-utilization` report endpoints, just enriches the response shape. |
| Phase 4 (Polish) | Activity feed benefits from optimistic updates and pull-to-refresh already planned. |

**Suggested implementation timing:**
- Activity feed Home tab: build during Phase 2 (right after expense CRUD)
- Spending review screen: build during Phase 3 (alongside other report endpoints)

---

## What's Explicitly Out of Scope

- Push notifications (decided: in-app feed only)
- Per-member spending limits or approval workflows
- Expense attachments (photos/receipts)
- Data export (CSV/PDF)
- Budget streaks or gamification
- Shared shopping lists
