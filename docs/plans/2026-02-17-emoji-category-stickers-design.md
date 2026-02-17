# Emoji Category Stickers Design

## Summary

Replace Tabler icon names with emoji characters as category stickers. Users can pick emojis for any category (default or custom) via an emoji picker in the web app.

## Decisions

- **Platform:** Web app only
- **Approach:** Emoji-only storage — store emoji characters directly in the existing `icon` field
- **Library:** emoji-mart (`@emoji-mart/react` + `@emoji-mart/data`)
- **Editability:** All categories (default + custom) can have their emoji changed

## Data & API

No schema changes. The existing `icon String?` field stores emoji characters directly.

**Seed update** — default categories switch from Tabler names to emojis:

| Category | Old icon | New emoji |
|---|---|---|
| Groceries/Kirana | shopping-cart | 🛒 |
| Rent | home | 🏠 |
| Utilities | zap | ⚡ |
| Transport | car | 🚗 |
| Medical/Health | heart-pulse | 🏥 |
| Education | graduation-cap | 🎓 |
| Dining Out | utensils | 🍽️ |
| Entertainment | film | 🎬 |
| Shopping | shopping-bag | 🛍️ |
| EMI/Loans | landmark | 🏦 |
| Household Help | hand-helping | 🤝 |
| Mobile/Internet | wifi | 📶 |

**Data migration:** A script updates existing rows from Tabler names to emoji characters.

**API:** No changes — DTOs already accept `icon?: string`.

## Web UI Components

### CategoryIcon (rewrite)

- Remove Tabler icon map
- Render emoji character as text with consistent sizing
- Fallback: `🪙` when icon is null/undefined
- Remove `@tabler/icons-react` if only used for category icons

### EmojiPicker (new)

- Uses `@emoji-mart/react` + `@emoji-mart/data`
- Wrapped in a popover, triggered by clicking a circular emoji preview button
- On selection: calls `onSelect(emoji: string)`, closes popover
- Includes search, category tabs, skin tone selector (emoji-mart defaults)

### Integration points

- **Category create form** (settings/categories): emoji preview button next to name input, defaults to placeholder
- **Category edit flow** (settings/categories): emoji preview button pre-populated with current emoji
- **All category display surfaces** (dashboard, expenses, reports): already use `CategoryIcon` — no changes beyond component rewrite

## Edge Cases

- **No emoji selected on create:** icon stays null, fallback `🪙` renders
- **Existing data migration:** seed + migration script update all 12 defaults
- **Old Tabler names on custom categories:** treated as fallback (icon field was never exposed in create UI)

## Out of Scope

- Mobile app changes
- Custom icon uploads / image-based icons
- Per-user emoji overrides (emojis are per-category, shared across family)
