import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

const tones: Record<"danger" | "warning" | "success" | "info", { classes: string; icon: IconComponent }> = {
  danger: { classes: "border-red-200 bg-red-50 text-red-700", icon: CircleAlert },
  warning: { classes: "border-amber-200 bg-amber-50 text-amber-700", icon: TriangleAlert },
  success: { classes: "border-green-200 bg-green-50 text-green-700", icon: CircleCheck },
  info: { classes: "border-blue-200 bg-blue-50 text-blue-700", icon: Info },
};

type AlertProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  tone?: keyof typeof tones | "error";
  title?: ReactNode;
  icon?: IconComponent | false;
  onDismiss?: () => void;
};

/**
 * Inline alert. Props: tone (danger|warning|success|info; "error" is an alias of danger), title, children (message),
 * icon (lucide component to override, or false to hide), onDismiss (shows a close button), className.
 * danger/warning use role="alert", others role="status".
 * Server-compatible; pass onDismiss only from a client component.
 */
export function Alert({ tone = "danger", title, icon, onDismiss, className, children, ...props }: AlertProps) {
  const key = tone === "error" ? "danger" : tone in tones ? tone : "info";
  const { classes, icon: DefaultIcon } = tones[key];
  const Icon = icon === false ? null : icon ?? DefaultIcon;

  return (
    <div
      role={key === "danger" || key === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", classes, className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 h-6 w-6 shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
