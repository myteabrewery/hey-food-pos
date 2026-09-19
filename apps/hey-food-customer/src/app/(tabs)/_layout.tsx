import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { BRAND_COLORS, FONT_FAMILY } from "@hey-food/design-tokens";

/**
 * Five tabs per docs/customer-app-screens-v2.md Section 2. Cart is
 * registered as a real tab (Expo Router needs a file to define the
 * route) but its press is intercepted so it opens the cart-modal overlay
 * instead of navigating to a tab screen — v2 explicitly says Cart is
 * "NOT primarily a tab destination."
 *
 * Active tab icon color is `teal`, inactive is `muted`. v2's Section 1
 * table also mentions `navy` for "bottom nav active accents" alongside
 * `teal` for "active nav icon" — no specific accent shape/size is given,
 * so only the icon-color part is implemented here; no separate navy
 * accent indicator was invented.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLORS.teal,
        tabBarInactiveTintColor: BRAND_COLORS.muted,
        tabBarLabelStyle: { fontFamily: FONT_FAMILY },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t("tabs.menu"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("tabs.cart"),
          tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/cart-modal");
          },
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t("tabs.rewards"),
          tabBarIcon: ({ color, size }) => <Ionicons name="gift" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.account"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
