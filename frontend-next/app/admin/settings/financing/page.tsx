"use client";

import { FinancingSection } from "@/components/admin/settings/WebsiteSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function FinancingSettingsPage() {
  return (
    <SettingsSectionPage id="financing">
      {(data, { canWrite, save }) => <FinancingSection value={data.financing} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
