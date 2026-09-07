// Shared base ESLint config for Hey Food apps/packages.
// Intentionally minimal — scaffolding only, no rule set decided yet.

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2021: true,
  },
};
