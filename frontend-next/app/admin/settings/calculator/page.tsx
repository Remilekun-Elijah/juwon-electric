"use client";

import { CalculatorSection } from "@/components/admin/settings/WebsiteSettings";
import { SettingsSectionPage } from "@/components/admin/settings/SettingsSectionPage";

export default function CalculatorSettingsPage() {
  return (
    <SettingsSectionPage id="calculator">
      {(data, { canWrite, save }) => <CalculatorSection value={data.calculator} canWrite={canWrite} save={save} />}
    </SettingsSectionPage>
  );
}
