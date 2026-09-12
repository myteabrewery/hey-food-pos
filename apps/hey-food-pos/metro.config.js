// Metro config for a pnpm workspace monorepo — per Expo's own monorepo
// guide (https://docs.expo.dev/guides/monorepos/). Needed so Metro
// watches/resolves the whole workspace, not just this app's own
// directory (e.g. @hey-food/shared-types living in packages/, not
// node_modules). Identical to hey-food-customer's metro.config.js — same
// monorepo, same reasoning, see that file's comments for the
// disableHierarchicalLookup pnpm-specific caveat.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm's node_modules is symlink-heavy — Metro needs this explicitly.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
