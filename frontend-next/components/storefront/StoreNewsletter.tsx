"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button, Input, toast } from "@/components/ui";
import TurnstileWidget from "@/components/public/TurnstileWidget";
import { subscribe } from "@/lib/api/public";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { cn } from "@/lib/cn";
import { LIMITS, isValidEmail } from "@/lib/validation";

/**
 * Footer newsletter signup: `POST /subscribe` with Turnstile action "subscribe" (same call as the classic footer).
 * `tone="dark"` for the surface footer (TEAM_AND_MOTION_V1 §7.5): the button is gold like the other calls to action on the
 * red (a red button disappeared into the footer), and errors are pale gold, since red text is unreadable on red.
 */
export default function StoreNewsletter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const [emailAddress, setEmailAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstile({ action: "subscribe" });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const email = emailAddress.trim();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address, like name@example.com.");
      return;
    }
    if (!turnstile.ready) {
      setError("Please complete the security check and try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await subscribe(turnstile.withToken({ emailAddress: email }));
      toast.success(response.message || "You’re subscribed. We’ll send offers and maintenance tips now and then.");
      setEmailAddress("");
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "We couldn’t subscribe you. Please try again.");
    } finally {
      setLoading(false);
      turnstile.reset();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby="store-newsletter-note"
    >
      <label
        htmlFor="store-newsletter-email"
        className={cn(
          "text-sm font-medium hidden",
          dark ? "text-white" : "text-slate-900",
        )}
      >
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id="store-newsletter-email"
          type="email"
          size="lg"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          maxLength={LIMITS.email}
          value={emailAddress}
          invalid={Boolean(error)}
          aria-describedby={error ? "store-newsletter-error" : undefined}
          onChange={(event) => {
            setEmailAddress(event.target.value);
            if (error) setError("");
          }}
          disabled={loading}
          className="min-w-0 sm:flex-1"
        />
        <Button
          type="submit"
          size="lg"
          loading={loading}
          loadingText="Subscribing…"
          icon={<Mail aria-hidden="true" />}
          className={cn(
            dark &&
              "bg-gold-400 font-semibold text-slate-950 shadow-elev-2 hover:bg-gold-300 active:bg-gold-500 focus-visible:ring-surface-label focus-visible:ring-offset-surface"
          )}
        >
          Subscribe
        </Button>
      </div>
      <div aria-live="polite">
        {error && (
          <p
            id="store-newsletter-error"
            className={cn(
              "mt-2 text-sm",
              dark ? "font-medium text-surface-label" : "text-red-700",
            )}
          >
            {error}
          </p>
        )}
      </div>
      <p
        id="store-newsletter-note"
        className={cn(
          "mt-2 text-xs",
          dark ? "text-white" : "text-slate-500",
        )}
      >
        Get exclusive offers, solar tips and important updates from Juwon
        Electric.
      </p>
      <TurnstileWidget
        enabled={turnstile.enabled}
        error={turnstile.error}
        bindContainer={turnstile.bindContainer}
        className="mt-2"
        errorClassName={cn("text-sm", dark ? "font-medium text-surface-label" : "text-red-700")}
      />
    </form>
  );
}
