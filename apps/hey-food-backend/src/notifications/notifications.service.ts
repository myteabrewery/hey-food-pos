import { Inject, Injectable, Logger } from "@nestjs/common";
import type { NotificationChannel, Prisma } from "@prisma/client";

import { getNotifyProviderTimeoutMs } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";
import {
  LOGGING_STUB_NAME,
  PUSH_PROVIDER,
  SMS_PROVIDER,
  type NotificationMessage,
  type ProviderResult,
  type PushProvider,
  type SmsProvider,
} from "./notification-provider";
import { maskPhone } from "./phone-mask";

/** The slice of an order the notification needs; a full order row satisfies it. */
export interface NotifiableOrder {
  id: string;
  displayId: string;
  outletId: string;
  customerId: string | null;
  guestPhone: string | null;
}

/** One send to one provider, prepared but not yet run. */
interface Attempt {
  channel: NotificationChannel;
  provider: PushProvider | SmsProvider | null;
  /** Who it goes to, for the log: a masked phone number, or the customer id for push. */
  recipient: string;
  send: () => Promise<ProviderResult>;
  /** The env flag that would have supplied a provider, for the "not configured" message. */
  flag: string;
}

/**
 * Tells a customer their order is ready (dev spec Section 6): an app-based
 * customer gets a push AND an SMS, sent in parallel rather than SMS-as-fallback
 * (SMS is the point for "come get your food now"); a guest gets an SMS only.
 *
 * Contract with its caller:
 *  - It NEVER throws and is meant to be fire-and-forget: a provider outage must
 *    not fail or slow the staff's "Ready" tap.
 *  - Every attempt — accepted, rejected, thrown, timed out, or "no provider
 *    configured" — writes one NotificationLog row, so "the customer says they
 *    never got it" can be answered from the database. Nothing is skipped silently.
 *  - `Order.notifiedAt` is set only if at least one provider ACCEPTED the
 *    message. With the logging stubs "accepted" means "the stub logged it":
 *    every such row says `provider: "logging-stub"`, `stub: true` and
 *    `delivered: false`, which is how a stub-"notified" order is told apart from
 *    a really notified one.
 *  - There is NO retry: without a durable outbox, a crash or an outage after the
 *    status change means that customer is never notified. The failed rows are
 *    how such orders are found. (Outbox + retry is a separate, later stage.)
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger("NOTIFY");

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider | null,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider | null,
  ) {}

  async notifyOrderReady(order: NotifiableOrder): Promise<void> {
    try {
      const outlet = await this.prisma.outlet.findUnique({ where: { id: order.outletId }, select: { name: true } });
      const smsBody = `#${order.displayId} is ready! Collect from ${outlet?.name ?? "the counter"}.`;
      const pushMessage: NotificationMessage = {
        title: `#${order.displayId} is ready!`,
        body: `Collect from ${outlet?.name ?? "the counter"}.`,
        data: { orderId: order.id, event: "order_ready" },
      };

      const attempts = await this.planAttempts(order, smsBody, pushMessage);

      const outcomes = await Promise.all(attempts.map((attempt) => this.runAttempt(order, attempt, smsBody, pushMessage)));

      if (outcomes.some((accepted) => accepted)) {
        // Conditional so a duplicate call could never move the timestamp.
        await this.prisma.order.updateMany({ where: { id: order.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
      }
      this.logger.log(
        `Order ${order.displayId} ready: ${outcomes.filter(Boolean).length}/${outcomes.length} notification attempt(s) accepted` +
          (outcomes.some(Boolean) ? "" : " — customer NOT notified"),
      );
    } catch (error) {
      // Last-resort guard: the contract is "never throws".
      this.logger.error(
        `Ready notification for order ${order.displayId} crashed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async planAttempts(order: NotifiableOrder, smsBody: string, pushMessage: NotificationMessage): Promise<Attempt[]> {
    const smsAttempt = (toE164: string): Attempt => ({
      channel: "sms",
      provider: this.sms,
      recipient: maskPhone(toE164),
      flag: "SMS_STUB_ENABLED",
      send: () => (this.sms as SmsProvider).send(toE164, smsBody),
    });

    if (order.customerId !== null) {
      const customerId = order.customerId;
      const attempts: Attempt[] = [
        {
          channel: "push",
          provider: this.push,
          recipient: `customer:${customerId}`,
          flag: "PUSH_STUB_ENABLED",
          send: () => (this.push as PushProvider).send(customerId, pushMessage),
        },
      ];
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
      if (customer) {
        attempts.push(smsAttempt(customer.phone));
      }
      return attempts;
    }

    if (order.guestPhone !== null) {
      return [smsAttempt(order.guestPhone)];
    }
    return [];
  }

  private async runAttempt(
    order: NotifiableOrder,
    attempt: Attempt,
    smsBody: string,
    pushMessage: NotificationMessage,
  ): Promise<boolean> {
    const provider = attempt.provider;
    let result: ProviderResult;

    if (provider === null) {
      result = {
        accepted: false,
        providerMessageId: null,
        error: `no ${attempt.channel} provider configured (${attempt.flag} is off and no real provider exists)`,
      };
    } else {
      try {
        result = await withTimeout(attempt.send(), getNotifyProviderTimeoutMs());
      } catch (error) {
        result = { accepted: false, providerMessageId: null, error: error instanceof Error ? error.message : String(error) };
      }
    }

    if (!result.accepted) {
      this.logger.warn(`${attempt.channel.toUpperCase()} for order ${order.displayId} NOT accepted: ${result.error ?? "unknown reason"}`);
    }

    const payload: Prisma.InputJsonObject = {
      event: "order_ready",
      provider: provider?.name ?? null,
      stub: provider?.name === LOGGING_STUB_NAME,
      to: attempt.recipient,
      message: attempt.channel === "sms" ? smsBody : `${pushMessage.title} ${pushMessage.body}`,
      accepted: result.accepted,
      providerMessageId: result.providerMessageId,
      error: result.error ?? null,
    };

    try {
      await this.prisma.notificationLog.create({
        // `delivered` stays false: nothing here observes a delivery receipt.
        data: { orderId: order.id, channel: attempt.channel, delivered: false, payload },
      });
    } catch (error) {
      this.logger.error(
        `Could not write the NotificationLog row for order ${order.displayId} (${attempt.channel}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return result.accepted;
  }
}

/** Rejects if `promise` hasn't settled within `ms`, so a hung provider can't leave an attempt open forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`provider did not answer within ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
