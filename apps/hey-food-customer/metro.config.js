// Metro config for a pnpm workspace monorepo — per Expo's own monorepo
// guide (https://docs.expo.dev/guides/monorepos/). Needed so Metro
// watches/resolves the whole workspace, not just this app's own
// directory (e.g. @hey-food/shared-types living in packages/, not
// node_modules). NOT related to the separate, still-unresolved web
// dev-server backslash-URL bug (see git log) — adding this config was
// confirmed not to fix that one.
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
//
// disableHierarchicalLookup is deliberately NOT set here. That flag is
// common advice for yarn/npm *hoisted* monorepos (stops Metro picking up
// a wrong, higher-up version of a hoisted package), but it's wrong for
// pnpm: pnpm resolves a package's own dependencies via nested symlinks
// inside that package's own node_modules (found by Node's normal
// walk-up-the-tree "hierarchical lookup"), not by hoisting everything to
// one shared location. Setting it broke resolving expo-router's own
// @expo/metro-runtime dependency — confirmed by a real device connecting
// to the dev server and hitting "Unable to resolve @expo/metro-runtime".
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
