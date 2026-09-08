import { useRouter } from "expo-router";

import { TabScreenShell } from "../../components/TabScreenShell";
import { HomeScreen } from "../../screens/HomeScreen";

export default function HomeTab() {
  const router = useRouter();

  return (
    <TabScreenShell>
      <HomeScreen onSelectOutlet={() => router.navigate("/menu")} />
    </TabScreenShell>
  );
}
