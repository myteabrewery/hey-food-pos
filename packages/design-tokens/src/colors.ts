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
  /** Primary text, POS high-emphasis numbers. */
  char900: "#1C1917",
  /** Secondary text. */
  char500: "#57534E",
  /** Card backgrounds, subtle surfaces. */
  neutral100: "#F5F5F4",
  /** Base background. */
  white: "#FFFFFF",
} as const;

export type BrandColorToken = keyof typeof BRAND_COLORS;
