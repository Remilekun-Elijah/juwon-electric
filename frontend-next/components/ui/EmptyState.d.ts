import type { ReactElement, ReactNode } from "react";
import type { IconComponent } from "./types";

/**
 * EmptyState. Props: icon (lucide component, default Inbox), title, description, action (node, e.g. <Button size="sm">),
 * standalone (adds dashed bordered card when not inside a card), className.
 */
export declare function EmptyState(props: {
  icon?: IconComponent;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  standalone?: boolean;
  className?: string;
}): ReactElement;

/**
 * ErrorState. Props: title (default "Couldn’t load this data"), description, onRetry (shows outline "Try again" button;
 * client components only), retryLabel, retrying (spinner on the button), icon (default CircleAlert), standalone, className.
 */
export declare function ErrorState(props: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
  retrying?: boolean;
  icon?: IconComponent;
  standalone?: boolean;
  className?: string;
}): ReactElement;

/**
 * LoadingState. Block ring spinner with copy, for refreshes inside tables/panels.
 * Props: title (default "Loading…"), description, standalone, className.
 */
export declare function LoadingState(props: {
  title?: ReactNode;
  description?: ReactNode;
  standalone?: boolean;
  className?: string;
}): ReactElement;

export default EmptyState;
