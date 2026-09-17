import { SettingsProvider } from "@/components/admin/settings/SettingsContext";

/** Keeps settings loaded, and the unsaved-changes guard active, while moving between settings pages. */
export default function SettingsLayout({ children }: LayoutProps<"/admin/settings">) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
