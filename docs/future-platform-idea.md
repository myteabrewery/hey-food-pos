# Future Idea — Multi-Tenant Food Court Platform
## Status: Deferred. Not in current scope. Captured for future planning only.

---

## The idea

A separate, bigger platform: one app covering an entire physical food court, hosting many *independently-owned* food stalls (not just multiple locations of one brand, which is what the current build is). Customers browse all participating stalls at a venue and order from any/all of them. Each stall gets the same POS system already being built.

This is explicitly the "food-court management system" model that was deliberately ruled out at the start of the current project — revisiting it here as a separate, later product, not a pivot of what's being built now.

---

## Confirmed business decisions (as of this session)

- **Revenue model: flat subscription fee per stall.** The platform charges each stall owner a recurring fee to use it — this is completely separate from customer payments, meaning it needs its own recurring billing system (charge cycles, what happens on non-payment, etc.), independent of anything Billplz/order-related.
- **Combined cart across multiple stalls.** A customer can check out once for items from several different stalls in one payment.

---

## What this changes architecturally, at a high level (not designed yet, just flagged)

1. **Multi-tenancy** — "Business" needs to support many independent stall owners, not one brand. The current Business → Outlet → POS hierarchy likely still fits reasonably well *underneath* this — each stall is still a Business with its own Outlets — but a new top layer is needed above it: a FoodCourt/Venue entity that many different Businesses' Outlets can belong to.

2. **Discovery UX** — Customer App's whole "find my nearest [my brand] outlet" model needs to become "browse all stalls at this venue." A meaningfully different Home/Menu experience from what exists today.

3. **Order splitting** — a combined multi-stall cart means one customer payment needs to become multiple stall-specific Orders internally (one per stall, each routed to that stall's own tablet), while the customer only sees one checkout. Likely shape: an `OrderGroup` wrapping multiple per-stall `Order`s, sharing one `Payment`.

4. **Platform admin layer** — a new role/dashboard above HQ Admin, for onboarding food courts and stall businesses onto the platform itself (separate from any single stall's own HQ Admin, which still only manages that one stall's own outlets/menu/staff).

5. **Subscription billing** — an entirely separate system from customer-facing payments: recurring charges to stall owners, billing cycles, handling non-payment/suspension.

6. **Per-stall POS device binding** — likely unchanged from the current design (still one tablet bound to one outlet), just now potentially many different stalls' tablets active within the same physical venue.

---

## Open questions for whenever this gets picked up

- Is a stall onboarding itself (self-serve signup), or does the platform operator manually add each one?
- Does each stall keep its own branding/storefront identity within the shared app, or is everything under one unified "platform" brand with stalls just as categories/vendors?
- How does a combined order get handled if one stall in the cart is out of stock on an item, or one stall is closed, while others in the same cart are fine?
- Does this eventually replace the current single-brand app, run alongside it as a second product, or could the current brand simply become "stall #1" as one tenant on this bigger platform later?

No technical design work has been done on this — this document exists so the idea and its two confirmed business decisions aren't lost, not as a spec to build from yet.
