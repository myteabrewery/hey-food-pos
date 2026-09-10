// Placeholder dev data — Chicken Rice/Nasi Lemak, etc. Mirrors the
// frontend's existing mock data exactly (apps/hey-food-customer/src/api/
// outlets.ts, orders.ts) for the one outlet and order that already have
// mocks, so swapping mock -> real data later doesn't change what's
// currently shown on screen. Idempotent: safe to re-run.
//
// One of two named seed profiles (see also seed-soup-stall.ts) —
// docs/product-customization-v2.md's "Two seed profiles" section. Both
// write to the same schema; running one after clearing the database
// replaces the other, they're not meant to coexist. See the backend
// README for how to run each.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OPERATING_HOURS_10_TO_22 = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: { open: "10:00", close: "22:00" },
};

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "biz_hey_food" },
    update: {},
    create: { id: "biz_hey_food", name: "Hey Food" },
  });

  // Outlet names beyond Paradigm Mall come from the product blueprint
  // doc's own dashboard mockup (Section 6: Paradigm Mall, KSL City, Mid
  // Valley, Southkey, City Square) rather than being invented from
  // nothing. Paradigm Mall's fields match the frontend mock verbatim.
  //
  // IMPORTANT — KSL City and Mid Valley's `lat`/`lng` below are PLACEHOLDER
  // values, not verified coordinates: they're a rough approximation of
  // each real mall's location, typed from memory rather than looked up or
  // measured. Nothing in the docs specifies real coordinates for these two.
  // If geofencing logic is ever tested against this seed data and the
  // "am I near this outlet" behavior looks wrong for KSL City or Mid
  // Valley, suspect this seed data's coordinate accuracy first, not the
  // geofencing code — Paradigm Mall's coordinates (from the frontend mock)
  // are the only ones here with any real provenance.
  const outletParadigmMall = await prisma.outlet.upsert({
    where: { id: "outlet_paradigm_mall" },
    update: {},
    create: {
      id: "outlet_paradigm_mall",
      businessId: business.id,
      name: "Hey Food — Paradigm Mall",
      address: "1 Utama Shopping Centre, Petaling Jaya",
      lat: 3.1499,
      lng: 101.6122,
      geofenceRadiusM: 100,
      operatingHours: OPERATING_HOURS_10_TO_22,
      status: "open",
    },
  });

  const outletKslCity = await prisma.outlet.upsert({
    where: { id: "outlet_ksl_city" },
    update: {},
    create: {
      id: "outlet_ksl_city",
      businessId: business.id,
      name: "Hey Food — KSL City",
      address: "KSL City Mall, Johor Bahru",
      lat: 1.4927,
      lng: 103.7414,
      geofenceRadiusM: 100,
      operatingHours: OPERATING_HOURS_10_TO_22,
      status: "open",
    },
  });

  const outletMidValley = await prisma.outlet.upsert({
    where: { id: "outlet_mid_valley" },
    update: {},
    create: {
      id: "outlet_mid_valley",
      businessId: business.id,
      name: "Hey Food — Mid Valley",
      address: "Mid Valley Megamall, Kuala Lumpur",
      lat: 3.1177,
      lng: 101.6774,
      geofenceRadiusM: 100,
      operatingHours: OPERATING_HOURS_10_TO_22,
      status: "open",
    },
  });

  // Master catalog matches the frontend's getOutletDetail mock verbatim
  // (name/description/category/masterPrice), plus one item the task asked
  // for that has no existing mock or doc reference at all ("Nasi Lemak
  // items, etc.") — that one is fully invented: name, description, price
  // and category are all judgment calls, not sourced from any doc.
  const productChickenRice = await prisma.product.upsert({
    where: { id: "prod_chicken_rice" },
    update: {},
    create: {
      id: "prod_chicken_rice",
      businessId: business.id,
      name: "Chicken Rice",
      description: "Steamed chicken, fragrant rice, chili sauce.",
      imageUrl: "",
      category: "Rice",
      masterPrice: 8.0,
    },
  });

  await prisma.product.upsert({
    where: { id: "prod_fried_noodles" },
    update: {},
    create: {
      id: "prod_fried_noodles",
      businessId: business.id,
      name: "Fried Noodles",
      description: "Wok-fried noodles with vegetables and egg.",
      imageUrl: "",
      category: "Noodles",
      masterPrice: 7.5,
    },
  });

  const productFriedChicken = await prisma.product.upsert({
    where: { id: "prod_fried_chicken" },
    update: {},
    create: {
      id: "prod_fried_chicken",
      businessId: business.id,
      name: "Fried Chicken (2pc)",
      description: "Crispy fried chicken, two pieces.",
      imageUrl: "",
      category: "Chicken",
      masterPrice: 9.0,
    },
  });

  const productIcedTea = await prisma.product.upsert({
    where: { id: "prod_iced_tea" },
    update: {},
    create: {
      id: "prod_iced_tea",
      businessId: business.id,
      name: "Iced Tea",
      description: "Sweetened iced tea.",
      imageUrl: "",
      category: "Drinks",
      masterPrice: 3.0,
    },
  });

  await prisma.product.upsert({
    where: { id: "prod_nasi_lemak_ayam" },
    update: {},
    create: {
      id: "prod_nasi_lemak_ayam",
      businessId: business.id,
      name: "Nasi Lemak Ayam",
      description: "Coconut rice with sambal, egg, peanuts, and fried chicken.",
      imageUrl: "",
      category: "Rice",
      masterPrice: 7.0,
    },
  });

  // Chicken Rice's modifier groups exercise every rule from docs/product-
  // customization-v2.md in one product — a group requiring exactly one
  // selection, an optional multiple-select group, and zero-price options
  // — per the spec's own guidance that this is enough coverage without
  // customizing every product. min/max values here are v2's direct
  // equivalent of v1's old required flags, per that doc's migration
  // table (single+required -> min:1,max:1; multiple+not-required ->
  // min:0,max:null). quantityEnabled is false throughout — no option here
  // has ever had a quantity concept (that's new in v2, exercised instead
  // by seed-soup-stall.ts's Ingredients group).
  const modifierGroupSpiceLevel = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_chicken_rice_spice" },
    update: {},
    create: {
      id: "modgrp_chicken_rice_spice",
      productId: productChickenRice.id,
      name: "Spice Level",
      selectionType: "single",
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
    },
  });

  const modifierGroupAddOns = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_chicken_rice_addons" },
    update: {},
    create: {
      id: "modgrp_chicken_rice_addons",
      productId: productChickenRice.id,
      name: "Add-ons",
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: null,
      sortOrder: 1,
    },
  });

  const modifierGroupRemove = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_chicken_rice_remove" },
    update: {},
    create: {
      id: "modgrp_chicken_rice_remove",
      productId: productChickenRice.id,
      name: "Remove",
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: null,
      sortOrder: 2,
    },
  });

  const modifierOptions = [
    {
      id: "modopt_spice_mild",
      groupId: modifierGroupSpiceLevel.id,
      name: "Mild",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 0,
    },
    {
      id: "modopt_spice_medium",
      groupId: modifierGroupSpiceLevel.id,
      name: "Medium",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 1,
    },
    {
      id: "modopt_spice_spicy",
      groupId: modifierGroupSpiceLevel.id,
      name: "Spicy",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 2,
    },
    {
      id: "modopt_addon_extra_egg",
      groupId: modifierGroupAddOns.id,
      name: "Extra Egg",
      priceDelta: 1.5,
      quantityEnabled: false,
      sortOrder: 0,
    },
    {
      id: "modopt_addon_extra_chicken",
      groupId: modifierGroupAddOns.id,
      name: "Extra Chicken",
      priceDelta: 3.0,
      quantityEnabled: false,
      sortOrder: 1,
    },
    {
      id: "modopt_remove_no_veg",
      groupId: modifierGroupRemove.id,
      name: "No Vegetables",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 0,
    },
    {
      id: "modopt_remove_no_onions",
      groupId: modifierGroupRemove.id,
      name: "No Onions",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 1,
    },
  ];

  for (const option of modifierOptions) {
    await prisma.productModifierOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });
  }

  // Reproduces the frontend mock's sold-out Fried Chicken at Paradigm Mall
  // exactly. Every other product has no override row at Paradigm Mall —
  // this assumes the future menu-resolution logic treats "no override row"
  // as "available at master price," which hasn't been built yet but is the
  // natural reading of OutletProductOverride's purpose.
  await prisma.outletProductOverride.upsert({
    where: {
      outletId_productId: {
        outletId: outletParadigmMall.id,
        productId: productFriedChicken.id,
      },
    },
    update: {},
    create: {
      outletId: outletParadigmMall.id,
      productId: productFriedChicken.id,
      isAvailable: false,
      priceOverride: null,
    },
  });

  // Demonstrates the price-override path (no equivalent in the current
  // frontend mock) — invented example price, not sourced from any doc.
  await prisma.outletProductOverride.upsert({
    where: {
      outletId_productId: {
        outletId: outletKslCity.id,
        productId: productChickenRice.id,
      },
    },
    update: {},
    create: {
      outletId: outletKslCity.id,
      productId: productChickenRice.id,
      isAvailable: true,
      priceOverride: 8.5,
    },
  });

  // Minimal StaffUser + POSDevice rows aren't part of the frontend mock data
  // (no screen renders them yet) but are added so every relation in the
  // schema gets exercised by at least one row during this verification
  // pass, per the task's step 4. Phone/pin values are placeholders.
  await prisma.staffUser.upsert({
    where: { id: "staff_hq_admin" },
    update: {},
    create: {
      id: "staff_hq_admin",
      businessId: business.id,
      name: "HQ Admin",
      phone: "+60111111111",
      role: "hq_admin",
      assignedOutletIds: [outletParadigmMall.id, outletKslCity.id, outletMidValley.id],
      pinHash: "placeholder_pin_hash",
    },
  });

  for (const outlet of [outletParadigmMall, outletKslCity, outletMidValley]) {
    await prisma.posDevice.upsert({
      where: { id: `pos_${outlet.id}` },
      update: {},
      create: {
        id: `pos_${outlet.id}`,
        outletId: outlet.id,
        deviceName: `${outlet.name} — Counter 1`,
        lastSeenAt: new Date(),
        connectionStatus: "online",
      },
    });
  }

  // Customer + order/items/payment match the frontend's getActiveOrder mock
  // verbatim (same ids, amounts, and timestamps-set-vs-null pattern for the
  // "preparing" stage). Customer name/phone and the payment's providerRef/
  // webhookPayload have no mock equivalent (the mock only carries the
  // paymentId FK) and are invented placeholders.
  const customer = await prisma.customer.upsert({
    where: { id: "customer_mock" },
    update: {},
    create: {
      id: "customer_mock",
      phone: "+60123456789",
      name: "Mock Customer",
      loyaltyPoints: 0,
    },
  });

  const now = new Date();

  // Payment.orderId is the enforced FK (see schema.prisma's judgment-call
  // comment on Order/Payment) and points at an order that must already
  // exist, so the order is created first — with paymentId left unset — and
  // then updated to point at the payment once it exists. That two-step
  // dance is purely a seeding-order artifact of the mutual-reference shape
  // already present in shared-types; it's not something application code
  // will need to replicate, since a real checkout flow creates the order
  // first and only creates its Payment once checkout proceeds anyway.
  const order = await prisma.order.upsert({
    where: { id: "order_mock_active" },
    update: {},
    create: {
      id: "order_mock_active",
      outletId: outletParadigmMall.id,
      customerId: customer.id,
      displayId: "PM042",
      status: "preparing",
      subtotal: 11.0,
      serviceFee: 2.0,
      total: 13.0,
      paidAt: now,
      receivedAt: now,
      preparingAt: now,
      orderItems: {
        connectOrCreate: [
          {
            where: { id: "orderitem_mock_1" },
            create: {
              id: "orderitem_mock_1",
              productId: productChickenRice.id,
              nameSnapshot: "Chicken Rice",
              priceSnapshot: 8.0,
              quantity: 1,
            },
          },
          {
            where: { id: "orderitem_mock_2" },
            create: {
              id: "orderitem_mock_2",
              productId: productIcedTea.id,
              nameSnapshot: "Iced Tea",
              priceSnapshot: 3.0,
              quantity: 1,
            },
          },
        ],
      },
      notificationLogs: {
        connectOrCreate: [
          {
            where: { id: "notif_mock_received" },
            create: {
              id: "notif_mock_received",
              channel: "push",
              sentAt: now,
              delivered: true,
              payload: { message: "Order received." },
            },
          },
        ],
      },
    },
  });

  const payment = await prisma.payment.upsert({
    where: { id: "payment_mock" },
    update: {},
    create: {
      id: "payment_mock",
      orderId: order.id,
      provider: "billplz",
      providerRef: "billplz_mock_ref_001",
      status: "paid",
      amount: 13.0,
      paidAt: now,
      webhookPayload: {},
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentId: payment.id },
  });

  console.log("Seed complete (placeholder profile).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
