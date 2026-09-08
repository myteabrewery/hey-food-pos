// Metro config for a pnpm workspace monorepo — per Expo's own monorepo
// guide (https://docs.expo.dev/guides/monorepos/). Without this, Metro
// doesn't know to watch/resolve the workspace root, which is very likely
// why the web bundle URL came back with unnormalized Windows path
// separators (`..\..\node_modules\...`) pointing outside the app's own
// directory with no monorepo-aware resolution config in place.
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
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
