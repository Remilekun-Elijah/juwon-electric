import type { MutableRefObject, ReactElement, ReactNode } from "react";

/**
 * Drawer (right side panel on Headless UI Dialog; full width on mobile). Props: open, onClose(), title, description,
 * children (scrolling body), footer (right-aligned buttons), size (md = 448px | lg = 576px), initialFocus (ref),
 * className (panel), bodyClassName.
 */
export declare function Drawer(props: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  initialFocus?: MutableRefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
}): ReactElement;

export default Drawer;
