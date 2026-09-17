"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import TurnstileWidget from "@/components/public/TurnstileWidget";
import { shake } from "@/components/storefront/motion/motion";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { submitContact } from "@/lib/api/public";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone } from "@/lib/validation";

/** Longest `?topic=` accepted for the prefilled message. */
const TOPIC_MAX = 150;

/** "I'd like to ask about <topic>." for a `?topic=` value, or "" when there is none. */
export const topicMessage = (topic: string | null | undefined) => {
  const clean = (topic || "").replace(/\s+/g, " ").trim().slice(0, TOPIC_MAX);
  return clean ? `I’d like to ask about ${clean}.` : "";
};

type Values = { name: string; phoneNumber: string; emailAddress: string; message: string };
type Errors = Partial<Record<keyof Values, string>>;

/** Same rules as the classic contact form (components/public/contact/ContactForm.tsx) and the API limits. */
function validate(values: Values): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = "Enter your name (at least 2 characters).";
  else if (name.length > LIMITS.personName) errors.name = `Keep your name under ${LIMITS.personName} characters.`;
  if (!isValidPhone(values.phoneNumber)) errors.phoneNumber = `${PHONE_MESSAGE} Use 10 to 15 digits, like 0803 123 4567.`;
  if (values.emailAddress.trim() && !isValidEmail(values.emailAddress)) {
    errors.emailAddress = "Enter a valid email address, like name@example.com, or leave it blank.";
  }
  const message = values.message.trim();
  if (message.length < 3) errors.message = "Tell us a little about what you need.";
  else if (message.length > LIMITS.contactMessage) errors.message = `Keep your message under ${LIMITS.contactMessage} characters.`;
  return errors;
}

const errorText = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "We couldn’t send your message. Please try again or call us.";

export type ContactFormProps = {
  /** `?topic=` from the URL; prefills the message. */
  topic?: string | null;
};

/**
 * Contact form: name, phone, optional email and message, with Turnstile action "contact" and the classic payload
 * (`POST /contact`). Inline validation, success and error states, and a double-submit guard. Motion (§8.2): focus rings
 * grow in, fields with errors shake once, and the sent state draws its check mark.
 */
export default function ContactForm({ topic }: ContactFormProps) {
  const initial: Values = { name: "", phoneNumber: "", emailAddress: "", message: topicMessage(topic) };
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const submitting = useRef(false);
  const turnstile = useTurnstile({ action: "contact" });

  const update = (field: keyof Values) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (status === "failed") setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;

    const found = validate(values);
    setErrors(found);
    const invalid = (Object.keys(found) as (keyof Values)[]).filter((field) => found[field]);
    // Presentation only: each field with an error shakes once (skipped under reduced motion).
    for (const field of invalid) shake(document.getElementById(`contact-${field}`));
    const firstInvalid = (Object.keys(found) as (keyof Values)[])[0];
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }
    if (!turnstile.ready) {
      setStatus("failed");
      setServerMessage("Please complete the security check and try again.");
      return;
    }

    submitting.current = true;
    setStatus("sending");
    setServerMessage("");
    try {
      const response = await submitContact(
        turnstile.withToken({
          name: values.name.trim(),
          phoneNumber: values.phoneNumber.trim(),
          emailAddress: values.emailAddress.trim(),
          message: values.message.trim(),
        })
      );
      setServerMessage(response.message || "");
      setStatus("sent");
      setValues({ name: "", phoneNumber: "", emailAddress: "", message: "" });
    } catch (error) {
      setServerMessage(errorText(error));
      setStatus("failed");
    } finally {
      submitting.current = false;
      turnstile.reset();
    }
  };

  if (status === "sent") {
    return (
      <div role="status" className="je-in je-in-fade flex flex-col items-start gap-4 py-4">
        <span className="je-in je-in-pop flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 aria-hidden="true" className="je-check-draw h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Message sent</h2>
          <p className="mt-2 text-slate-600">
            {serverMessage || "Thanks for getting in touch."} We’ll call or email you back using the details you gave us.
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="contact-form-heading" className="je-fields space-y-5">
      <div>
        <h2 id="contact-form-heading" className="text-xl font-semibold tracking-tight text-slate-900">
          Send us a message
        </h2>
        <p className="mt-1 text-sm text-slate-500">Fields marked * are required. We only use your details to reply.</p>
      </div>

      <div aria-live="assertive">
        {status === "failed" && serverMessage && (
          <Alert tone="danger" title="Your message wasn’t sent">
            {serverMessage}
          </Alert>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" id="contact-name" required error={errors.name}>
          <Input
            size="lg"
            name="name"
            autoComplete="name"
            maxLength={LIMITS.personName}
            value={values.name}
            onChange={update("name")}
            disabled={sending}
          />
        </Field>
        <Field label="Phone number" id="contact-phoneNumber" required error={errors.phoneNumber}>
          <Input
            size="lg"
            type="tel"
            name="phoneNumber"
            autoComplete="tel"
            inputMode="tel"
            maxLength={LIMITS.phoneNumber}
            value={values.phoneNumber}
            onChange={update("phoneNumber")}
            disabled={sending}
          />
        </Field>
      </div>
      <Field label="Email address" id="contact-emailAddress" helper="Optional" error={errors.emailAddress}>
        <Input
          size="lg"
          type="email"
          name="emailAddress"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          value={values.emailAddress}
          onChange={update("emailAddress")}
          disabled={sending}
        />
      </Field>
      <Field
        label="Your message"
        id="contact-message"
        required
        error={errors.message}
        helper="For example: the appliances you want to run, your current setup, or the package you’re asking about."
      >
        <Textarea
          name="message"
          rows={6}
          maxLength={LIMITS.contactMessage}
          value={values.message}
          onChange={update("message")}
          disabled={sending}
        />
      </Field>

      <TurnstileWidget
        enabled={turnstile.enabled}
        error={turnstile.error}
        bindContainer={turnstile.bindContainer}
        errorClassName="text-sm text-red-700"
      />

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        loading={sending}
        loadingText="Sending…"
        disabled={sending || !turnstile.ready}
        icon={<Send aria-hidden="true" />}
      >
        Send message
      </Button>
    </form>
  );
}
