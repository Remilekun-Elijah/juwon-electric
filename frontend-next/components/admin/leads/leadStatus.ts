/** Status enums and options for messages and newsletter subscribers (port of the Vite adminConstants). */
export const CONTACT_STATUSES = ["new", "contacted", "completed"] as const;
export const NEWSLETTER_STATUSES = ["new", "active", "inactive"] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

export const contactStatusOptions: { value: ContactStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "completed", label: "Completed" },
];

/** Only send enum values the API accepts; legacy stored values are left out rather than rejected. */
export const pickAllowed = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export const getContactStatus = (item: { status?: string }): ContactStatus =>
  pickAllowed(item.status, CONTACT_STATUSES) ?? "new";
