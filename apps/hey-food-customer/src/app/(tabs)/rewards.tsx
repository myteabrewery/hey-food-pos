import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { TabScreenShell } from "../../components/TabScreenShell";

export default function RewardsTab() {
  const { t } = useTranslation();

  return (
    <TabScreenShell>
      <ComingSoonScreen label={t("tabs.rewards")} />
    </TabScreenShell>
  );
}
