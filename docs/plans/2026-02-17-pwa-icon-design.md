# Budgety PWA & App Icon Design

**Date:** 2026-02-17
**Status:** Approved

## Summary

Create a flat, minimal wallet icon for Budgety on a dark navy background. The icon will be generated from an SVG source using a Node.js script, exported to all required sizes for web PWA and mobile apps.

## Visual Specification

### Background
- Color: Dark navy (`#1a1b2e`)
- Shape: Rounded square (corner radius ~22% of width)
- iOS will mask to its own radius; Android/web display the rounded square

### Wallet Symbol
- Style: Flat, minimal, geometric
- Color: Pure white (`#ffffff`)
- Composition:
  - Main body: Rounded rectangle, ~60% of canvas width, slightly wider than tall
  - Flap: Curved or rectangular overlap on the top-right edge
  - Clasp/accent: Small circle near the flap edge
- Filled shapes (not outlined) for clarity at small sizes

### Export Sizes

| Target | Size | Location |
|--------|------|----------|
| PWA small | 192x192 | `apps/web/public/icons/icon-192x192.png` |
| PWA large | 512x512 | `apps/web/public/icons/icon-512x512.png` |
| Mobile icon | 1024x1024 | `apps/mobile/assets/icon.png` |
| Adaptive icon | 1024x1024 | `apps/mobile/assets/adaptive-icon.png` |
| Splash icon | 1024x1024 | `apps/mobile/assets/splash-icon.png` |
| Favicon | 32x32 | `apps/mobile/assets/favicon.png` |

## Implementation Approach

1. Create `scripts/generate-icons.mjs` containing:
   - SVG source string with the wallet design
   - `sharp` library to convert SVG to PNG at all sizes
   - Output to correct file paths
2. Replace existing placeholder icons in `apps/web/public/icons/` and `apps/mobile/assets/`
3. Update `apps/web/src/app/manifest.ts` and `apps/mobile/app.json` if needed

## Design Decisions

- **Flat & minimal** style chosen for clarity at all sizes and modern aesthetic
- **Wallet** symbol chosen as universally understood "money management" metaphor
- **Dark navy** background for premium, serious feel
- **SVG-to-PNG** generation chosen for pixel-perfect output, easy iteration, and version control
- **No external tools** required; everything runs from a single Node.js script
