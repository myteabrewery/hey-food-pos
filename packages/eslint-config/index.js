// Base ESLint flat config for Hey Food — TypeScript + import ordering.
// Not type-aware (no `parserOptions.project`) on purpose: type-aware
// linting needs a correctly wired tsconfig per app, which is real setup
// work across 4 differently-shaped apps (RN x2, Next, Nest) — out of scope
// for this quick pass. Revisit if a rule that needs type info is wanted.
//
// Consumed directly (`require("@hey-food/eslint-config")`) by apps with no
// framework-specific needs (the backend). Apps with a framework extend one
// of the sibling configs instead: ./react-native.js, ./next.js.

const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const importPlugin = require("eslint-plugin-import");

module.exports = tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/.expo/**", "**/build/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      // The user asked for these two as errors, not warnings — both are
      // "warn" by default in the presets above, overridden here.
      "import/order": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
);
