#!/usr/bin/env node
// Regression check for one specific bug class: an `/admin/*` by-id endpoint
// that fetches a resource via its id alone, without checking it belongs to
// the CALLING SESSION's own business. Two real instances of exactly this
// shipped and were found late (see docs/STATUS.md, "Real HQ authentication"
// and its "Follow-up fix" row) — this script is the test that should have
// caught them, so a future `/admin/*` by-id endpoint that repeats the same
// mistake fails loudly instead of silently.
//
// WHAT IT DOES: creates a second, throwaway "Business B" (own outlet,
// product, customer+order, and hq_admin) alongside the real seed data
// ("Business A"), then for every entry in RESOURCE_CHECKS below, asserts all
// four directions: A can fetch its own resource by id (200), A cannot fetch
// B's (404, hidden — never 403, which would confirm the id exists), and the
// same both ways for B. Cleans up Business B's fixtures whether it passes or
// fails.
//
// HOW TO EXTEND: adding a new `/admin/*` GET-by-id (or similarly by-id-scoped)
// endpoint? Add one entry to RESOURCE_CHECKS. It needs a real fixture id in
// each business — reuse an existing one created below, or create a new kind
// of fixture the same way products/customers/orders/staff are here.
//
// REQUIRES: the backend running against a fresh seed DB (`pnpm run
// db:seed:placeholder`), reachable at API_BASE_URL (default localhost:3000).
// Run via the x64-node wrapper on Windows-ARM64, same as every other script
// here that touches Prisma:
//   node scripts/with-x64-node.mjs node scripts/check-cross-business-isolation.mjs
//
// NOT wired into any CI (there is no test runner or CI in this repo at all —
// see the README). This is a real, committed script specifically so it
// survives past any one session, but running it is still a manual step.

import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, "..");

for (const line of readFileSync(path.join(backendRoot, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^DATABASE_URL\s*=\s*"?([^"]*)"?\s*$/);
  if (m) process.env.DATABASE_URL = m[1];
}

const { PrismaClient } = await import(pathToFileURL(path.join(backendRoot, "node_modules/@prisma/client/index.js")));
const prisma = new PrismaClient();

const BASE = process.env.API_BASE_URL ?? "http://localhost:3000";
const BIZ_A = "biz_hey_food";
// Must match prisma/seed-placeholder.ts's own seeded hq_admin exactly.
const HQ_A_PHONE = "+60111111111";
const HQ_A_PASSWORD = "dev-hq-admin-password-not-a-secret";

function hashPasswordForFixture(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function http(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json };
}

async function login(businessId, phone, password) {
  const res = await http("POST", "/auth/hq/login", { body: { businessId, phone, password } });
  if (res.status !== 200) {
    throw new Error(`login failed for ${phone} @ ${businessId}: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return res.json.token;
}

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}   <<< ${JSON.stringify(detail)}`);
  }
}

/**
 * The four-direction check every resource type gets, generically: own
 * business sees its own resource; neither business can reach the other's by
 * id, and it must be 404 (hidden), never 403 (which would confirm the id is
 * real and just off-limits).
 */
async function checkCrossBusinessById(label, path_, notFoundCode, tokenA, idA, tokenB, idB) {
  const aOwn = await http("GET", path_(idA), { token: tokenA });
  check(`${label}: business A can fetch its own by id`, aOwn.status === 200, aOwn);

  const bOwn = await http("GET", path_(idB), { token: tokenB });
  check(`${label}: business B can fetch its own by id`, bOwn.status === 200, bOwn);

  const bSeesA = await http("GET", path_(idA), { token: tokenB });
  check(`${label}: business B cannot fetch business A's by id -> 404`, bSeesA.status === 404 && bSeesA.json?.error?.code === notFoundCode, bSeesA);

  const aSeesB = await http("GET", path_(idB), { token: tokenA });
  check(`${label}: business A cannot fetch business B's by id -> 404`, aSeesB.status === 404 && aSeesB.json?.error?.code === notFoundCode, aSeesB);
}

