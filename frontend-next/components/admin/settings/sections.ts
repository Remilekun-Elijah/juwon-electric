import { Boxes, Building2, Calculator, CreditCard, House, Mail, Wallet, type LucideIcon } from "lucide-react";
import { LIMITS } from "@/lib/validation";

export type SettingsSectionId =
  | "business"
  | "notifications"
  | "payments"
  | "inventory"
  | "website"
  | "financing"
  | "calculator";

export type SettingsGroupId = "business" | "communication" | "sales" | "website";

export type SettingsSectionMeta = {
  id: SettingsSectionId;
  href: string;
  group: SettingsGroupId;
  /** Navigation label and page title. */
  label: string;
  icon: LucideIcon;
  /** One sentence shown under the page title. */
  description: string;
  /** Website, financing and calculator: missing on older servers and seeded as sample content. */
  landing?: boolean;
};

export const SETTINGS_HREF = "/admin/settings";

export const settingsGroups: { id: SettingsGroupId; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "communication", label: "Communication" },
  { id: "sales", label: "Sales" },
  { id: "website", label: "Website" },
];

export const settingsSections: SettingsSectionMeta[] = [
  {
    id: "business",
    href: `${SETTINGS_HREF}/business`,
    group: "business",
    label: "Business profile",
    icon: Building2,
    description: "Your business name and contact details, shown on the public site and in customer emails.",
  },
  {
    id: "notifications",
    href: `${SETTINGS_HREF}/notifications`,
    group: "communication",
    label: "Notification emails",
    icon: Mail,
    description: `Who gets admin alert emails, up to ${LIMITS.settingsEmails} addresses per list; an empty list uses the server’s default recipients.`,
  },
  {
    id: "payments",
    href: `${SETTINGS_HREF}/payments`,
    group: "sales",
    label: "Payments",
    icon: CreditCard,
    description: "Whether customers can pay online by card at checkout, and through which provider.",
  },
  {
    id: "inventory",
    href: `${SETTINGS_HREF}/inventory`,
    group: "sales",
    label: "Inventory",
    icon: Boxes,
    description: "The starting reorder level for new products and whether low-stock alerts are emailed.",
  },
  {
    id: "website",
    href: `${SETTINGS_HREF}/website`,
    group: "website",
    label: "Homepage & contact",
    icon: House,
    description: "Headline figures, the WhatsApp number and opening hours shown on the public site.",
    landing: true,
  },
  {
    id: "financing",
    href: `${SETTINGS_HREF}/financing`,
    group: "website",
    label: "Financing",
    icon: Wallet,
    description: "Pay-in-instalments terms shown on the home page; customers still call to confirm before anything is agreed.",
    landing: true,
  },
  {
    id: "calculator",
    href: `${SETTINGS_HREF}/calculator`,
    group: "website",
    label: "Load calculator",
    icon: Calculator,
    description: "The appliances and assumptions behind the “Size your system” calculator; an engineer confirms the final size.",
    landing: true,
  },
];

export const getSettingsSection = (id: SettingsSectionId) =>
  settingsSections.find((section) => section.id === id) ?? settingsSections[0];

