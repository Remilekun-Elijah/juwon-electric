"use client";

import { WebsiteSection } from "@/components/admin/settings/WebsiteSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function WebsiteSettingsPage() {
  return (
    <SettingsSectionPage id="website">
      {(data, { canWrite, save }) => <WebsiteSection value={data.website} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
