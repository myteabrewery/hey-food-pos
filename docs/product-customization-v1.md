# Product Customization — Modifier Groups V1

Adds structured, per-product customization (e.g. spice level, add-ons, remove-items) on top of the existing Product/Order model. This is an addition, not a replacement — existing Product/Order/OrderItem fields are untouched.

---

## New entities (shared-types)

```typescript
interface ProductModifierGroup {
  id: string;
  productId: string;
  name: string;              // e.g. "Spice Level", "Add-ons", "Remove"
  selectionType: "single" | "multiple";  // single = radio (pick exactly one), multiple = checkbox (pick any number)
  required: boolean;         // if true and selectionType is "single", customer must pick one before adding to cart
  sortOrder: number;
}

interface ProductModifierOption {
  id: string;
  groupId: string;
  name: string;              // e.g. "Extra Egg", "No Vegetables", "Mild"
  priceDelta: number;        // added to item price if selected — 0 for free options (e.g. "no vegetables")
  sortOrder: number;
}
```

**Snapshot entity for orders** (same pattern as OrderItem's existing `nameSnapshot`/`priceSnapshot` — orders must preserve exactly what was selected and charged, independent of later product edits):

```typescript
interface OrderItemModifier {
  id: string;
  orderItemId: string;
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaSnapshot: number;
}
```

`OrderItem` gains one field: `modifiers: OrderItemModifier[]`

`ResolvedMenuItem` (in shared-types, already used by `GET /outlets/:id`) gains one field:
```typescript
modifierGroups: Array<ProductModifierGroup & { options: ProductModifierOption[] }>
```

---

## API contract changes (api-client)

**`POST /orders` request** — items gain a field:
```typescript
items: Array<{
  productId: string;
  quantity: number;
  notes?: string;
  selectedModifierOptionIds: string[];  // new
}>
```

**Security rule, same class as the original order-creation review:** the backend resolves `selectedModifierOptionIds` against the product's actual modifier options and computes `priceDeltaSnapshot` server-side — the client never sends a price for a modifier, only which option IDs were picked.

**Backend validation, server-side, before accepting an order:**
1. Every selected option ID must belong to a modifier group on the actual product being ordered (reject cross-product option IDs — data integrity/security)
2. For any group with `selectionType: "single"` — at most one option from that group may be selected, **regardless of `required`** (a single-select group is mutually exclusive by definition — a radio button, not a checkbox — independent of whether making a selection is mandatory). `required` only sets the lower bound: a `required` single-select group must have exactly one selection; a non-required one may have zero or one, but never more than one either way. (Earlier drafts of this doc only stated the "required" case, which read as ambiguous about whether a non-required single-select group could take more than one — it cannot.)
3. For any `selectionType: "multiple"` group — zero or more options allowed, no upper bound unless later specified
4. Reject the whole order (400, not partial) if any rule fails — same "fail loudly, don't silently guess" principle as the rest of this API

**Order/OrderItem responses** — `OrderItem` now embeds `modifiers: OrderItemModifier[]` (the snapshot, not the live product data).

---

## Seed data example (for backend verification)

**Chicken Rice** gets three modifier groups:
- **Spice Level** (single, required) — Mild (+0), Medium (+0), Spicy (+0)
- **Add-ons** (multiple, not required) — Extra Egg (+1.50), Extra Chicken (+3.00)
- **Remove** (multiple, not required) — No Vegetables (+0), No Onions (+0)

This single product exercises every rule: required single-select, optional multiple-select, and zero-price options — good coverage for verification without needing every product customized.

---

## Frontend — Product Detail screen (new, was screen #7 in the original sitemap, never built)

- Tapping a menu item (instead of the "+" quick-add) opens Product Detail
- Renders each modifier group: single-select groups as radio buttons, multiple-select as checkboxes
- Required groups show a visual indicator and block "Add to cart" until satisfied
- Live price update as options are selected (base price + sum of selected priceDeltas), computed client-side for display only — the real charge is always recomputed server-side at order creation, per the security rule above
- Quantity stepper (already speced in the original doc)
- Cart items now display their selected modifiers (e.g. "Chicken Rice — Spicy, + Extra Egg") instead of just the bare product name

---

## Migration note

The Prisma schema/migration for Product/Order already shipped (commit `1dd3bd0`). This requires a **new migration**, additive only — new tables (`ProductModifierGroup`, `ProductModifierOption`, `OrderItemModifier`) plus a new relation field on `OrderItem`. No existing table structure changes.
