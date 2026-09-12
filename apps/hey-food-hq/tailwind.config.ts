import type { Config } from "tailwindcss";

import { BRAND_COLORS, FONT_FAMILY, FONT_FAMILY_FALLBACK, OUTLET_HEALTH_COLORS, RADIUS, TYPE_SCALE } from "@hey-food/design-tokens";

// Namespaced under `brand`/`health` rather than overriding Tailwind's own
// top-level color names (`white`, etc.) — avoids silently shadowing
// Tailwind defaults elsewhere in the app.
//
// No custom spacing scale here: Tailwind's own default spacing scale is
// already 4px-based (1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px,
// 12=48px, 16=64px) — numerically identical to SPACING_SCALE
// (docs/hey-food-design-system-v1.md Section 4), so the built-in
// utilities (`p-2`, `gap-4`, etc.) already are the design system's
// spacing scale, not a coincidental lookalike to reconcile.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: BRAND_COLORS,
        health: OUTLET_HEALTH_COLORS,
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
        // Real CSS comma-separated fallback chain — unlike React Native
        // (Customer/POS apps), the web actually honors this. Inter
        // itself still isn't loaded via a real font file/Google Fonts
        // import here either (known gap, see docs/STATUS.md), so this
        // still renders in the system fallback today — but the chain
        // itself is correct, ready for whenever Inter is actually added.
        sans: [FONT_FAMILY, ...FONT_FAMILY_FALLBACK.split(", ")],
      },
      fontSize: {
        "hq-display": `${TYPE_SCALE.display.hq}px`,
        "hq-heading": `${TYPE_SCALE.heading.hq}px`,
        "hq-body": `${TYPE_SCALE.body.hq}px`,
        "hq-caption": `${TYPE_SCALE.caption.hq}px`,
      },
    },
  },
  plugins: [],
};

export default config;
