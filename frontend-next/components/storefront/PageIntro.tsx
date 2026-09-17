import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { storeBody, storeContainer, storeEyebrow, storeFadeUp, storeH1 } from "@/lib/storefront/styles";
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";

export type PageIntroProps = {
  eyebrow?: ReactNode;
  /** The page's only `h1`. */
  title: ReactNode;
  description?: ReactNode;
  /** Trail below Home, ending with the current page. Leave out on top-level pages. */
  breadcrumbs?: Crumb[];
  /** Buttons or links under the description. */
  actions?: ReactNode;
  /** Extra content under the header row (filters, meta, badges). */
  children?: ReactNode;
  className?: string;
};

/** Page header band: white with a bottom border, breadcrumbs, eyebrow, h1, description and actions. Server component. */
export default function PageIntro({ eyebrow, title, description, breadcrumbs, actions, children, className }: PageIntroProps) {
  return (
    <header className={cn("border-b border-slate-200 bg-white", className)}>
      <div className={cn(storeContainer, storeFadeUp, "py-10 sm:py-14")}>
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} className="mb-6" /> : null}
        <div className="max-w-3xl">
          {eyebrow && <p className={storeEyebrow}>{eyebrow}</p>}
          <h1 className={cn(storeH1, eyebrow && "mt-3")}>{title}</h1>
          {description && <p className={cn(storeBody, "mt-4 text-base leading-relaxed sm:text-lg")}>{description}</p>}
        </div>
        {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
