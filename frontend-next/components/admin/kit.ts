/**
 * Typed entry point to FE-1's UI kit for the admin portal.
 *
 * The kit is `.jsx` without prop types, so under `strict` TypeScript treats every destructured prop as required and
 * `.tsx` usage fails to type-check (FE_CONVENTIONS §1, kit typing is FE-1's open item). Per the conventions, FE-2 does
 * not edit the kit; this module re-exports the same components with prop types taken from each component's JSDoc.
 * Behaviour is unchanged. Once the kit ships its own types, admin code can import from `@/components/ui/*` directly
 * and this file can be deleted.
 */
import type {
  ChangeEvent,
  ComponentPropsWithoutRef,
  ElementType,
  ForwardRefExoticComponent,
  FunctionComponent,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";
import type { LucideIcon } from "lucide-react";
import { Alert as KitAlert } from "@/components/ui/Alert";
import { Avatar as KitAvatar } from "@/components/ui/Avatar";
import { Badge as KitBadge, StatusBadge as KitStatusBadge } from "@/components/ui/Badge";
import { Button as KitButton } from "@/components/ui/Button";
import { buttonClasses as kitButtonClasses } from "@/components/ui/buttonStyles";
import { Card as KitCard, CardContent as KitCardContent, ListCardHeader as KitListCardHeader } from "@/components/ui/Card";
import { Checkbox as KitCheckbox } from "@/components/ui/Checkbox";
import { ConfirmDialog as KitConfirmDialog, Dialog as KitDialog } from "@/components/ui/Dialog";
import { Drawer as KitDrawer } from "@/components/ui/Drawer";
import { EmptyState as KitEmptyState, ErrorState as KitErrorState, LoadingState as KitLoadingState } from "@/components/ui/EmptyState";
import { Field as KitField } from "@/components/ui/Field";
import { Input as KitInput, SearchInput as KitSearchInput, Select as KitSelect, Textarea as KitTextarea } from "@/components/ui/Input";
import { PageHeader as KitPageHeader } from "@/components/ui/PageHeader";
import { paginate as kitPaginate } from "@/components/ui/paginate";
import { Pagination as KitPagination } from "@/components/ui/Pagination";
import { Skeleton as KitSkeleton } from "@/components/ui/Skeleton";
import { Spinner as KitSpinner } from "@/components/ui/Spinner";
import { StatCard as KitStatCard } from "@/components/ui/StatCard";
import { getStatusMeta as kitGetStatusMeta } from "@/components/ui/statusMaps";
import { Switch as KitSwitch } from "@/components/ui/Switch";
import {
  TBody as KitTBody,
  TD as KitTD,
  TH as KitTH,
  THead as KitTHead,
  TR as KitTR,
  Table as KitTable,
  TableEmpty as KitTableEmpty,
} from "@/components/ui/Table";
import { TabPanel as KitTabPanel, Tabs as KitTabs } from "@/components/ui/Tabs";
import { Toaster as KitToaster } from "@/components/ui/Toaster";

type FC<P> = FunctionComponent<P>;
type Ref<P, E> = ForwardRefExoticComponent<P & RefAttributes<E>>;

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export type StatusType = "order" | "payment" | "contact" | "newsletter" | "catalog";

/* ---------- Buttons ---------- */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "soft-danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  as?: ElementType;
  href?: string;
  icon?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  type?: "button" | "submit" | "reset";
};

export const Button = KitButton as unknown as Ref<ButtonProps, HTMLButtonElement>;
export const buttonClasses = kitButtonClasses as unknown as (options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => string;

/* ---------- Form controls ---------- */

type FieldControl = { invalid?: boolean };

export const Input = KitInput as unknown as Ref<
  Omit<ComponentPropsWithoutRef<"input">, "size"> & FieldControl & { size?: "md" | "lg" },
  HTMLInputElement
>;
export const SearchInput = KitSearchInput as unknown as Ref<
  Omit<ComponentPropsWithoutRef<"input">, "size"> & FieldControl & { wrapperClassName?: string },
  HTMLInputElement
>;
export const Textarea = KitTextarea as unknown as Ref<ComponentPropsWithoutRef<"textarea"> & FieldControl, HTMLTextAreaElement>;

export type SelectOption = { value: string; label: string; disabled?: boolean } | string;
export const Select = KitSelect as unknown as Ref<
  Omit<ComponentPropsWithoutRef<"select">, "size"> &
    FieldControl & {
      options?: readonly SelectOption[];
      placeholder?: string;
      size?: "md" | "lg";
      selectClassName?: string;
    },
  HTMLSelectElement
>;

export type FieldRenderProps = { id: string; describedBy?: string; invalid: boolean; required?: boolean };
export const Field = KitField as unknown as FC<{
  label?: ReactNode;
  id?: string;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactNode | ((props: FieldRenderProps) => ReactNode);
}>;

export const Checkbox = KitCheckbox as unknown as Ref<
  ComponentPropsWithoutRef<"input"> & { label?: ReactNode; description?: ReactNode; inputClassName?: string },
  HTMLInputElement
>;

export const Switch = KitSwitch as unknown as FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}>;

/* ---------- Feedback ---------- */

