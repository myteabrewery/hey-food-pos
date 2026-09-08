import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { CartBar } from "./CartBar";

export interface TabScreenShellProps {
  children: ReactNode;
}

/**
 * Wraps a tab screen's content with the persistent cart bar pinned to the
 * bottom of the screen's own content area — which, inside a tab
 * navigator, already sits just above the native tab bar, so this needs no
 * absolute positioning or tab-bar-height calculation. Used by every tab
 * screen except Cart itself (which redirects immediately, see
 * app/(tabs)/cart.tsx).
 */
export function TabScreenShell({ children }: TabScreenShellProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
      <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
