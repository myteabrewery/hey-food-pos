# Hey Food Backend

NestJS + Prisma + PostgreSQL. Data model: `prisma/schema.prisma`, mirroring
`packages/shared-types` (camelCase in Prisma, `@map()`'d to snake_case
columns/tables in Postgres).

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` for a local
   Postgres instance.
2. `pnpm exec prisma migrate dev` — applies migrations.
3. `pnpm run prisma:seed` — seeds dev data (matches the frontend's existing
   mock data for the one outlet/order that already have mocks).

   Note: the seeded KSL City and Mid Valley outlets use placeholder
   `lat`/`lng` values, not verified coordinates (see the comment in
   `prisma/seed.ts`) — if geofencing logic is ever tested against this
   data, a wrong result for those two outlets may just be inaccurate seed
   coordinates, not a code bug. Paradigm Mall's coordinates are real (taken
   from the frontend mock).

## Windows on ARM

Prisma has no native Windows-ARM64 query engine — on an arm64 Node process,
`@prisma/client` fails to load its engine with `"...is not a valid Win32
application"`. This is a confirmed upstream dead end
([prisma/prisma#25206](https://github.com/prisma/prisma/issues/25206),
closed as not planned), not something fixable from this repo.

If `node -p process.arch` on your machine prints `arm64`, anything that
instantiates `PrismaClient` — the dev server, `prisma` CLI commands, the
seed script — needs to run under an **x64** Node instead (Windows' x64
emulation runs it fine; no other workaround needed).

Setup, one-time:

1. Download the x64 Node zip build (same version as your arm64 install) from
   https://nodejs.org/dist/ and extract it somewhere **other than**
   `C:\Program Files\nodejs` (that path is already the arm64 install — the
   official x64 MSI installer targets the same path and would collide with
   it, which is why this uses the zip distribution instead).
2. By default `scripts/with-x64-node.mjs` looks for it at
   `C:\node-x64\node-v24.20.0-win-x64`. If you extracted it elsewhere, set
   `HEY_FOOD_X64_NODE_DIR` to that path (in your shell profile, or per
   invocation).

From then on, `pnpm run dev`, `pnpm run start`, and every `pnpm run
prisma:*` script route through that wrapper automatically — it prepends the
x64 Node directory to `PATH` for the duration of the command (and its child
processes: `nest`, `prisma`, `tsx`, etc. all resolve to x64 Node as a
result). On a machine that doesn't have this problem, the configured
directory won't exist and the wrapper is a silent no-op.

One thing this doesn't cover automatically: if you ever need to run a
Prisma-touching script directly (bypassing `package.json`'s `scripts`),
esbuild-based tools (`tsx`, etc.) need their own x64 native binary too —
this repo's `devDependencies` already includes `@esbuild/win32-x64`
explicitly for that reason. If you add a new esbuild-based dev tool here,
check whether it needs the same treatment.
