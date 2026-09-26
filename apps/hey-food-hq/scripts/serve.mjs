#!/usr/bin/env node
// Starts the HQ Admin web app (`next dev` / `next start`), binding to
// localhost by default.
//
// WHY: Next's own default is to listen on every network interface (0.0.0.0),
// so "it works on my machine" would quietly also mean "it works for everyone
// on the same Wi-Fi" unless something says otherwise. Now that real HQ login
// exists (`POST /auth/hq/login`), this is ordinary defense-in-depth rather
// than compensating for a missing login — a sound default for a local admin
// tool, not a load-bearing security control. It only covers `pnpm dev` /
// `pnpm start` for this package (someone can still run `next` directly, or
// put a tunnel / port-forward / reverse proxy in front of a localhost bind).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const OVERRIDE_VAR = "HQ_UNSAFE_NETWORK_BIND";
const OVERRIDE_PHRASE = "I_UNDERSTAND_THIS_IS_UNSAFE";

const [mode, ...passthrough] = process.argv.slice(2);
if (mode !== "dev" && mode !== "start") {
  console.error('usage: node scripts/serve.mjs <dev|start> [next options, but NOT -H/--hostname]');
  process.exit(2);
}

const isLoopback = (host) =>
  host === "localhost" || host === "::1" || host === "[::1]" || /^127(\.\d{1,3}){3}$/.test(host);

// The host is chosen ONLY through HQ_BIND_HOST, so there is exactly one place
// this check can be bypassed, and it is the explicit one.
if (passthrough.some((arg) => arg === "-H" || arg === "--hostname" || arg.startsWith("--hostname="))) {
  console.error(
    "Refusing to start: pass HQ_BIND_HOST instead of -H/--hostname, so the localhost-by-default check below isn't bypassed by accident.",
  );
  process.exit(1);
}

const host = (process.env.HQ_BIND_HOST ?? "127.0.0.1").trim();

if (!isLoopback(host)) {
  if (process.env[OVERRIDE_VAR] !== OVERRIDE_PHRASE) {
    console.error(
      [
        `Refusing to start: HQ_BIND_HOST="${host}" is not localhost.`,
        "Unset HQ_BIND_HOST to bind 127.0.0.1, or, if this is deliberate (e.g. an isolated demo network), set:",
        `  ${OVERRIDE_VAR}=${OVERRIDE_PHRASE}`,
      ].join("\n"),
    );
    process.exit(1);
  }

  console.warn(`HQ Admin is listening on "${host}", not localhost — deliberate, via ${OVERRIDE_VAR}.`);
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, mode, "-H", host, ...passthrough], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