async function main() {
  const tokenA = await login(BIZ_A, HQ_A_PHONE, HQ_A_PASSWORD);

  // --- Business B: a full throwaway tenant, one of everything -------------
  const bizB = await prisma.business.create({ data: { name: "Cross-business isolation check — Business B" } });
  const outletB = await prisma.outlet.create({
    data: {
      businessId: bizB.id,
      name: "Isolation Check Outlet B",
      address: "1 Test Street",
      lat: 1,
      lng: 1,
      geofenceRadiusM: 100,
      operatingHours: Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, { open: "10:00", close: "22:00" }])),
      displayPrefix: "XB",
    },
  });
  const productB = await prisma.product.create({
    data: { businessId: bizB.id, name: "Isolation Check Product B", description: "x", imageUrl: "", category: "x", masterPrice: "5.00" },
  });
  const customerB = await prisma.customer.create({ data: { name: "Isolation Check Customer B", phone: "+60199990001", loyaltyPoints: 0 } });
  const orderB = await prisma.order.create({
    data: {
      outletId: outletB.id,
      customerId: customerB.id,
      businessDate: new Date("2026-01-01T00:00:00Z"),
      dailySeq: 1,
      displayId: "XB001",
      status: "paid",
      subtotal: "10.00",
      serviceFee: "2.00",
      total: "12.00",
    },
  });
  const passwordB = "Isolation-Check-Password-1";
  const staffB = await prisma.staffUser.create({
    data: {
      businessId: bizB.id,
      name: "Isolation Check Admin B",
      phone: "+60177770001",
      role: "hq_admin",
      assignedOutletIds: [],
      pinHash: "unused",
      pinChangedAt: new Date(),
      passwordHash: hashPasswordForFixture(passwordB),
      passwordChangedAt: new Date(),
      isActive: true,
    },
  });
  const tokenB = await login(bizB.id, staffB.phone, passwordB);

  // --- Business A: real fixtures already in the seed data -----------------
  const seedOrderA = await prisma.order.findFirstOrThrow({ where: { outlet: { businessId: BIZ_A } } });
  const seedProductA = await prisma.product.findFirstOrThrow({ where: { businessId: BIZ_A } });
  const seedStaffA = await prisma.staffUser.findFirstOrThrow({ where: { businessId: BIZ_A, role: "hq_admin" } });
  const seedCustomerA = await prisma.customer.findFirstOrThrow({ where: { orders: { some: { outlet: { businessId: BIZ_A } } } } });

  // --- The generic check, once per admin resource that has a by-id route --
  // Extend this list when a new `/admin/*` by-id endpoint is added.
  const RESOURCE_CHECKS = [
    { label: "orders", path: (id) => `/admin/orders/${encodeURIComponent(id)}`, notFoundCode: "ORDER_NOT_FOUND", idA: seedOrderA.id, idB: orderB.id },
    { label: "products", path: (id) => `/admin/products/${encodeURIComponent(id)}`, notFoundCode: "PRODUCT_NOT_FOUND", idA: seedProductA.id, idB: productB.id },
    { label: "staff", path: (id) => `/admin/staff/${encodeURIComponent(id)}`, notFoundCode: "STAFF_NOT_FOUND", idA: seedStaffA.id, idB: staffB.id },
    { label: "customers", path: (id) => `/admin/customers/${encodeURIComponent(id)}`, notFoundCode: "CUSTOMER_NOT_FOUND", idA: seedCustomerA.id, idB: customerB.id },
  ];

  try {
    for (const resource of RESOURCE_CHECKS) {
      await checkCrossBusinessById(resource.label, resource.path, resource.notFoundCode, tokenA, resource.idA, tokenB, resource.idB);
    }
  } finally {
    // Cleanup, FK order: sessions -> orders -> staff -> customer -> outlet -> business.
    // Whether the checks above passed or failed, Business B must not survive this script,
    // and the seed hq_admin's own session from `login()` above shouldn't linger either.
    await http("POST", "/auth/hq/logout", { token: tokenA });
    await prisma.staffSession.deleteMany({ where: { staffId: staffB.id } });
    await prisma.order.delete({ where: { id: orderB.id } });
    await prisma.staffUser.delete({ where: { id: staffB.id } });
    await prisma.customer.delete({ where: { id: customerB.id } });
    await prisma.product.delete({ where: { id: productB.id } });
    await prisma.outlet.delete({ where: { id: outletB.id } });
    await prisma.business.delete({ where: { id: bizB.id } });
  }

  console.log(`\nRESULT: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("SCRIPT CRASHED:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
