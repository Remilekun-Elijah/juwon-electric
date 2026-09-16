import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { IconComponent } from "./types";

export type TabItem<V extends string = string> = {
  value: V;
  label: ReactNode;
  icon?: IconComponent;
  count?: number | null;
  disabled?: boolean;
};

/**
 * Tabs (segmented control). Controlled. Props: value, onChange(value), items ([{ value, label, icon?: lucide component,
 * count?: number, disabled? }]), "aria-label" (required), fullWidth (stretch triggers; use on mobile), id (prefix for
 * tab ids `${id}-tab-${value}` / panel ids `${id}-panel-${value}`), withPanels (set aria-controls; render <TabPanel>s
 * with the same id), className.
 * Keyboard: Arrow Left/Right, Home, End move focus and select (roving tabindex).
 */
export declare function Tabs<V extends string = string>(
  props: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
    value: V;
    onChange?: (value: V) => void;
    items: TabItem<V>[];
    "aria-label": string;
    id?: string;
    withPanels?: boolean;
    fullWidth?: boolean;
  }
): ReactElement;

/**
 * TabPanel. Props: id (same prefix passed to <Tabs id>), value (tab value), selected value via `active`,
 * className, children. Renders only when active.
 */
export declare function TabPanel(props: {
  id: string;
  value: string;
  active: boolean;
  className?: string;
  children?: ReactNode;
}): ReactElement | null;

export default Tabs;