export const Alert = KitAlert as unknown as FC<
  Omit<ComponentPropsWithoutRef<"div">, "title"> & {
    tone?: "danger" | "error" | "warning" | "success" | "info";
    title?: ReactNode;
    icon?: LucideIcon | false;
    onDismiss?: () => void;
  }
>;

export const Spinner = KitSpinner as unknown as FC<{ variant?: "inline" | "ring"; label?: string; className?: string }>;
export const Skeleton = KitSkeleton as unknown as FC<ComponentPropsWithoutRef<"div">>;

type EmptyProps = {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  standalone?: boolean;
  className?: string;
};
export const EmptyState = KitEmptyState as unknown as FC<EmptyProps>;
export const ErrorState = KitErrorState as unknown as FC<
  Omit<EmptyProps, "action"> & { onRetry?: () => void; retryLabel?: string; retrying?: boolean }
>;
export const LoadingState = KitLoadingState as unknown as FC<Omit<EmptyProps, "icon" | "action">>;

/* ---------- Display ---------- */

export const Badge = KitBadge as unknown as FC<
  ComponentPropsWithoutRef<"span"> & { tone?: Tone; variant?: Tone; dot?: boolean }
>;
export const StatusBadge = KitStatusBadge as unknown as FC<
  Omit<ComponentPropsWithoutRef<"span">, "type"> & {
    type: StatusType;
    status?: string | boolean | null;
    label?: ReactNode;
    dot?: boolean;
  }
>;
export const getStatusMeta = kitGetStatusMeta as unknown as (
  type: StatusType,
  status: string | boolean | null | undefined
) => { tone: Tone; label: string };

export const Avatar = KitAvatar as unknown as FC<{
  name?: string;
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  decorative?: boolean;
  className?: string;
}>;

export const Card = KitCard as unknown as FC<ComponentPropsWithoutRef<"div"> & { as?: ElementType }>;
export const CardContent = KitCardContent as unknown as FC<ComponentPropsWithoutRef<"div">>;
export const ListCardHeader = KitListCardHeader as unknown as FC<{
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: ElementType;
  className?: string;
  children?: ReactNode;
}>;

export const PageHeader = KitPageHeader as unknown as FC<{
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: ElementType;
  className?: string;
}>;

export const StatCard = KitStatCard as unknown as FC<{
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
  href?: string;
  onClick?: () => void;
  linkLabel?: string;
  loading?: boolean;
  className?: string;
}>;

/* ---------- Tables ---------- */

type Align = "left" | "center" | "right";

export const Table = KitTable as unknown as FC<
  ComponentPropsWithoutRef<"table"> & { header?: ReactNode; footer?: ReactNode; bare?: boolean; tableClassName?: string }
>;
export const THead = KitTHead as unknown as FC<ComponentPropsWithoutRef<"thead">>;
export const TBody = KitTBody as unknown as FC<ComponentPropsWithoutRef<"tbody">>;
export const TR = KitTR as unknown as FC<ComponentPropsWithoutRef<"tr"> & { selected?: boolean; interactive?: boolean }>;
export const TH = KitTH as unknown as FC<Omit<ComponentPropsWithoutRef<"th">, "align"> & { align?: Align; srOnly?: boolean }>;
export const TD = KitTD as unknown as FC<Omit<ComponentPropsWithoutRef<"td">, "align"> & { align?: Align }>;
export const TableEmpty = KitTableEmpty as unknown as FC<EmptyProps & { colSpan: number; children?: ReactNode }>;

export const Pagination = KitPagination as unknown as FC<{
  page: number;
  totalItems: number;
  pageSize?: number;
  totalPages?: number;
  onChange: (page: number) => void;
  itemLabel?: string;
  bordered?: boolean;
  className?: string;
}>;

export const paginate = kitPaginate as unknown as <T>(
  items: readonly T[],
  page?: number,
  pageSize?: number
) => { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number; start: number; end: number };

/* ---------- Overlays and navigation ---------- */

export const Dialog = KitDialog as unknown as FC<{
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  role?: "dialog" | "alertdialog";
  className?: string;
  bodyClassName?: string;
}>;

export const ConfirmDialog = KitConfirmDialog as unknown as FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  tone?: "danger" | "warning";
  icon?: LucideIcon;
  confirmIcon?: ReactNode;
  children?: ReactNode;
}>;

export const Drawer = KitDrawer as unknown as FC<{
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
}>;

export type TabItem<V extends string = string> = {
  value: V;
  label: ReactNode;
  icon?: LucideIcon;
  count?: number;
  disabled?: boolean;
};

export const Tabs = KitTabs as unknown as <V extends string = string>(props: {
  value: V;
  onChange: (value: V) => void;
  items: readonly TabItem<V>[];
  "aria-label": string;
  id?: string;
  withPanels?: boolean;
  fullWidth?: boolean;
  className?: string;
}) => ReactNode;

export const TabPanel = KitTabPanel as unknown as FC<{
  id: string;
  value: string;
  active: boolean;
  className?: string;
  children?: ReactNode;
}>;

export const Toaster = KitToaster as unknown as FC<Record<string, unknown>>;

/** Typed `onChange` helper for native inputs. */
export const inputValue = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  event.target.value;
