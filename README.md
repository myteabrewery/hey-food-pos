# Hey Food

> **Naming note:** "Hey Food" is a placeholder brand name used throughout this repo (folder names, package names, code identifiers) until the real name is finalized. Find/replace `hey-food` (kebab-case) and `Hey Food` (display name) when it lands.

Multi-outlet F&B ordering and operations platform. Four components sharing one backend — see `/docs` for the full product blueprint, design system, and developer specification this repo is built against.

## Components

| App | Path | Stack | Platform |
|---|---|---|---|
| Customer App | `apps/hey-food-customer` | React Native (Expo) | iOS + Android, native, App/Play Store |
| Outlet POS | `apps/hey-food-pos` | React Native (Expo) | Android tablet, native, offline-first |
| HQ Admin | `apps/hey-food-hq` | Next.js | Web dashboard |
| Backend | `apps/hey-food-backend` | NestJS + PostgreSQL + Prisma | — |

## Shared packages

| Package | Purpose |
|---|---|
| `@hey-food/shared-types` | Order status enum, core entity types, API DTOs — the single source of truth every app imports so the order state machine and status model stay identical everywhere |
| `@hey-food/design-tokens` | Colors, spacing, radius, typography scale from the design system, consumed as an RN theme and a Tailwind preset |
| `@hey-food/api-client` | Typed API contracts (zod schemas) shared between clients |
| `@hey-food/eslint-config` | Shared lint rules |
| `@hey-food/tsconfig` | Shared base tsconfig files |

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io) — enable via `corepack enable` (ships with Node 20+)
- For mobile: Expo CLI (`npx expo`), Xcode (iOS builds/simulator), Android Studio (Android builds/emulator)
- PostgreSQL and Redis for the backend (local or Docker — not yet included in this scaffold)

## Getting started

```bash
corepack enable
pnpm install
```

Run everything (backend + hq-admin dev servers):

```bash
pnpm dev
```

Run a single app:

```bash
pnpm --filter hey-food-backend dev
pnpm --filter hey-food-hq dev
pnpm --filter hey-food-customer dev   # starts Expo
pnpm --filter hey-food-pos dev        # starts Expo
```

## Status

Scaffolding only — repo structure, package manifests, and empty entry points. No screens or business logic have been implemented yet.
