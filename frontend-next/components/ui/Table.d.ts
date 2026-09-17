import type { HTMLAttributes, ReactElement, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import type { IconComponent } from "./types";

type Align = "left" | "center" | "right";

/**
 * Table. Bordered card with horizontal scroll. Props: header (node above the table, e.g. <ListCardHeader>),
 * footer (node below, e.g. <Pagination>), bare (no card chrome, for use inside an existing Card),
 * className (outer wrapper), tableClassName, children (THead/TBody), ...table props (aria-label etc.).
 */
export declare function Table(
  props: TableHTMLAttributes<HTMLTableElement> & {
    header?: ReactNode;
    footer?: ReactNode;
    bare?: boolean;
    tableClassName?: string;
  }
): ReactElement;

/** THead. Renders <thead><tr> around TH cells. Props: className (row), children. */
export declare function THead(props: HTMLAttributes<HTMLTableSectionElement>): ReactElement;

/** TBody. Props: className, children. Rows divided by slate-100. */
export declare function TBody(props: HTMLAttributes<HTMLTableSectionElement>): ReactElement;

/**
 * TR. Props: selected (brand tint, sets data-selected), interactive (pointer cursor; pair with onClick and give the row
 * a focusable control or tabIndex/onKeyDown), className, ...tr props.
 */
export declare function TR(
  props: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean; interactive?: boolean }
): ReactElement;

/**
 * TH. Props: align (left|center|right), srOnly (visually hidden label, e.g. "Actions"), className, children.
 * Hide on small screens with className="hidden md:table-cell".
 */
export declare function TH(props: ThHTMLAttributes<HTMLTableCellElement> & { align?: Align; srOnly?: boolean }): ReactElement;

/** TD. Props: align (left|center|right), className, children. Default text slate-600. */
export declare function TD(props: Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & { align?: Align }): ReactElement;

/**
 * TableEmpty. Full-width row for empty/error/loading content. Props: colSpan (required), children (e.g. <ErrorState>)
 * or EmptyState props (icon, title, description, action).
 */
export declare function TableEmpty(props: {
  colSpan: number;
  children?: ReactNode;
  className?: string;
  icon?: IconComponent;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  standalone?: boolean;
}): ReactElement;

export default Table;
