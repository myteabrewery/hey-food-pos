import type { StubFaultMode } from "../common/env";
import type { ProviderResult } from "./notification-provider";

const SLOW_MS = 3_000;

/**
 * DEV-ONLY fault injection shared by the logging stubs (see getStubFaultMode).
 * Returns a result to short-circuit the stub with, or null to carry on as a
 * normal, accepting send. Throws for "throw"; never returns for "hang".
 */
export async function injectStubFault(mode: StubFaultMode, envName: string): Promise<ProviderResult | null> {
  switch (mode) {
    case "throw":
      throw new Error(`simulated provider outage (${envName}=throw)`);
    case "reject":
      return { accepted: false, providerMessageId: null, error: `simulated provider rejection (${envName}=reject)` };
    case "slow":
      await new Promise((resolve) => setTimeout(resolve, SLOW_MS));
      return null;
    case "hang":
      return new Promise<ProviderResult>(() => undefined);
    default:
      return null;
  }
}
