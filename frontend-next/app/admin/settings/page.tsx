import { redirect } from "next/navigation";
import { settingsSections } from "@/components/admin/settings/sections";

/**
 * `/admin/settings` opens the first settings page (Business profile) instead of a card overview: every settings page
 * already lists the other pages in its rail (desktop) and pills (phones and tablets).
 */
export default function SettingsPage() {
  redirect(settingsSections[0].href);
}
