import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Real route file so Expo Router registers the Cart tab, but this
 * content should never actually be seen — the tab layout intercepts
 * tabPress and opens /cart-modal instead (docs/customer-app-screens-
 * v2.md Section 5: Cart is "NOT primarily a tab destination"). This
 * effect is just a fallback in case this route is ever reached some
 * other way (e.g. a deep link to /cart directly).
 */
export default function CartTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cart-modal");
  }, [router]);

  return null;
}
