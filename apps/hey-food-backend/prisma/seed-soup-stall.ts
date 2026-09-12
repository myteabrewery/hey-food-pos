// Soup-stall dev data — the real business's actual menu configuration,
// per docs/product-customization-v2.md's "This business's actual
// configuration" section. One of two named seed profiles (see also
// seed-placeholder.ts) — both write to the same schema; running one
// after clearing the database replaces the other, they're not meant to
// coexist. See the backend README for how to run each.
//
// EVERYTHING below marked "placeholder" is invented, not sourced from
// the real business — the spec doc explicitly asks for placeholder
// prices/names for the real menu to be swapped in later. This includes
// the business name, outlet address/coordinates, the base product
// itself (the spec describes only the three modifier groups, not what
// product they attach to — "DIY Soup Bowl" is invented to hang them
// on), and every ingredient/price.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // PLACEHOLDER — real business name TBD.
  const business = await prisma.business.upsert({
    where: { id: "biz_soup_stall" },
    update: {},
    create: { id: "biz_soup_stall", name: "Soup Stall (placeholder name)" },
  });

  // PLACEHOLDER — address/coordinates are an arbitrary Kuala Lumpur point,
  // not the real stall's actual location.
  const outlet = await prisma.outlet.upsert({
    where: { id: "outlet_soup_stall_main" },
    update: {},
    create: {
      id: "outlet_soup_stall_main",
      businessId: business.id,
      name: "Soup Stall (placeholder name) — Main Outlet",
      address: "Placeholder address, Kuala Lumpur",
      lat: 3.139,
      lng: 101.6869,
      geofenceRadiusM: 100,
      operatingHours: {
        mon: { open: "11:00", close: "21:00" },
        tue: { open: "11:00", close: "21:00" },
        wed: { open: "11:00", close: "21:00" },
        thu: { open: "11:00", close: "21:00" },
        fri: { open: "11:00", close: "21:00" },
        sat: { open: "11:00", close: "21:00" },
        sun: { open: "11:00", close: "21:00" },
      },
      status: "open",
    },
  });

  // PLACEHOLDER — the spec describes the three modifier groups below but
  // not the base product they belong to; name/price invented to hang
  // them on something concrete.
  const product = await prisma.product.upsert({
    where: { id: "prod_diy_soup_bowl" },
    update: {},
    create: {
      id: "prod_diy_soup_bowl",
      businessId: business.id,
      name: "DIY Soup Bowl (placeholder name)",
      description: "Build your own bowl: pick a soup base, at least 2 ingredients, and an optional carb.",
      imageUrl: "",
      category: "Soup",
      masterPrice: 5.0,
    },
  });

  // Soup Base — single, must pick exactly one (min:1, max:1).
  const groupSoupBase = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_soup_base" },
    update: {},
    create: {
      id: "modgrp_soup_base",
      productId: product.id,
      name: "Soup Base",
      selectionType: "single",
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
    },
  });

  // Ingredients — multiple, at least 2, no upper limit (min:2, max:null).
  const groupIngredients = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_ingredients" },
    update: {},
    create: {
      id: "modgrp_ingredients",
      productId: product.id,
      name: "Ingredients",
      selectionType: "multiple",
      minSelections: 2,
      maxSelections: null,
      sortOrder: 1,
    },
  });

  // Carb Base — single, optional (min:0, max:1).
  const groupCarbBase = await prisma.productModifierGroup.upsert({
    where: { id: "modgrp_carb_base" },
    update: {},
    create: {
      id: "modgrp_carb_base",
      productId: product.id,
      name: "Carb Base",
      selectionType: "single",
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 2,
    },
  });

  // imageUrl: null on every option below — no real per-ingredient photos
  // exist yet (nullable per docs/product-customization-v2.md's imageUrl
  // addition), so this deliberately leaves the column empty rather than
  // inventing placeholder image URLs that would look like real assets.
  // Real photos get swapped in later by editing this data, not by
  // changing code.
  const modifierOptions = [
    // PLACEHOLDER prices — Tomyam/Laksa priced above Clear Soup, per the
    // spec's own steer ("commonly cost more than Clear Soup"). None of
    // these support a quantity (quantityEnabled: false) — "2x Tomyam"
    // doesn't mean anything for a soup base.
    {
      id: "modopt_soup_tomyam",
      groupId: groupSoupBase.id,
      name: "Tomyam",
      priceDelta: 2.0,
      quantityEnabled: false,
      sortOrder: 0,
      imageUrl: null,
    },
    {
      id: "modopt_soup_laksa",
      groupId: groupSoupBase.id,
      name: "Laksa",
      priceDelta: 2.0,
      quantityEnabled: false,
      sortOrder: 1,
      imageUrl: null,
    },
    {
      id: "modopt_soup_clear",
      groupId: groupSoupBase.id,
      name: "Clear Soup",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 2,
      imageUrl: null,
    },
    // PLACEHOLDER ingredient list/prices — real ones TBD. quantityEnabled:
    // true on every option here, per the spec ("2x Fish Balls" etc.).
    {
      id: "modopt_ing_fish_balls",
      groupId: groupIngredients.id,
      name: "Fish Balls",
      priceDelta: 1.5,
      quantityEnabled: true,
      sortOrder: 0,
      imageUrl: null,
    },
    {
      id: "modopt_ing_meatballs",
      groupId: groupIngredients.id,
      name: "Meatballs",
      priceDelta: 2.0,
      quantityEnabled: true,
      sortOrder: 1,
      imageUrl: null,
    },
    {
      id: "modopt_ing_tofu",
      groupId: groupIngredients.id,
      name: "Tofu",
      priceDelta: 1.0,
      quantityEnabled: true,
      sortOrder: 2,
      imageUrl: null,
    },
    {
      id: "modopt_ing_prawns",
      groupId: groupIngredients.id,
      name: "Prawns",
      priceDelta: 3.0,
      quantityEnabled: true,
      sortOrder: 3,
      imageUrl: null,
    },
    {
      id: "modopt_ing_mixed_veg",
      groupId: groupIngredients.id,
      name: "Mixed Vegetables",
      priceDelta: 1.0,
      quantityEnabled: true,
      sortOrder: 4,
      imageUrl: null,
    },
    // PLACEHOLDER — priceDelta 0 for all three; no signal that this stall
    // charges extra for a specific carb, per the spec's own steer
    // ("presumably priceDelta: 0 each unless you charge extra"). Not a
    // quantity concept either (quantityEnabled: false) — "2x Rice" isn't
    // a thing here, unlike a la carte ingredients.
    {
      id: "modopt_carb_rice",
      groupId: groupCarbBase.id,
      name: "Rice",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 0,
      imageUrl: null,
    },
    {
      id: "modopt_carb_yellow_noodle",
      groupId: groupCarbBase.id,
      name: "Yellow Noodle",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 1,
      imageUrl: null,
    },
    {
      id: "modopt_carb_vermicelli",
      groupId: groupCarbBase.id,
      name: "Vermicelli",
      priceDelta: 0,
      quantityEnabled: false,
      sortOrder: 2,
      imageUrl: null,
    },
  ];

  for (const option of modifierOptions) {
    await prisma.productModifierOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });
  }

  console.log("Seed complete (soup-stall profile). Outlet:", outlet.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
