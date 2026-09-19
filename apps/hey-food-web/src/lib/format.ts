/** Display-only RM formatting; all real charges are computed server-side. */
export function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}
