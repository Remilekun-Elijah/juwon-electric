"use client";

import { useSearchParams } from "next/navigation";
import ContactForm from "./ContactForm";

/**
 * Reads `?topic=` on the client so /contact stays statically rendered. Render inside `<Suspense>` (useSearchParams
 * suspends during prerendering); the page passes `<ContactForm />` without a topic as the fallback.
 */
export default function ContactFormWithTopic() {
  const topic = useSearchParams().get("topic");
  return <ContactForm key={topic ?? ""} topic={topic} />;
}
