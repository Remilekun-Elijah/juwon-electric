"use client";

import { NotificationsSection } from "@/components/admin/settings/GeneralSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function NotificationSettingsPage() {
  return (
    <SettingsSectionPage id="notifications">
      {(data, { canWrite, save }) => (
        <NotificationsSection
          value={data.notifications}
          canWrite={canWrite}
          save={save}
          lowStockAlertsEnabled={data.inventory.lowStockAlertsEnabled}
        />
      )}
    </SettingsSectionPage>
  );
}
