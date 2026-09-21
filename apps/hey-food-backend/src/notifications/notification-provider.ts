/**
 * What a provider says about ONE send. `accepted` means the provider took the
 * message for delivery — NOT that a phone received it (that would be a
 * delivery receipt, which no provider here reports yet). `error` is the reason
 * when `accepted` is false.
 */
export interface ProviderResult {
  accepted: boolean;
  providerMessageId: string | null;
  error?: string;
}

export interface NotificationMessage {
  title: string;
  body: string;
  /** Machine-readable extras for the app to act on (order id, deep link, ...). */
  data?: Record<string, string>;
}

/**
 * Sends a text message. Kept separate from push because the two address
 * differently and fail differently — and this one will be reused by the OTP
 * login when auth is built (one SMS provider decision, made once).
 */
export interface SmsProvider {
  readonly name: string;
  /** `toE164` is a normalized number such as "+60123456789". */
  send(toE164: string, body: string): Promise<ProviderResult>;
}

/**
 * Sends a push notification. Addressed by CUSTOMER, not by device token: there
 * is no token registry yet (no table, no registration endpoint, and the
 * Customer App has no push code), so resolving "which devices belong to this
 * customer" is the real provider's job once that exists.
 */
export interface PushProvider {
  readonly name: string;
  send(customerId: string, message: NotificationMessage): Promise<ProviderResult>;
}

// Nest injection tokens. The value provided is the provider, or `null` when
// none is configured — the service then records the attempt as failed rather
// than silently skipping it.
export const PUSH_PROVIDER = Symbol("PUSH_PROVIDER");
export const SMS_PROVIDER = Symbol("SMS_PROVIDER");

/** The `name` of both logging stubs; a NotificationLog row with this provider was NOT actually sent. */
export const LOGGING_STUB_NAME = "logging-stub";
