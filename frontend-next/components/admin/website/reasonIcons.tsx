import { createElement } from "react";
import {
  BadgeCheck,
  BatteryCharging,
  ClipboardList,
  Clock,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Sun,
  ThumbsUp,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReasonIcon } from "@/lib/api/types";

/**
 * Icon per stored key, shared by the admin list and the storefront band (backend/shared/content.js REASON_ICONS).
 * An unknown key falls back to the wrench.
 */
export const REASON_ICON_MAP: Record<ReasonIcon, LucideIcon> = {
  wrench: Wrench,
  clipboard: ClipboardList,
  phone: PhoneCall,
  badge: BadgeCheck,
  shield: ShieldCheck,
  truck: Truck,
  battery: BatteryCharging,
  sun: Sun,
  clock: Clock,
  users: Users,
  spark: Sparkles,
  "thumbs-up": ThumbsUp,
};

export const reasonIcon = (icon: string | null | undefined): LucideIcon => REASON_ICON_MAP[icon as ReasonIcon] ?? Wrench;

/** Options for the icon <Select>, in the stored order. */
export const REASON_ICON_OPTIONS: { value: ReasonIcon; label: string }[] = [
  { value: "wrench", label: "Spanner (installation)" },
  { value: "clipboard", label: "Clipboard (specifications)" },
  { value: "phone", label: "Phone (we call you)" },
  { value: "badge", label: "Tick badge (guarantee)" },
  { value: "shield", label: "Shield (safety)" },
  { value: "truck", label: "Van (delivery)" },
  { value: "battery", label: "Battery (power)" },
  { value: "sun", label: "Sun (solar)" },
  { value: "clock", label: "Clock (speed)" },
  { value: "users", label: "People (team)" },
  { value: "spark", label: "Sparkle (quality)" },
  { value: "thumbs-up", label: "Thumbs up (service)" },
];

/** Gold circle preview, the same look the website uses. */
export function ReasonIconPreview({ icon }: { icon: string | null | undefined }) {
  const Icon = reasonIcon(icon);
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-gold-400">
      {createElement(Icon, { "aria-hidden": "true", className: "size-5" })}
    </span>
  );
}
