import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
 *
 * Also the single place applying the top safe-area inset for every tab
 * screen. `headerShown: false` (root Stack and Tabs) means no header ever
 * consumes that inset the way react-navigation normally would, so without
 * this, content renders under the status bar/notch on iOS. Android
 * doesn't need it — androidStatusBar.translucent defaults to false (Expo
 * SDK 51), so the OS already reserves that space and insets.top is 0
 * there — but reading it unconditionally rather than platform-branching
 * keeps this correct automatically if that default (or target SDK) ever
 * changes.
 */
export function TabScreenShell({ children }: TabScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
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
