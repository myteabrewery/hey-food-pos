import { ISODateString } from "./common";

/**
 * MVP has one provider. Extend this union when a second is added — that's
 * the intended extension point of the `PaymentService` abstraction
 * (blueprint Section 3), not a front-end rework.
 */
export type PaymentProvider = "billplz";

export type PaymentStatus = "pending" | "paid" | "failed";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerRef: string;
  status: PaymentStatus;
  amount: number;
  paidAt: ISODateString | null;
  /** Raw provider webhook payload, kept for auditing/debugging. */
  webhookPayload: Record<string, unknown>;
}
