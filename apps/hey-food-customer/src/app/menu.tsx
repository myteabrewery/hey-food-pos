import { useLocalSearchParams } from "expo-router";

import { MenuScreen } from "../screens/MenuScreen";

export default function MenuRoute() {
  const { outletId } = useLocalSearchParams<{ outletId: string }>();

  return <MenuScreen outletId={outletId} />;
}
