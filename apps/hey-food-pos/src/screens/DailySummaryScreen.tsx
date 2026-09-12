import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { getMockDailySummaryStats, getMockTopSellingItems } from "../mock/summary";

interface StatTile {
  key: string;
  label: string;
  value: string;
}

/**
 * Daily Summary (docs/hey-food-developer-spec-v1.md Section 5.4). Section
 * 5.4 is explicit that these aggregates must be computed server-side, not
 * client-side, so POS and HQ never disagree on the same number for the
 * same outlet — no such aggregation endpoint exists yet, so unlike the
 * Queue/Menu Availability screens (which validate their mock data against
 * real shared-types/api-client schemas), there's no real contract shape
 * to validate this against either. Purely static placeholder numbers.
 *
 * The on-screen "PLACEHOLDER DATA" banner is deliberate, same reasoning
 * as LoginScreen's visible stub caption: sales/order numbers read as
 * authoritative business metrics, and a busy staff member glancing at
 * this screen has no other way to tell they're fake.
 */
export function DailySummaryScreen() {
  const stats = getMockDailySummaryStats();
  const topSelling = getMockTopSellingItems();

  const tiles: StatTile[] = [
    { key: "sales", label: "SALES TODAY", value: `RM${stats.salesTodayRM.toFixed(2)}` },
    { key: "orders", label: "ORDERS", value: String(stats.ordersCount) },
    { key: "avgPrep", label: "AVG PREP TIME", value: `${stats.avgPrepMinutes} min` },
    { key: "cancelled", label: "CANCELLED", value: String(stats.cancelledCount) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.placeholderBanner}>
        <Text style={styles.placeholderBannerText}>
          PLACEHOLDER DATA — no live aggregation endpoint yet
        </Text>
      </View>

      <View style={styles.tileGrid}>
        {tiles.map((tile) => (
          <View key={tile.key} style={styles.tile}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>TOP SELLING TODAY</Text>
      <View style={styles.topSellingList}>
        {topSelling.map((item, index) => (
          <View key={item.productId} style={styles.topSellingRow}>
            <Text style={styles.topSellingRank}>{index + 1}</Text>
            <Text style={styles.topSellingName}>{item.name}</Text>
            <Text style={styles.topSellingQuantity}>{item.quantitySold} sold</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const posSpacing = SPACING_BY_APP.pos;
const TILE_MIN_WIDTH = 180;

const styles = StyleSheet.create({
  content: {
    padding: posSpacing.tapPaddingPx,
    gap: posSpacing.tapPaddingPx,
  },
  placeholderBanner: {
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: BRAND_COLORS.onNavyMuted,
    paddingVertical: SPACING_SCALE[1], // 8px
    paddingHorizontal: posSpacing.tapPaddingPx,
  },
  placeholderBannerText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: posSpacing.queueCardGapPx,
  },
  tile: {
    flexGrow: 1,
    minWidth: TILE_MIN_WIDTH,
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    padding: posSpacing.tapPaddingPx,
    gap: SPACING_SCALE[0], // 4px
  },
  tileValue: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  tileLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.muted,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 1,
  },
  topSellingList: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  topSellingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: posSpacing.tapPaddingPx,
    paddingVertical: posSpacing.tapPaddingPx,
    paddingHorizontal: posSpacing.tapPaddingPx,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.line,
  },
  topSellingRank: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.muted,
    minWidth: 24,
  },
  topSellingName: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  topSellingQuantity: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "700",
    color: BRAND_COLORS.muted,
  },
});
