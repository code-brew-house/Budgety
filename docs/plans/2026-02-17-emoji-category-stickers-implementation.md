# Emoji Category Stickers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Tabler icon names with emoji characters as category stickers, with an emoji-mart picker in the web app.

**Architecture:** Store emoji characters directly in the existing `icon` field. Rewrite `CategoryIcon` to render emoji text instead of SVG components. Add an `EmojiPicker` component (emoji-mart wrapped in Mantine Popover) to the category create/edit forms.

**Tech Stack:** emoji-mart (`@emoji-mart/react`, `@emoji-mart/data`), Mantine (Popover, ActionIcon), Next.js, React

---

### Task 1: Install emoji-mart dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install packages**

Run from repo root:
```bash
cd apps/web && pnpm add @emoji-mart/react @emoji-mart/data
```

**Step 2: Verify install**

Run: `ls apps/web/node_modules/@emoji-mart/react/package.json`
Expected: file exists

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "feat(web): add emoji-mart dependencies for category emoji picker"
```

---

### Task 2: Rewrite CategoryIcon to render emojis

The current `CategoryIcon` at `apps/web/src/components/CategoryIcon.tsx` maps Tabler icon names to SVG components. Replace it with a simple emoji text renderer.

**Files:**
- Modify: `apps/web/src/components/CategoryIcon.tsx`

**Step 1: Rewrite CategoryIcon**

Replace the entire file with:

```tsx
interface CategoryIconProps {
  name: string | null | undefined;
  size?: number;
}

const FALLBACK_EMOJI = '🪙';

export function CategoryIcon({ name, size = 18 }: CategoryIconProps) {
  return (
    <span
      role="img"
      aria-label="category icon"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name || FALLBACK_EMOJI}
    </span>
  );
}
```

Key changes:
- Removes all `@tabler/icons-react` imports (13 icons + types)
- Removes `iconMap` and `fallbackIcon`
- Renders emoji as a `<span>` with `fontSize` matching old `size` prop
- Drops `stroke` prop (not applicable to text)
- Fallback is `🪙` when `name` is null/undefined/empty

**Step 2: Verify the web app still builds**

Run: `cd apps/web && pnpm build`
Expected: builds successfully (no type errors from removed `stroke` prop usage)

Note: `SwipeableExpenseCard.tsx:43` calls `<CategoryIcon name={expense.category.icon} size={20} />` — this still works since `size` is preserved. No `stroke` is passed there.

**Step 3: Commit**

```bash
git add apps/web/src/components/CategoryIcon.tsx
git commit -m "feat(web): rewrite CategoryIcon to render emojis instead of Tabler SVGs"
```

---

### Task 3: Create EmojiPickerPopover component

**Files:**
- Create: `apps/web/src/components/EmojiPickerPopover.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { Popover, UnstyledButton } from '@mantine/core';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerPopoverProps {
  value: string | null | undefined;
  onChange: (emoji: string) => void;
  size?: number;
}

