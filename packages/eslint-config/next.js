// Next.js flat config, layered on the base TS config. Used by hey-food-hq.
//
// This does NOT use eslint-config-next / @next/eslint-plugin-next. Verified
// empirically (not just a peer-dep guess) that eslint-config-next@14.2.15
// is broken under ESLint 9: its `@next/next/no-duplicate-head` rule calls
// `context.getAncestors()`, an ESLint 8 API removed in ESLint 9, and throws
// at lint time. eslint-config-next only gained real ESLint 9 support from
// Next 15 onward (its own package.json declares `eslint: ">=9.0.0"` there,
// vs. `^7.23.0 || ^8.0.0` on the 14.x line, confirmed against the latest
// 14.2.x patch too). Bumping Next's major version is a separate, bigger
// decision than this config pass — until that happens, this config gives
// hey-food-hq the same React/hooks linting as the RN apps (both proven
// ESLint-9-compatible) plus browser globals, without the Next-specific
// rule plugin. Revisit once Next is upgraded to 15+.

const globals = require("globals");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

const baseConfig = require("./index");

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // App Router's automatic JSX transform — no React import needed per file.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];
