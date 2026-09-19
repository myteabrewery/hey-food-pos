import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { TabScreenShell } from "../../components/TabScreenShell";

export default function AccountTab() {
  const { t } = useTranslation();

  return (
    <TabScreenShell>
      <LanguageSwitcher />
      <ComingSoonScreen label={t("tabs.account")} />
    </TabScreenShell>
  );
}
