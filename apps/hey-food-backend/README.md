# Hey Food Backend

NestJS + Prisma + PostgreSQL. Data model: `prisma/schema.prisma`, mirroring
`packages/shared-types` (camelCase in Prisma, `@map()`'d to snake_case
columns/tables in Postgres).

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` for a local
   Postgres instance.
2. `pnpm exec prisma migrate dev` — applies migrations.
3. Seed dev data — two separate, named profiles (docs/product-
   customization-v2.md's "Two seed profiles" section). Both write to the
   same schema; they're not meant to coexist — running one after clearing
   the database replaces the other, rather than adding to it:

   - `pnpm run db:seed:placeholder` — the original Chicken Rice/Nasi Lemak
     placeholder catalog, matching the frontend's existing mock data for
     the one outlet/order that already have mocks.

     Note: the seeded KSL City and Mid Valley outlets use placeholder
     `lat`/`lng` values, not verified coordinates (see the comment in
     `prisma/seed-placeholder.ts`) — if geofencing logic is ever tested
     against this data, a wrong result for those two outlets may just be
     inaccurate seed coordinates, not a code bug. Paradigm Mall's
     coordinates are real (taken from the frontend mock).

   - `pnpm run db:seed:soup-stall` — the real business's actual menu
     shape (Soup Base / Ingredients / Carb Base modifier groups), per
     docs/product-customization-v2.md. Every name and price in this one
     is an invented placeholder pending the real menu — see the comments
     at the top of `prisma/seed-soup-stall.ts`.

   `prisma db seed` / `prisma migrate reset`'s built-in auto-seed still
   defaults to the placeholder profile (`package.json`'s `"prisma".seed`
   config) — use the two named scripts above to pick a profile
   explicitly, most importantly to load the soup-stall one at all.

## Runtime: ts-node, not `nest build` + `node dist/main.js`

**Dev-time fix, not a production decision.** `dev`/`start` currently run
`src/main.ts` directly under `ts-node` (`node -r ts-node/register`, with
`--watch` added for `dev`) instead of the Nest CLI's default `nest build` →
`node dist/main.js`. This was chosen to unblock *local development* against
the raw-TypeScript workspace packages below, and that's the only thing it's
actually been evaluated against — functional correctness, not production
readiness. Concretely, still open before this should ever be what actually
deploys:

- It's running with full type-checking on every process start (plain
  `ts-node/register`, not `--transpile-only`) — slower than it needs to be,
  since CI/dev already typechecks separately; this was never tuned for
  startup cost.
- Cold-start time hasn't been benchmarked at all, and no deployment target
  (container? serverless? long-running VM?) has been decided yet — whether
  ts-node's startup profile is even acceptable depends entirely on that.
- The real fix for shipping this properly is almost certainly giving
  `api-client`/`shared-types` a real compiled `dist/` (see the tradeoff
  below) scoped to a production build step only, or `--transpile-only` at
  minimum — neither has been done. Revisit this section before an actual
  deploy; don't assume `ts-node` in prod is fine just because it works
  here.

`nest build` still exists and still passes (useful as a compile-check),
but its output isn't what actually runs the app.

Why: `@hey-food/api-client` and `@hey-food/shared-types` ship raw
TypeScript source (`"main": "./src/index.ts"`) — every other consumer
(Metro, Next.js, `tsx`) bundles, so that's never been a problem. Plain
`node dist/main.js` doesn't bundle: at runtime it `require()`s those
packages' raw `.ts` source directly, and hits two hard limits in Node's
built-in TypeScript support (no bundler involved):

- It resolves relative imports the same strict way ESM does — no extension
  guessing — so an ordinary extensionless `from "./common"` inside those
  packages fails to resolve at runtime (even though tsc accepts it fine at
  typecheck time).
- It can only erase pure type syntax, and explicitly refuses to strip a
  real `enum` declaration (shared-types' `OrderStatus` was one — now a
  const-object + derived type instead, which sidesteps this for good
  regardless of runtime).

`ts-node` doesn't have either limitation (it runs the real TypeScript
compiler, not a syntax-only stripper), and — unlike `tsx`'s esbuild-based
transform, tried first — it preserves the `emitDecoratorMetadata` NestJS's
dependency injection depends on; esbuild silently dropped it, leaving
injected constructor params `undefined` with no error. Adding explicit
`.ts` extensions to fix the first bullet was tried too, but
`allowImportingTsExtensions` requires `noEmit`/`emitDeclarationOnly`, which
conflicts with `nest build`/`ts-node` actually needing to emit real output
— a dead end independent of which runner is used.

The other standard fix — giving `api-client`/`shared-types` a real
compiled `dist/` build and pointing `"main"` at it — would work too, but
changes what *every* consumer resolves (Metro/Next's hot-reload against
live source would need it rebuilt first) for the sake of the one consumer
(this app) that doesn't bundle. Scoping the fix to this app's own runtime
instead leaves that untouched.

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
processes: `ts-node`, `prisma`, `tsx`, `nest`, etc. all resolve to x64 Node
as a result). On a machine that doesn't have this problem, the configured
directory won't exist and the wrapper is a silent no-op.

One thing this doesn't cover automatically: if you ever need to run a
Prisma-touching script directly (bypassing `package.json`'s `scripts`),
esbuild-based tools (`tsx`, etc.) need their own x64 native binary too —
this repo's `devDependencies` already includes `@esbuild/win32-x64`
explicitly for that reason. If you add a new esbuild-based dev tool here,
check whether it needs the same treatment.
