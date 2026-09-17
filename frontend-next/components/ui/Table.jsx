import { cn } from "@/lib/cn";
import { EmptyState } from "./EmptyState";

const alignClasses = { left: "text-left", center: "text-center", right: "text-right" };

/**
 * Table. Bordered card with horizontal scroll. Props: header (node above the table, e.g. <ListCardHeader>),
 * footer (node below, e.g. <Pagination>), bare (no card chrome, for use inside an existing Card),
 * className (outer wrapper), tableClassName, children (THead/TBody), ...table props (aria-label etc.).
 */
export function Table({ header, footer, bare = false, className, tableClassName, children, ...props }) {
  return (
    <div
      className={cn(
        !bare && "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elev-1",
        className
      )}
    >
      {header}
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", tableClassName)} {...props}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}

/** THead. Renders <thead><tr> around TH cells. Props: className (row), children. */
export function THead({ className, children, ...props }) {
  return (
    <thead {...props}>
      <tr className={cn("border-b border-slate-200 bg-slate-50", className)}>{children}</tr>
    </thead>
  );
}

/** TBody. Props: className, children. Rows divided by slate-100. */
export function TBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-slate-100", className)} {...props} />;
}

/**
 * TR. Props: selected (brand tint, sets data-selected), interactive (pointer cursor; pair with onClick and give the row
 * a focusable control or tabIndex/onKeyDown), className, ...tr props.
 */
export function TR({ selected = false, interactive = false, className, ...props }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "bg-white transition-colors hover:bg-slate-50 data-[selected]:bg-brand-50/60",
        interactive && "cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
        className
      )}
      {...props}
    />
  );
}

/**
 * TH. Props: align (left|center|right), srOnly (visually hidden label, e.g. "Actions"), className, children.
 * Hide on small screens with className="hidden md:table-cell".
 */
export function TH({ align = "left", srOnly = false, className, children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5",
        alignClasses[align],
        className
      )}
      {...props}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

/** TD. Props: align (left|center|right), className, children. Default text slate-600. */
export function TD({ align = "left", className, ...props }) {
  return (
    <td
      className={cn("px-4 py-3 text-slate-600 first:pl-5 last:pr-5", alignClasses[align], className)}
      {...props}
    />
  );
}

/**
 * TableEmpty. Full-width row for empty/error/loading content. Props: colSpan (required), children (e.g. <ErrorState>)
 * or EmptyState props (icon, title, description, action).
 */
export function TableEmpty({ colSpan, children, className, ...emptyProps }) {
  return (
    <tr className="bg-white">
      <td colSpan={colSpan} className={cn("p-0", className)}>
        {children ?? <EmptyState {...emptyProps} />}
      </td>
    </tr>
  );
}

export default Table;