export function EmojiPickerPopover({ value, onChange, size = 28 }: EmojiPickerPopoverProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = (emojiData: { native: string }) => {
    onChange(emojiData.native);
    setOpened(false);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md">
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          style={{
            fontSize: size,
            lineHeight: 1,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-default-border)',
            cursor: 'pointer',
          }}
          aria-label="Pick emoji"
        >
          {value || '➕'}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p={0} style={{ border: 'none', background: 'none' }}>
        <Picker data={data} onEmojiSelect={handleSelect} theme="light" previewPosition="none" />
      </Popover.Dropdown>
    </Popover>
  );
}
```

Key details:
- `value` shows the currently selected emoji (or `➕` as placeholder)
- Clicking the button toggles the popover
- `emoji-mart` Picker returns `{ native: string }` — we pass the native emoji char to `onChange`
- Popover dropdown has no padding/border to let emoji-mart's own styling take over
- `previewPosition="none"` keeps the picker compact

**Step 2: Verify it builds**

Run: `cd apps/web && pnpm build`
Expected: builds (component is not imported yet, but no syntax/type errors)

**Step 3: Commit**

```bash
git add apps/web/src/components/EmojiPickerPopover.tsx
git commit -m "feat(web): add EmojiPickerPopover component with emoji-mart"
```

---

### Task 4: Add emoji picker to the categories settings page

**Files:**
- Modify: `apps/web/src/app/(app)/settings/categories/page.tsx`

**Step 1: Add emoji picker to create form**

Add import at top:
```tsx
import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
import { CategoryIcon } from '@/components/CategoryIcon';
```

Add state for the new emoji in the create form:
```tsx
const [newIcon, setNewIcon] = useState('');
```

Update the `editTarget` state type to include icon:
```tsx
const [editTarget, setEditTarget] = useState<{ id: string; name: string; icon: string | null } | null>(null);
```

Add state for edit icon:
```tsx
const [editIcon, setEditIcon] = useState('');
```

**Step 2: Update the Add Category card**

Replace the current `<Group>` inside the Add Category card with:
```tsx
<Group>
  <EmojiPickerPopover value={newIcon || null} onChange={setNewIcon} />
  <TextInput
    placeholder="Category name"
    value={newName}
    onChange={(e) => setNewName(e.currentTarget.value)}
    style={{ flex: 1 }}
  />
  <Button onClick={handleCreate} loading={createCategory.isPending}>
    Add
  </Button>
</Group>
```

**Step 3: Update handleCreate to pass icon**

```tsx
const handleCreate = () => {
  if (!newName.trim()) return;
  createCategory.mutate(
    { name: newName.trim(), ...(newIcon && { icon: newIcon }) },
    {
      onSuccess: () => {
        setNewName('');
        setNewIcon('');
        notifications.show({ title: 'Category created', message: 'New category added.', color: 'green' });
      },
    },
  );
};
```

**Step 4: Update the category list to show emojis**

In the `categories.map(...)` section, add the emoji before the name:
```tsx
<Group gap="xs">
  <CategoryIcon name={cat.icon} size={20} />
  <Text size="sm" fw={500}>{cat.name}</Text>
  {cat.isDefault && (
    <Badge size="xs" variant="light" color="gray">Default</Badge>
  )}
</Group>
```

**Step 5: Update edit button onClick to include icon**

```tsx
onClick={() => {
  setEditTarget({ id: cat.id, name: cat.name, icon: cat.icon });
  setEditName(cat.name);
  setEditIcon(cat.icon || '');
}}
```

Also, allow editing for ALL categories (not just custom ones). Move the edit button outside the `!cat.isDefault` condition. Keep delete restricted to custom only:

```tsx
<Group gap="xs">
  <ActionIcon
    variant="subtle"
    onClick={() => {
      setEditTarget({ id: cat.id, name: cat.name, icon: cat.icon });
      setEditName(cat.name);
      setEditIcon(cat.icon || '');
    }}
  >
    <IconEdit size={16} />
  </ActionIcon>
  {!cat.isDefault && (
    <ActionIcon
      color="red"
      variant="subtle"
      onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
    >
      <IconTrash size={16} />
    </ActionIcon>
  )}
</Group>
```

**Step 6: Update the Edit Modal to include emoji picker**

```tsx
<Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Category">
  <Stack>
    <Group>
      <EmojiPickerPopover value={editIcon || null} onChange={setEditIcon} />
      <TextInput
        label="Category Name"
        value={editName}
        onChange={(e) => setEditName(e.currentTarget.value)}
        style={{ flex: 1 }}
      />
    </Group>
    <Button onClick={handleUpdate} loading={updateCategory.isPending}>
      Save
    </Button>
  </Stack>
