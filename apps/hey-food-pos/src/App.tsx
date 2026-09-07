import { StyleSheet, Text, View } from "react-native";

// Entry point placeholder — Hey Food Outlet POS (Android tablet, offline-first).
// Screens per docs/hey-food-product-blueprint-v1.md Section 5 are not yet implemented.
export default function App() {
  return (
    <View style={styles.container}>
      <Text>Hey Food — Outlet POS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
