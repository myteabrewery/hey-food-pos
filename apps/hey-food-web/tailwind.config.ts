import type { Config } from "tailwindcss";

import { BRAND_COLORS, FONT_FAMILY, FONT_FAMILY_FALLBACK, RADIUS, TYPE_SCALE } from "@hey-food/design-tokens";

// Same token-driven setup as hey-food-hq, but on the `customer` column of
// TYPE_SCALE: this is a customer-facing, phone-first surface, so it uses
// the Customer App's type sizes and 44px tap targets, not HQ's compact
// data-dense ones. Tailwind's default spacing scale is already 4px-based,
// identical to SPACING_SCALE (see hey-food-hq's tailwind.config.ts).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: BRAND_COLORS,
      },
      borderRadius: {
        sm: `${RADIUS.sm}px`,
        md: `${RADIUS.md}px`,
        lg: `${RADIUS.lg}px`,
        compact: `${RADIUS.compact}px`,
        pill: `${RADIUS.pill}px`,
        xl: `${RADIUS.xl}px`,
      },
      fontFamily: {
        // Inter is not actually loaded here either (known gap, docs/STATUS.md)
        // — the fallback chain is what renders today.
        sans: [FONT_FAMILY, ...FONT_FAMILY_FALLBACK.split(", ")],
      },
      fontSize: {
        "web-display": `${TYPE_SCALE.display.customer}px`,
        "web-heading": `${TYPE_SCALE.heading.customer}px`,
        "web-body": `${TYPE_SCALE.body.customer}px`,
        "web-caption": `${TYPE_SCALE.caption.customer}px`,
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};

export default config;
