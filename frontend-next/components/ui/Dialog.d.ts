import type { MutableRefObject, ReactElement, ReactNode } from "react";
import type { IconComponent } from "./types";

export declare const closeButtonClasses: string;

export type DialogProps = {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
  initialFocus?: MutableRefObject<HTMLElement | null>;
  role?: "dialog" | "alertdialog";
  className?: string;
  bodyClassName?: string;
};

/**
 * Dialog (Headless UI; Escape and overlay click call onClose). Props: open, onClose(), title, description, children (body),
 * footer (buttons; stacked on mobile, right-aligned on sm+), size (sm|md|lg), hideClose, initialFocus (ref),
 * role ("dialog"|"alertdialog"), className (panel), bodyClassName.
 */
export declare function Dialog(props: DialogProps): ReactElement;

/**
 * ConfirmDialog. Props: open, onClose(), onConfirm(), title, description (name the object and consequence),
 * confirmLabel (default "Delete"), cancelLabel (default "Cancel"), loading (spinner on confirm; blocks closing),
 * loadingText (e.g. "Deleting…"), tone (danger|warning), icon (lucide component, default TriangleAlert),
 * confirmIcon (node inside the confirm button, e.g. <Trash2 />), children (extra body).
 * Initial focus goes to Cancel.
 */
export declare function ConfirmDialog(props: {
  open: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  tone?: "danger" | "warning";
  icon?: IconComponent;
  confirmIcon?: ReactNode;
  children?: ReactNode;
}): ReactElement;

export default Dialog;
