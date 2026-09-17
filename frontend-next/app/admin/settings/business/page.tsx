"use client";

import { BusinessSection } from "@/components/admin/settings/GeneralSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function BusinessSettingsPage() {
  return (
    <SettingsSectionPage id="business">
      {(data, { canWrite, save }) => <BusinessSection value={data.business} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
