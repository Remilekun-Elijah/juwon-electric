"use client";

import { InventorySection } from "@/components/admin/settings/GeneralSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function InventorySettingsPage() {
  return (
    <SettingsSectionPage id="inventory">
      {(data, { canWrite, save }) => <InventorySection value={data.inventory} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
