import { z } from "zod";

import { listResponseSchema, paginatedResponseSchema } from "./common";
import { LoyaltyTransactionSchema, RewardOfferSchema, RewardRedemptionSchema } from "./entities";

// GET /rewards/offers
export const RewardOffersResponseSchema = listResponseSchema(RewardOfferSchema);
export type RewardOffersResponse = z.infer<typeof RewardOffersResponseSchema>;

// GET /customers/me/loyalty
/** Same cursor-pagination convention as everywhere else (e.g. AdminCustomerOrderHistoryQuerySchema). */
export const GetLoyaltyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type GetLoyaltyQuery = z.infer<typeof GetLoyaltyQuerySchema>;

/**
 * `pointsBalance` is `Customer.loyaltyPoints`'s maintained running total,
 * returned alongside (not instead of) the transaction history — same
 * "named field per piece, not one flattened shape" pattern as
 * `OutletDetailResponseSchema` and `AdminCustomerDetailResponseSchema`.
 */
export const LoyaltyResponseSchema = z.object({
  pointsBalance: z.number(),
  transactions: paginatedResponseSchema(LoyaltyTransactionSchema),
});
export type LoyaltyResponse = z.infer<typeof LoyaltyResponseSchema>;

// POST /rewards/redeem
/**
 * Only the offer ID — the backend validates the customer has enough
 * points, deducts them, and creates the LoyaltyTransaction/
 * RewardRedemption rows itself (docs/loyalty-rewards-v1.md), same
 * "client never computes/sends the sensitive part" rule as everywhere
 * else in this API.
 */
export const RedeemRewardRequestSchema = z.object({
  rewardOfferId: z.string(),
});
export type RedeemRewardRequest = z.infer<typeof RedeemRewardRequestSchema>;

export const RedeemRewardResponseSchema = RewardRedemptionSchema;
export type RedeemRewardResponse = z.infer<typeof RedeemRewardResponseSchema>;
