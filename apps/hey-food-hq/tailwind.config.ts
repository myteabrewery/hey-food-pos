import type { Config } from "tailwindcss";

// Theme extension will pull from @hey-food/design-tokens once populated.
// See docs/hey-food-design-system-v1.md.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
