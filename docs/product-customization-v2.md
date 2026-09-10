# Modifier Groups V2 — Min/Max Counts + Per-Option Quantity

Supersedes V1's `required: boolean` field. This is a generalization, not a special case for one business — it fixes a real gap V1 couldn't express ("pick several, but at least N") and adds per-option quantity (needed for "2x fish balls").

---

## Schema changes

**`ProductModifierGroup`** — remove `required: boolean`, add:
```typescript
minSelections: number;       // 0 = optional, 1+ = must pick at least this many distinct options
maxSelections: number | null; // null = unlimited distinct options, otherwise a hard cap
```

**Important clarification:** min/max count **distinct options selected**, not total quantity. Picking "2x Fish Balls" counts as **1** selection toward the group's min/max — quantity is "how much of this one ingredient," selection count is "how many different ingredients."

**Old `required` values map onto the new fields like this** (for the migration backfill):
| Old (V1) | New (V2) |
|---|---|
| `selectionType: single, required: true` | `minSelections: 1, maxSelections: 1` |
| `selectionType: single, required: false` | `minSelections: 0, maxSelections: 1` |
| `selectionType: multiple, required: false` | `minSelections: 0, maxSelections: null` |
| *(did not exist in V1 — new capability)* | `selectionType: multiple, minSelections: 2, maxSelections: null` — e.g. "Ingredients: pick at least 2, no upper limit" |

**`ProductModifierOption`** — add:
```typescript
quantityEnabled: boolean;   // if true, UI shows a quantity stepper for this option once selected; if false, it's just an on/off pick (matches existing behavior for things like "No Vegetables" where "2x no vegetables" makes no sense)
```

**`OrderItemModifier`** (the order-time snapshot) — add:
```typescript
quantity: number;           // defaults to 1 for non-quantity-enabled options
```
Line total for that modifier = `priceDeltaSnapshot × quantity`.

---

## API contract changes

**`POST /orders` request** — `selectedModifierOptionIds: string[]` becomes:
```typescript
selectedModifierOptions: Array<{ optionId: string; quantity: number }>
```

**Validation rules, updated:**
1. Every `optionId` must belong to the product's own modifier groups (unchanged from V1)
2. Count of **distinct options selected** per group must satisfy `minSelections ≤ count ≤ maxSelections` (or no upper bound if `maxSelections` is null)
3. `quantity` must be ≥ 1 for every selection; reject `quantity > 1` on any option where `quantityEnabled` is false
4. Price is still computed entirely server-side: `sum(option.priceDelta × selection.quantity)` — client-side display remains display-only, same rule as V1

---

## This business's actual configuration (the real menu)

**Soup Base** — single, minSelections: 1, maxSelections: 1 (must pick exactly one)
- Options: Tomyam, Laksa, Clear Soup — each with its own `priceDelta` (you'll set real prices; Tomyam/Laksa commonly cost more than Clear Soup)

**Ingredients** — multiple, minSelections: 2, maxSelections: null (at least 2, no upper limit)
- Options: your actual ingredient list (fish balls, meatballs, tofu, prawns, vegetables, etc.) — each with its own `priceDelta` and `quantityEnabled: true`

**Carb Base** — single, minSelections: 0, maxSelections: 1 (optional, pick at most one)
- Options: Rice, Yellow Noodle, Vermicelli — presumably `priceDelta: 0` each unless you charge extra for a specific one

---

## Two seed profiles (dev/testing convenience, not a customer feature)

Two separate, named seed scripts — selectable via a flag when setting up the database, so the placeholder test data isn't destroyed while the real menu is being built and tested:

```
pnpm run db:seed:placeholder   # existing Chicken Rice / Nasi Lemak test data
pnpm run db:seed:soup-stall    # this real soup-based menu (name TBD, easy to rename later)
```

Both write to the same schema — this is just two different data sets you can load, not two different code paths. Running one after clearing the database replaces the other; they're not meant to coexist simultaneously.
