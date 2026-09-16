/* eslint-disable react/prop-types */
import { CircleAlert, Inbox, RefreshCw } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

const wrapper = "flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center";
const standaloneClasses = "rounded-xl border border-dashed border-slate-200 bg-white";

/**
 * EmptyState. Props: icon (lucide component, default Inbox), title, description, action (node, e.g. <Button size="sm">),
 * standalone (adds dashed bordered card when not inside a card), className.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, standalone = false, className }) {
  return (
    <div role="status" className={cn(wrapper, standalone && standaloneClasses, className)}>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      {title && <h3 className="mt-3.5 text-sm font-semibold text-slate-700">{title}</h3>}
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * ErrorState. Props: title (default "Couldn’t load this data"), description, onRetry (shows outline "Try again" button),
 * retryLabel, retrying (spinner on the button), icon (default CircleAlert), standalone, className.
 */
export function ErrorState({
  title = "Couldn’t load this data",
  description = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  icon: Icon = CircleAlert,
  standalone = false,
  className,
}) {
  return (
    <div role="alert" className={cn(wrapper, standalone && standaloneClasses, className)}>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-600">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-3.5 text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          loading={retrying}
          icon={<RefreshCw aria-hidden="true" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * LoadingState. Block ring spinner with copy, for refreshes inside tables/panels.
 * Props: title (default "Loading…"), description, standalone, className.
 */
export function LoadingState({
  title = "Loading…",
  description = "Please wait while we get the latest information.",
  standalone = false,
  className,
}) {
  return (
    <div role="status" aria-live="polite" className={cn(wrapper, standalone && standaloneClasses, className)}>
      <Spinner variant="ring" />
      <h3 className="mt-3.5 text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
    </div>
  );
}

export default EmptyState;
