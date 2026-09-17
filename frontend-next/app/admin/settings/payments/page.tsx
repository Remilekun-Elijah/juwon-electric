"use client";

import { PaymentsSection } from "@/components/admin/settings/GeneralSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function PaymentSettingsPage() {
  return (
    <SettingsSectionPage id="payments">
      {(data, { canWrite, save }) => <PaymentsSection value={data.payments} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
