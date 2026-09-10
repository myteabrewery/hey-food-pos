# Loyalty / Rewards System V1

Earning: 1 point per RM1 spent (rounded down — RM12.50 spent = 12 points; standard practice, avoids giving free fractional points). Points are awarded when an order reaches `completed` status (not `paid`) — this avoids awarding points on an order that later gets cancelled or refunded.

Redemption: supports **both** voucher-style (fixed RM discount) and free-item-style rewards from one flexible catalog, so exact thresholds/offers can be added or changed later as pure data, with no schema change.

---

## New entities (shared-types)

```typescript
interface LoyaltyTransaction {
  id: string;
  customerId: string;
  orderId?: string;        // present if earned from an order; absent for redemptions/manual adjustments
  type: "earn" | "redeem";
  points: number;          // positive for earn, negative for redeem
  description: string;     // e.g. "Order at Paradigm Mall", "Redeemed: RM5 Voucher"
  createdAt: string;
}

interface RewardOffer {
  id: string;
  businessId: string;
  name: string;            // e.g. "RM5 Voucher", "Free Iced Tea"
  type: "voucher" | "free_item";
  pointsCost: number;
  voucherValue?: number;   // required if type is "voucher"
  productId?: string;      // required if type is "free_item"
  active: boolean;         // HQ can retire an offer without deleting history
}

interface RewardRedemption {
  id: string;
  customerId: string;
  rewardOfferId: string;
  code: string;            // short code shown to customer, applied at checkout or shown to staff
  status: "active" | "used" | "expired";
  redeemedAt: string;
  usedAt?: string;
}
```

`Customer.loyaltyPoints` (already exists in shared-types) becomes a maintained running balance — incremented/decremented transactionally alongside each `LoyaltyTransaction` row, so the balance is always a fast read while the transaction log gives full history (matches the "Recent: +25 points — Hey Food, Paradigm Mall" list already sketched in the product blueprint's rewards mockup).

---

## API additions (api-client)

- `GET /rewards/offers` — list active `RewardOffer`s for the customer's business
- `GET /customers/me/loyalty` — current point balance + recent `LoyaltyTransaction` history (paginated, same cursor convention as everywhere else)
- `POST /rewards/redeem` — request: `{ rewardOfferId }`. Backend validates sufficient points, deducts them, creates the `LoyaltyTransaction` (negative) and `RewardRedemption` records, returns the redemption code
- Point-earning itself is **not** a separate endpoint — it's a side effect the backend triggers internally when an order's status transitions to `completed` (same place prep-time/collection-time reporting already hooks into that transition)

**Applying a redemption at checkout** (using the code to actually reduce an order's total, or add a free item) is explicitly **out of scope for this pass** — checkout/payment itself doesn't exist yet (blocked on auth). This gets wired once real order creation is built, the same staged approach already used for product customization.

---

## Staging

**Stage 1 (now):** shared-types + api-client shapes only — same review-before-code discipline as every other schema change this session.

**Stage 2:** Prisma migration (additive) + the point-earning trigger on order completion + the `/rewards/offers` and `/customers/me/loyalty` endpoints + a couple of seed `RewardOffer` rows (one voucher-type, one free-item-type, exact values as placeholders you can change later).

**Stage 3:** the actual Rewards tab screen (already exists as a stub in the tab bar) — point balance, history list, redeemable offers.

**Deferred, no timeline yet:** applying a redeemed code at actual checkout — depends on checkout existing first.
