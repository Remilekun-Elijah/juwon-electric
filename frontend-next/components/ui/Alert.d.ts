import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { IconComponent } from "./types";

/**
 * Inline alert. Props: tone (danger|warning|success|info; "error" is an alias of danger), title, children (message),
 * icon (lucide component to override, or false to hide), onDismiss (shows a close button), className.
 * danger/warning use role="alert", others role="status". Pass onDismiss only from a client component.
 */
export declare function Alert(
  props: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    tone?: "danger" | "error" | "warning" | "success" | "info";
    title?: ReactNode;
    icon?: IconComponent | false;
    onDismiss?: () => void;
  }
): ReactElement;

export default Alert;