</Modal>
```

**Step 7: Update handleUpdate to pass icon**

```tsx
const handleUpdate = () => {
  if (!editTarget || !editName.trim()) return;
  updateCategory.mutate(
    { id: editTarget.id, name: editName.trim(), icon: editIcon || undefined },
    {
      onSuccess: () => {
        setEditTarget(null);
        notifications.show({ title: 'Category updated', message: 'Category updated.', color: 'green' });
      },
    },
  );
};
```

**Step 8: Verify the web app builds**

Run: `cd apps/web && pnpm build`
Expected: builds successfully

**Step 9: Commit**

```bash
git add apps/web/src/app/(app)/settings/categories/page.tsx
git commit -m "feat(web): add emoji picker to category create and edit forms"
```

---

### Task 5: Update seed data with emoji characters

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Step 1: Replace Tabler icon names with emojis**

Update the `defaultCategories` array:

```typescript
const defaultCategories = [
  { name: 'Groceries/Kirana', icon: '🛒', isDefault: true },
  { name: 'Rent', icon: '🏠', isDefault: true },
  { name: 'Utilities', icon: '⚡', isDefault: true },
  { name: 'Transport', icon: '🚗', isDefault: true },
  { name: 'Medical/Health', icon: '🏥', isDefault: true },
  { name: 'Education', icon: '🎓', isDefault: true },
  { name: 'Dining Out', icon: '🍽️', isDefault: true },
  { name: 'Entertainment', icon: '🎬', isDefault: true },
  { name: 'Shopping', icon: '🛍️', isDefault: true },
  { name: 'EMI/Loans', icon: '🏦', isDefault: true },
  { name: 'Household Help', icon: '🤝', isDefault: true },
  { name: 'Mobile/Internet', icon: '📶', isDefault: true },
];
```

**Step 2: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): update seed categories with emoji icons"
```

---

### Task 6: Create data migration script for existing categories

**Files:**
- Create: `apps/api/prisma/migrate-icons-to-emoji.ts`

**Step 1: Write the migration script**

```typescript
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const iconToEmoji: Record<string, string> = {
  'shopping-cart': '🛒',
  home: '🏠',
  zap: '⚡',
  car: '🚗',
  'heart-pulse': '🏥',
  'graduation-cap': '🎓',
  utensils: '🍽️',
  film: '🎬',
  'shopping-bag': '🛍️',
  landmark: '🏦',
  'hand-helping': '🤝',
  wifi: '📶',
};

async function main() {
  const categories = await prisma.category.findMany({
    where: { icon: { in: Object.keys(iconToEmoji) } },
  });

  console.log(`Found ${categories.length} categories with Tabler icon names`);

  for (const cat of categories) {
    if (cat.icon && iconToEmoji[cat.icon]) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { icon: iconToEmoji[cat.icon] },
      });
      console.log(`  ${cat.name}: ${cat.icon} → ${iconToEmoji[cat.icon]}`);
    }
  }

  console.log('Migration complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

**Step 2: Add a run script to package.json**

In `apps/api/package.json`, add to scripts:
```json
"migrate:icons": "ts-node -r tsconfig-paths/register prisma/migrate-icons-to-emoji.ts"
```

Or run directly with tsx:
```bash
cd apps/api && npx tsx prisma/migrate-icons-to-emoji.ts
```

**Step 3: Run the migration against the dev database**

Run: `cd apps/api && npx tsx prisma/migrate-icons-to-emoji.ts`
Expected output:
```
Found 12 categories with Tabler icon names
  Groceries/Kirana: shopping-cart → 🛒
  Rent: home → 🏠
  ...
Migration complete
```

**Step 4: Commit**

```bash
git add apps/api/prisma/migrate-icons-to-emoji.ts
git commit -m "feat(api): add data migration script to convert icon names to emojis"
```

---

### Task 7: Manual verification and final cleanup

**Step 1: Start the dev servers**

Run: `pnpm dev` (from repo root)

**Step 2: Verify categories settings page**

Navigate to the categories settings page in the browser:
- [ ] Default categories show emoji icons next to their names
- [ ] The "Add Category" form has an emoji picker button
- [ ] Clicking the emoji button opens the emoji-mart picker
- [ ] Selecting an emoji updates the button preview
- [ ] Creating a category with an emoji saves correctly
- [ ] Edit modal has an emoji picker pre-populated with current emoji
- [ ] Editing an emoji on a default category works (edit button is visible)
- [ ] Editing an emoji on a custom category works
- [ ] Creating a category without picking an emoji shows fallback 🪙

**Step 3: Verify expense cards**

Navigate to the dashboard or expenses page:
- [ ] Expense cards show emoji icons in the ThemeIcon circle
- [ ] Emojis render at appropriate size

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "fix(web): final adjustments for emoji category stickers"
```
