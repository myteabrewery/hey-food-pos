/**
 * Brand colors, per docs/hey-food-design-system-v1.md Section 1, extended
 * by docs/customer-app-screens-v1.md where the high-fidelity mockups
 * introduced a value not in the original token set.
 *
 * Ember was chosen deliberately: warm, appetite-associated, and distinct
 * from the blue/green palettes most food-delivery apps default to — helps
 * Hey Food read as its own brand rather than "another delivery app."
 */
export const BRAND_COLORS = {
  /** Pressed/active state of primary actions. */
  ember600: "#EA580C",
  /** Primary brand color — CTAs, active nav, logo mark. */
  ember500: "#F97316",
  /**
   * Light Ember tint. Recurs across the Home nearest-outlet hero card,
   * the available-menu-item image background, and the Checkout outlet
   * confirmation banner (docs/customer-app-screens-v1.md) — named here so
   * those screens reference one constant instead of repeating the hex.
   */
  emberTint: "#FFEDD5",
  /**
   * Text color paired with `emberTint` backgrounds (e.g. the Home hero
   * card's "YOU'RE NEAR" label). Defined as its own token even though it
   * happens to equal the `Preparing` order-status text color in
   * shared-types' ORDER_STATUS_META — that's a coincidence of two
   * unrelated domains (a proximity badge vs. an order lifecycle state)
   * landing on the same hex, not a reason to couple them.
   */
  emberTintText: "#9A3412",
  /** Primary text, POS high-emphasis numbers. */
  char900: "#1C1917",
  /** Secondary text. */
  char500: "#57534E",
  /**
   * Tertiary/muted text and icons — labels like "ORDERING FROM", menu item
   * descriptions, search/chevron icons. docs/customer-app-screens-v1.md.
   * Lighter than char500, extending the same char900/char500 naming.
   */
  char400: "#A8A29E",
  /**
   * Muted section-label text — "What are you craving?", "Other nearby
   * outlets". docs/customer-app-screens-v1.md. Named by usage rather than
   * forced into the char900/char500/char400 numeric scale: it sits between
   * char500 and char400 in lightness, with no clean numeric step between
   * them in this system's existing convention.
   */
  charMuted: "#78716C",
  /** Card backgrounds, subtle surfaces. */
  neutral100: "#F5F5F4",
  /** Base background. */
  white: "#FFFFFF",
} as const;

export type BrandColorToken = keyof typeof BRAND_COLORS;
