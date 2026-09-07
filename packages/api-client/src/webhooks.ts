import { z } from "zod";

// POST /webhooks/billplz
/**
 * The request body shape is Billplz's own webhook payload format, not ours
 * to design — kept loosely typed (matching `Payment.webhookPayload` in
 * shared-types) until we have Billplz's actual webhook docs to model
 * precisely, rather than guessing field names.
 */
export const BillplzWebhookPayloadSchema = z.record(z.unknown());
export type BillplzWebhookPayload = z.infer<typeof BillplzWebhookPayloadSchema>;

/** Assumed 200 ack with no meaningful body — not stated in the dev spec. */
export const BillplzWebhookResponseSchema = z.object({});
export type BillplzWebhookResponse = z.infer<typeof BillplzWebhookResponseSchema>;
