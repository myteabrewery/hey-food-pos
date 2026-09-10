import type { ISODateString } from "./common";

/**
 * One entry in a customer's points ledger — an earn (positive points,
 * awarded when an order reaches `completed`, not `paid` — dev spec
 * Section 3 order state machine; avoids awarding points on an order
 * that later gets cancelled or refunded) or a redemption (negative
 * points, tied to a `RewardRedemption`). docs/loyalty-rewards-v1.md.
 *
 * `Customer.loyaltyPoints` is a maintained running balance, kept in
 * sync with this log transactionally — the balance is a fast read,
 * this is the full history behind it.
 */
export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  orderId?: string;
  type: "earn" | "redeem";
  points: number;
  description: string;
  createdAt: ISODateString;
}

/**
 * One redeemable catalog entry — either a fixed RM voucher or a free
 * item, from one flexible table so new offers are pure data with no
 * schema change. docs/loyalty-rewards-v1.md.
 */
export interface RewardOffer {
  id: string;
  businessId: string;
  name: string;
  type: "voucher" | "free_item";
  pointsCost: number;
  /** Required if `type` is `"voucher"`. */
  voucherValue?: number;
  /** Required if `type` is `"free_item"`. */
  productId?: string;
  active: boolean;
}

/**
 * One redemption of a `RewardOffer` by a customer. `code` is the short
 * code shown to the customer, applied at checkout or shown to staff —
 * actually applying it at checkout is out of scope until checkout
 * itself exists (docs/loyalty-rewards-v1.md).
 */
export interface RewardRedemption {
  id: string;
  customerId: string;
  rewardOfferId: string;
  code: string;
  status: "active" | "used" | "expired";
  redeemedAt: ISODateString;
  usedAt?: ISODateString;
}
