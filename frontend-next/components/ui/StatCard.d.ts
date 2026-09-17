import type { ReactElement, ReactNode } from "react";
import type { IconComponent } from "./types";

/**
 * StatCard (KPI). Props: label, value, helper, icon (lucide component), tone (brand|success|warning|danger|info),
 * href (route path → next/link) or onClick (button; client components only), linkLabel (default "View"),
 * loading (skeleton value), className.
 */
export declare function StatCard(props: {
  label: ReactNode;
  value?: ReactNode;
  helper?: ReactNode;
  icon?: IconComponent;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
  href?: string;
  onClick?: () => void;
  linkLabel?: ReactNode;
  loading?: boolean;
  className?: string;
}): ReactElement;

export default StatCard;
