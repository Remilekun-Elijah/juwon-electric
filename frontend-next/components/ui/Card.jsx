import { cn } from "@/lib/cn";

/** Card. Props: as (default "div"), className, children. White, rounded-xl, 1px slate border, elev-1 shadow. */
export function Card({ as: Comp = "div", className, ...props }) {
  return (
    <Comp
      className={cn("rounded-xl border border-slate-200 bg-white text-slate-900 shadow-elev-1", className)}
      {...props}
    />
  );
}

/** CardHeader. Props: className, children. p-6 column with gap-1.5. */
export function CardHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

/** CardTitle. Props: as (default "h3"), className, children. */
export function CardTitle({ as: Comp = "h3", className, ...props }) {
  return (
    <Comp
      className={cn("text-base font-semibold leading-none tracking-tight text-slate-900", className)}
      {...props}
    />
  );
}

/** CardDescription. Props: className, children. */
export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

/** CardContent. Props: className, children. p-6 pt-0 (add pt-6 when there is no header). */
export function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

/** CardFooter. Props: className, children. */
export function CardFooter({ className, ...props }) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

/**
 * ListCardHeader. Divided header for list/table cards. Props: title, count (shown as "(n)"), description,
 * actions (right-side slot), titleAs (default "h2"), className, children (extra content under the title row, e.g. filters).
 */
export function ListCardHeader({ title, count, description, actions, titleAs: Title = "h2", className, children }) {
  return (
    <div className={cn("border-b border-slate-200 px-5 py-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Title className="text-base font-semibold text-slate-900">
            {title}
            {count != null && <span className="ml-1.5 text-sm font-normal text-slate-500">({count})</span>}
          </Title>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default Card;
