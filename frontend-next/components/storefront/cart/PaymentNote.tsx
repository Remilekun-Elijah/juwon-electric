import { Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export type PaymentNoteProps = {
  /** `settings.payments.gatewayEnabled`. */
  gatewayEnabled: boolean;
  className?: string;
};

/**
 * How payment works for this order, driven by the public settings. Without a gateway nothing is paid online: we call
 * to confirm and arrange payment. With one, a secure payment link follows our confirmation. Server-safe.
 */
export default function PaymentNote({ gatewayEnabled, className }: PaymentNoteProps) {
  const Icon = gatewayEnabled ? ShieldCheck : Phone;

  return (
    <div className={cn("flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-700">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 leading-relaxed">
        {gatewayEnabled ? (
          <>
            <p className="font-semibold">Pay securely after we confirm</p>
            <p className="text-brand-800">You’ll receive a secure payment link after we confirm your order.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">No payment now</p>
            <p className="text-brand-800">We’ll call to confirm your order and arrange payment.</p>
          </>
        )}
      </div>
    </div>
  );
}
