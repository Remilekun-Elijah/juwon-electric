"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { subscribe } from "@/lib/api/public";
import { notify } from "@/lib/notify";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { LIMITS, isValidEmail } from "@/lib/validation";
import TurnstileWidget from "./TurnstileWidget";

/** Footer newsletter signup (the client part of frontend/src/components/Footer.jsx). */
export default function NewsletterForm() {
  const [emailAddress, setEmailAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstile({ action: "subscribe" });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (!isValidEmail(emailAddress)) {
      notify({ message: "Invalid email address", type: "error" });
      return;
    }
    if (!turnstile.ready) {
      notify({ message: "Please complete the security check and try again.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const response = await subscribe(turnstile.withToken({ emailAddress }));
      notify({ message: response.message });
      setEmailAddress("");
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
      turnstile.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-full border border-[#E67E82]/60 p-3 focus-within:ring-2 focus-within:ring-white/60">
        <input
          required
          type="email"
          value={emailAddress}
          onChange={(event) => setEmailAddress(event.target.value)}
          disabled={loading}
          maxLength={LIMITS.email}
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent px-1 text-[#E67E82] placeholder:text-[#E67E82]/70 focus:outline-hidden"
        />
        {loading ? (
          <span className="inline-flex h-7 w-7 items-center justify-center text-white">
            <Spinner label="Subscribing" className="h-5 w-5" />
          </span>
        ) : (
          <button
            type="submit"
            aria-label="Subscribe"
            className="inline-flex rounded-full transition-opacity duration-150 hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowRight aria-hidden="true" className="h-7 w-7 cursor-pointer rounded-full bg-[#E67E82] p-1 text-white" />
          </button>
        )}
      </div>
      <TurnstileWidget
        enabled={turnstile.enabled}
        error={turnstile.error}
        bindContainer={turnstile.bindContainer}
        errorClassName="mt-2 text-center text-sm text-[#E67E82] md:text-left"
      />
    </form>
  );
}
