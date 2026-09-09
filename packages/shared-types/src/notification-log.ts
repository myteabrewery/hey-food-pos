import type { ISODateString } from "./common";

export type NotificationChannel = "push" | "sms";

/**
 * docs/hey-food-developer-spec-v1.md Section 1.
 *
 * Logs every notification attempt — this is what diagnoses "customer says
 * they never got notified" support tickets after the fact (dev spec
 * Section 6).
 */
export interface NotificationLog {
  id: string;
  orderId: string;
  channel: NotificationChannel;
  sentAt: ISODateString;
  delivered: boolean;
  payload: Record<string, unknown>;
}
