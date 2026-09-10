import { useLocalSearchParams } from "expo-router";

import { ProductDetailScreen } from "../../screens/ProductDetailScreen";

/**
 * Root-level route (a sibling of (tabs) and cart-modal, like they are of
 * each other) — pushed onto the stack, not presented as a modal, so it
 * gets the default push animation and back gesture. No explicit
 * <Stack.Screen> entry needed in _layout.tsx: it only overrides options
 * for routes that need non-default presentation (cart-modal); this one
 * just inherits the Stack's global headerShown: false, same as (tabs).
 */
export default function ProductDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetailScreen productId={id} />;
}
