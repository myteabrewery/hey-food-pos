/**
 * "+60123456789" -> "+6012***6789": enough to tell numbers apart in a log or a
 * support ticket without copying the full number into log output or a free-form
 * JSON column (the real number already lives on the order).
 */
export function maskPhone(phone: string): string {
  if (phone.length <= 9) {
    return "***";
  }
  return `${phone.slice(0, 5)}***${phone.slice(-4)}`;
}
