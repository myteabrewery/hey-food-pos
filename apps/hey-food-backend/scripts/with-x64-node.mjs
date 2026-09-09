#!/usr/bin/env node
// Prisma ships no native Windows-ARM64 query engine (see README.md, "Windows
// on ARM" section) — on an arm64 Node process, `@prisma/client` fails to
// load its engine with "not a valid Win32 application". The fix is to run
// anything that instantiates PrismaClient (dev server, prisma CLI, seed
// script) under an x64 Node instead; Windows' x64 emulation runs it fine.
//
// This wrapper prepends an x64 Node install to PATH before running the
// given command, so any `node` it (or something it spawns) resolves to is
// the x64 build. On a machine that doesn't have this problem (a plain x64
// Windows box, or a future non-Windows dev machine), the configured
// directory won't exist, so this is a silent no-op and the command runs
// under whatever Node was already on PATH.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_X64_NODE_DIR = "C:\\node-x64\\node-v24.20.0-win-x64";
const x64NodeDir = process.env.HEY_FOOD_X64_NODE_DIR ?? DEFAULT_X64_NODE_DIR;

const env = { ...process.env };
if (existsSync(x64NodeDir)) {
  env.PATH = `${x64NodeDir};${env.PATH ?? ""}`;
} else {
  console.warn(
    `[with-x64-node] ${x64NodeDir} not found — running with whatever Node is already on PATH. ` +
      `If this machine hits the Prisma/Windows-ARM64 issue, see README.md's "Windows on ARM" section.`,
  );
}

const [, , command, ...args] = process.argv;
const result = spawnSync(command, args, {
  env,
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
