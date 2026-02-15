# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budgety is a budgeting app with a pnpm monorepo managed by Turborepo.

## Monorepo Structure

- **apps/api** — NestJS v11 backend (TypeScript, port 3000)
- **apps/mobile** — Expo/React Native mobile app (SDK 54, React 19, New Architecture enabled)
- **packages/typescript-config** — Shared tsconfig presets (`base.json`, `nestjs.json`, `expo.json`) published as `@budgety/typescript-config`

## Commands

### Root-level (run from repo root)

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Dev servers for all apps
pnpm dev:api              # API dev server only (nest start --watch)
pnpm dev:mobile           # Mobile dev server only (expo start)
pnpm build                # Build all apps
pnpm lint                 # Lint all apps
```

### API (run from apps/api)

```bash
pnpm test                 # Run unit tests (Jest)
pnpm test -- --testPathPattern=<pattern>  # Run a single test file
pnpm test:watch           # Jest in watch mode
pnpm test:e2e             # End-to-end tests (uses test/jest-e2e.json)
pnpm test:cov             # Coverage report
pnpm lint                 # ESLint with auto-fix
pnpm format               # Prettier formatting
```

### Mobile (run from apps/mobile)

```bash
pnpm dev                  # Start Expo dev server
pnpm ios                  # iOS simulator
pnpm android              # Android emulator
```

## Code Style

- **API**: ESLint flat config with typescript-eslint (type-checked) + Prettier. Rules: `no-explicit-any` is off, `no-floating-promises` is warn, `no-unsafe-argument` is warn.
- **Prettier**: Single quotes, trailing commas (`all`).
- **API TypeScript**: `strictNullChecks: true`, `noImplicitAny: false`, uses `nodenext` module resolution targeting ES2023.
- **Mobile TypeScript**: Path alias `@/*` maps to project root (`./`).

## Key Patterns

- pnpm with `node-linker=hoisted` (required for Expo compatibility)
- Both apps extend shared tsconfig via `@budgety/typescript-config`
- API unit tests use `*.spec.ts` in `src/`, e2e tests use `*.e2e-spec.ts` in `test/`
- NestJS schematics available via `@nestjs/cli` for generating modules/controllers/services

## Misc
- When writing commits do not add "Created by Claude Code"
