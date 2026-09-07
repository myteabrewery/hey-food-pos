// React / React Native flat config, layered on the base TS config.
// Used by the two Expo apps (Customer App, Outlet POS).

const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const reactNative = require("eslint-plugin-react-native");

const baseConfig = require("./index");

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-native": reactNative,
    },
    languageOptions: {
      // RN's own global, injected by the Metro/Babel toolchain at build
      // time — not something eslint-plugin-react-native declares itself.
      globals: {
        __DEV__: "readonly",
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
      // New JSX transform (Expo/RN 0.74 default) — no React import needed per file.
      "react/react-in-jsx-scope": "off",
      // This is a TS codebase; prop types are enforced by TypeScript, not PropTypes.
      "react/prop-types": "off",
      "react-native/no-unused-styles": "error",
      "react-native/no-inline-styles": "warn",
    },
  },
];
