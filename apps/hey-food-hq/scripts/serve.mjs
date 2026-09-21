#!/usr/bin/env node
// Starts the HQ Admin web app (`next dev` / `next start`) — but ONLY on
// localhost unless someone deliberately, explicitly says otherwise.
//
// WHY THIS EXISTS: the HQ app has NO application-layer login (its "login" is a
// link) and its first write path — Product / Menu Management: master prices,
// per-outlet price overrides, availability — is next. Once that exists, ANYONE
// WHO CAN REACH THIS APP'S URL CAN CHANGE ANY PRICE FOR THE WHOLE BUSINESS,
// with nothing to stop or trace them. Next's default is to listen on every
// network interface (0.0.0.0), so "it works on my machine" would quietly also
// mean "it works for everyone on the same Wi-Fi". This makes the safe thing
// the default and the unsafe thing loud.
//
// This is a SEATBELT, not security: it only covers `pnpm dev` / `pnpm start`
// for this package (someone can still run `next` directly, or put a tunnel /
// port-forward / reverse proxy in front of a localhost bind). The real fix is
// real HQ authentication. See the banner at the top of
// apps/hey-food-backend/README.md and the CRITICAL section of docs/STATUS.md.
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

const banner = (lines) => {
  const width = Math.max(...lines.map((l) => l.length));
  const bar = "#".repeat(width + 4);
  return ["", bar, ...lines.map((l) => `# ${l.padEnd(width)} #`), bar, ""].join("\n");
};

// The host is chosen ONLY through HQ_BIND_HOST, so there is exactly one place
// this check can be bypassed, and it is the loud one.
if (passthrough.some((arg) => arg === "-H" || arg === "--hostname" || arg.startsWith("--hostname="))) {
  console.error(
    banner([
      "REFUSING TO START: do not pass -H / --hostname to the HQ app.",
      "The bind address is set with HQ_BIND_HOST (default 127.0.0.1) so the",
      "localhost-only safety check below cannot be skipped by accident.",
    ]),
  );
  process.exit(1);
}

const host = (process.env.HQ_BIND_HOST ?? "127.0.0.1").trim();

if (!isLoopback(host)) {
  if (process.env[OVERRIDE_VAR] !== OVERRIDE_PHRASE) {
    console.error(
      banner([
        `REFUSING TO START: HQ_BIND_HOST="${host}" is not localhost.`,
        "",
        "The HQ Admin app has NO LOGIN. Its menu/price screens let ANYONE who can",
        "reach its URL change ANY price for the whole business, untraceably.",
        "It must not listen on a network interface until real HQ auth exists.",
        "",
        "Unset HQ_BIND_HOST to bind 127.0.0.1 (localhost only).",
        "",
        "If you understand this is unsafe and want to do it anyway (e.g. an",
        "isolated throwaway demo network), you must ALSO set exactly:",
        `  ${OVERRIDE_VAR}=${OVERRIDE_PHRASE}`,
        "See the banner at the top of apps/hey-food-backend/README.md.",
      ]),
    );
    process.exit(1);
  }

  console.warn(
    banner([
      `!!! UNSAFE: HQ ADMIN IS LISTENING ON "${host}" — NOT LOCALHOST !!!`,
      "",
      "This app has NO LOGIN. Anyone who can reach this address can view and",
      "(once Menu Management exists) CHANGE ANY PRICE for the whole business.",
      "You set the unsafe-bind override deliberately. Do not leave this running.",
    ]),
  );
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, mode, "-H", host, ...passthrough], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
