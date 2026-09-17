"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import TurnstileWidget from "@/components/public/TurnstileWidget";
import { Spinner } from "@/components/ui/Spinner";
import { submitContact } from "@/lib/api/public";
import { cn } from "@/lib/cn";
import { notify } from "@/lib/notify";
import { buttonBase, buttonHover, fieldBase } from "@/lib/publicStyles";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { LIMITS, PHONE_MESSAGE, PHONE_PATTERN, isValidEmail, isValidPhone } from "@/lib/validation";

const field = cn(fieldBase, "w-full bg-transparent md:w-[350px]");

/** "Leave us a message" form. Port of the form in frontend/src/pages/Contact.jsx. */
export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstile({ action: "contact" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      phoneNumber: String(data.get("phoneNumber") ?? ""),
      emailAddress: String(data.get("emailAddress") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    if (payload.emailAddress && !isValidEmail(payload.emailAddress)) {
      notify({ message: "Invalid email address", type: "error" });
      return;
    }
    if (!isValidPhone(payload.phoneNumber)) {
      notify({ message: PHONE_MESSAGE, type: "error" });
      return;
    }
    if (!turnstile.ready) {
      notify({ message: "Please complete the security check and try again.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await submitContact(turnstile.withToken(payload));
      notify({ message: response.message });
      form.reset();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
      turnstile.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Leave us a message" className="flex w-full flex-col gap-5 md:w-auto">
      <Image src="/getInTouch.svg" alt="" width={258} height={258} className="mx-auto block w-[258px] md:w-[350px] lg:hidden" />
      <p className="sora-regular text-center text-base text-faint md:text-xl lg:text-left">Leave us a message</p>

      <label htmlFor="contact-name" className="sr-only">
        Name
      </label>
      <input
        type="text"
        name="name"
        required
        id="contact-name"
        minLength={2}
        maxLength={LIMITS.personName}
        placeholder="Name"
        autoComplete="name"
        className={field}
      />
      <label htmlFor="contact-phone" className="sr-only">
        Phone number
      </label>
      <input
        type="tel"
        name="phoneNumber"
        required
        id="contact-phone"
        maxLength={LIMITS.phoneNumber}
        pattern={PHONE_PATTERN}
        title={PHONE_MESSAGE}
        placeholder="Phone Number"
        autoComplete="tel"
        className={field}
      />
      <label htmlFor="contact-email" className="sr-only">
        Email address (optional)
      </label>
      <input
        type="email"
        name="emailAddress"
        id="contact-email"
        maxLength={LIMITS.email}
        placeholder="Email Address"
        autoComplete="email"
        className={field}
      />
      <label htmlFor="contact-message" className="sr-only">
        Your message
      </label>
      <textarea
        rows={5}
        className={cn(field, "resize-none")}
        placeholder="Your Message"
        name="message"
        required
        minLength={3}
        maxLength={LIMITS.contactMessage}
        id="contact-message"
      />

      <div className="flex flex-col">
        <TurnstileWidget
          enabled={turnstile.enabled}
          error={turnstile.error}
          bindContainer={turnstile.bindContainer}
          errorClassName="mb-2 text-sm text-deep_red"
        />
        <button
          type="submit"
          disabled={loading || !turnstile.ready}
          aria-busy={loading || undefined}
          className={cn(buttonBase, buttonHover, "w-full bg-brand-500 text-white")}
        >
          {loading ? (
            <Spinner label="Sending" className="h-5 w-5" />
          ) : (
            <>
              <span>Send</span> <Send aria-hidden="true" className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
