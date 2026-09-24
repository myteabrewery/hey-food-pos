import type { MenuChangeSource, Prisma } from "@prisma/client";

/** A prisma client inside `$transaction`, so the log row commits or rolls back WITH the change it describes. */
export type MenuChangeTx = Prisma.TransactionClient;

export interface MenuChangeInput {
  businessId: string;
  productId: string;
  /** Null for a change to the product's own master fields. */
  outletId: string | null;
  /** "created", "name", "description", "image_url", "category", "master_price", "is_available" or "price_override". */
  field: string;
  oldValue: string | null;
  newValue: string | null;
  source: MenuChangeSource;
  /**
   * WHO made this change: the real staff identity from `StaffSessionContext`,
   * required (never silently omitted) so every call site states its case
   * explicitly. A POS call site passes the session's real `staffId`; every
   * HQ call site passes `null` — `HqAdminKeyGuard` has no identity to
   * attribute a change to.
   */
  changedByStaffId: string | null;
}

/**
 * Appends menu changes to the audit log. Callers pass ONLY changes that
 * actually change a value (a no-op writes nothing), inside the same
 * transaction as the change itself. Records WHERE (`source`) and now, for a
 * POS change, WHO (`changedByStaffId`) — an HQ change still has no "who":
 * `HqAdminKeyGuard` has no authentication to attribute it to (docs/STATUS.md,
 * audit trail). The log is append-only; nothing in the application updates
 * or deletes a row.
 */
export async function recordMenuChanges(tx: MenuChangeTx, changes: MenuChangeInput[]): Promise<void> {
  if (changes.length === 0) {
    return;
  }
  await tx.menuChangeEvent.createMany({ data: changes });
}

/** Money as the log stores it: "8.50", or null for "no price override". */
export function priceText(amount: Prisma.Decimal | number | null): string | null {
  return amount === null ? null : amount.toFixed(2);
}
