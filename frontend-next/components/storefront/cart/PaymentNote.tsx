import { Phone } from "lucide-react";
import { cn } from "@/lib/cn";

export type PaymentNoteProps = {
  /** `settings.payments.gatewayEnabled`. */
  gatewayEnabled: boolean;
  className?: string;
};

/**
 * How payment works for this order. Nothing is paid at checkout and no payment link is sent: we call to confirm the
 * order and agree how the customer pays. `gatewayEnabled` is kept for when online payment is built. Server-safe.
 */
export default function PaymentNote({ className }: PaymentNoteProps) {

  return (
    <div className={cn("flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-700">
        <Phone aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 leading-relaxed">
        <p className="font-semibold">No payment now</p>
        <p className="text-brand-800">We’ll call to confirm your order and agree how you’d like to pay.</p>
      </div>
    </div>
  );
}
