"use client";

import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

type NewActivityBannerProps = {
  replies: number;
  messages: number;
  orders: number;
  onViewMessages?: () => void;
  onViewOrders?: () => void;
  onDismiss: () => void;
};

/** Shown above every admin screen while there are unread customer replies, new messages or new orders. */
export function NewActivityBanner({ replies, messages, orders, onViewMessages, onViewOrders, onDismiss }: NewActivityBannerProps) {
  if (!replies && !messages && !orders) return null;

  const parts = [
    replies ? plural(replies, "new customer reply", "new customer replies") : "",
    messages ? plural(messages, "new message", "new messages") : "",
    orders ? plural(orders, "new order", "new orders") : "",
  ].filter(Boolean);
  const summary = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-elev-1">
          <BellRing aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">You have {summary}.</p>
          <p className="mt-0.5 text-brand-800/80">Opening an item marks it as read.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {(replies > 0 || messages > 0) && onViewMessages && (
          <Button size="sm" onClick={onViewMessages}>
            View messages
          </Button>
        )}
        {orders > 0 && onViewOrders && (
          <Button size="sm" variant={replies || messages ? "outline" : "primary"} onClick={onViewOrders}>
            View orders
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" onClick={onDismiss} aria-label="Mark all as read" title="Mark all as read">
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
