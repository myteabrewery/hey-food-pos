import { useRouter } from "expo-router";

import { HomeScreen } from "../screens/HomeScreen";

export default function HomeRoute() {
  const router = useRouter();

  return (
    <HomeScreen
      onSelectOutlet={(outlet) =>
        router.push({ pathname: "/menu", params: { outletId: outlet.id } })
      }
    />
  );
}
