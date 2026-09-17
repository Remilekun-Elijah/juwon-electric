import { Boxes, Building2, Calculator, CreditCard, House, Mail, Wallet, type LucideIcon } from "lucide-react";
import type { Settings } from "@/lib/api/types";
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
  /** One sentence under the page title and on the overview card. */
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

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

const listText = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Whether the connected server returns this section (website, financing and calculator are newer). */
export const hasSection = (data: Settings, id: SettingsSectionId) => Boolean(data[id]);

/** Short live summary for the overview card. Never mentions uploads or storage. */
export function sectionSummary(data: Settings, id: SettingsSectionId): string {
  switch (id) {
    case "business": {
      const { name, email, phone, address, website } = data.business;
      const set = [email && "email", phone && "phone", address && "address", website && "website"].filter(
        (item): item is string => Boolean(item)
      );
      return `${name || "No business name"} · ${set.length ? `${capitalise(listText(set))} set` : "No contact details"}`;
    }
    case "notifications": {
      const { orderEmails, lowStockEmails, vacancyEmails } = data.notifications;
      const count = (list: string[]) => (list.length ? plural(list.length, "email") : "default");
      const lowStock = data.inventory.lowStockAlertsEnabled ? count(lowStockEmails) : "off";
      return `New orders: ${count(orderEmails)} · Low stock: ${lowStock} · Vacancies: ${count(vacancyEmails)}`;
    }
    case "payments": {
      const { gatewayEnabled, provider } = data.payments;
      if (!gatewayEnabled) return "Online payments off";
      return `Online payments on · ${provider ? capitalise(provider) : "No provider chosen"}`;
    }
    case "inventory": {
      const { defaultReorderLevel, lowStockAlertsEnabled } = data.inventory;
      return `Default reorder level ${defaultReorderLevel ?? 0} · Alerts ${lowStockAlertsEnabled ? "on" : "off"}`;
    }
    case "website": {
      const stats = data.website.stats ?? [];
      return [
        stats.length ? plural(stats.length, "stat") : "No stats",
        data.website.whatsappNumber ? "WhatsApp set" : "No WhatsApp",
        data.website.businessHours ? "Hours set" : "No hours",
      ].join(" · ");
    }
    case "financing": {
      const terms = data.financing.termsMonths ?? [];
      return data.financing.enabled
        ? `Financing on · ${terms.length ? plural(terms.length, "term") : "No terms"}`
        : "Financing off";
    }
    case "calculator":
      return `Calculator ${data.calculator.enabled ? "on" : "off"} · ${plural(data.calculator.appliances?.length ?? 0, "appliance")}`;
  }
}
