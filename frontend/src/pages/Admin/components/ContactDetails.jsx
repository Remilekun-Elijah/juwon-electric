/* eslint-disable react/prop-types */
import { useState } from "react";
import { CalendarDays, Mail, Phone, Send } from "lucide-react";
import { Alert, Badge, Button, Field, Input, Select, Textarea, toast } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { adminRequest } from "../../../utils/api";
import { LIMITS } from "../../../utils/validation";
import { contactStatusOptions } from "../constants/adminConstants";
import { formatDateTime, getRecordDate } from "../utils/adminFormatters";
import DetailList from "./DetailList";

const contactThreadPattern = /\s*\[JE-CONTACT:[^\]]+\]\s*/gi;
const cleanContactSubject = (subject) =>
  (subject || "No subject").replace(contactThreadPattern, "").trim() || "No subject";

const linkClasses = "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4";

export const ContactDetails = ({ contact, updating, onStatusChange, onSent }) => {
  const [subject, setSubject] = useState("Re: Your message to Juwon Electric");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!contact) return null;

  const thread = [
    ...(contact.replies || []).map((reply) => ({ ...reply, direction: "admin", at: reply.sentAt })),
    ...(contact.inboundReplies || []).map((reply) => ({ ...reply, direction: "client", at: reply.receivedAt })),
  ].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  const sendReply = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await adminRequest(`/contacts/${contact.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      setMessage("");
      toast.success(`Reply sent to ${contact.emailAddress}`);
      await onSent();
    } catch (event) {
      setError(event.message || "Couldn’t send the reply. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Field label="Status">
        <Select
          value={contact.status || "new"}
          options={contactStatusOptions}
          disabled={updating}
          onChange={(event) => onStatusChange(contact, event.target.value)}
        />
      </Field>

      <DetailList
        items={[
          {
            label: "Email",
            icon: Mail,
            value: contact.emailAddress ? (
              <a className={linkClasses} href={`mailto:${contact.emailAddress}`}>
                {contact.emailAddress}
              </a>
            ) : (
              "Not provided"
            ),
          },
          {
            label: "Phone",
            icon: Phone,
            value: contact.phoneNumber ? (
              <a className={linkClasses} href={`tel:${contact.phoneNumber}`}>
                {contact.phoneNumber}
              </a>
            ) : (
              "Not provided"
            ),
          },
          { label: "Received", icon: CalendarDays, value: formatDateTime(getRecordDate(contact)) },
          { label: "Replies sent", value: contact.replies?.length || 0 },
        ]}
      />

      <section aria-labelledby="contact-message-heading">
        <h3 id="contact-message-heading" className="text-sm font-semibold text-slate-900">
          Message
        </h3>
        <p className="mt-2 whitespace-pre-line break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          {contact.message}
        </p>
      </section>

      {thread.length > 0 && (
        <section aria-labelledby="contact-thread-heading">
          <h3 id="contact-thread-heading" className="text-sm font-semibold text-slate-900">
            Conversation <span className="font-normal text-slate-500">({thread.length})</span>
          </h3>
          <ol className="mt-3 space-y-3">
            {thread.map((reply, index) => (
              <li
                key={`${reply.at}-${index}`}
                className={cn(
                  "rounded-xl border p-4",
                  reply.direction === "admin" ? "border-slate-200 bg-white" : "border-brand-100 bg-brand-50/40"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={reply.direction === "admin" ? "neutral" : "brand"}>
                    {reply.direction === "admin" ? "Your reply" : "Customer reply"}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatDateTime(reply.at)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{cleanContactSubject(reply.subject)}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{reply.message}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="contact-reply-heading" className="border-t border-slate-200 pt-5">
        <h3 id="contact-reply-heading" className="text-sm font-semibold text-slate-900">
          Reply by email
        </h3>
        {contact.emailAddress ? (
          <form onSubmit={sendReply} className="mt-4 space-y-4">
            {error && (
              <Alert tone="danger" title="Reply not sent">
                {error}
              </Alert>
            )}
            <Field label="Subject" required>
              <Input
                value={subject}
                maxLength={LIMITS.replySubject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
            <Field label="Message" helper={`Sent to ${contact.emailAddress}.`} required>
              <Textarea
                rows={6}
                minLength={3}
                maxLength={LIMITS.replyMessage}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Hi ${contact.name?.split(" ")[0] || "there"},`}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={sending} loadingText="Sending…" icon={<Send aria-hidden="true" />}>
                Send reply
              </Button>
            </div>
          </form>
        ) : (
          <Alert tone="info" className="mt-3">
            This customer didn’t leave an email address. Call them on {contact.phoneNumber || "the number provided"} instead.
          </Alert>
        )}
      </section>
    </>
  );
};

export default ContactDetails;
