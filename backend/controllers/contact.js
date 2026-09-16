import contactTemplate from "../mail/_contact.js";
import contactReplyTemplate from "../mail/_contactReply.js";
import { sendMail } from "../mail/mail.js";
import { LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { takeTurnstileToken, verifyTurnstile } from "../middleware/turnstile.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { safeEqual } from "../services/adminAuthService.js";
import { audit, auditDelete, auditUpdate } from "../services/audit.js";
import { ApiError, badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import { track } from "../services/runtime.js";
import {
  appendCollectionItem,
  appendToCollectionArray,
  deleteCollectionItem,
  deleteRecords,
  deleteRecordsBefore,
  findCollectionItem,
  findLatestCollectionItem,
  findRecord,
  getCollectionItem,
  insertRecordIfAbsent,
  listCollection,
  updateCollectionItem,
  updateRecords,
} from "../services/store.js";
import {
  LIMITS,
  optionalBoolean,
  optionalString,
  requiredPhone,
  requiredString,
  enumField,
  stripInvalidChars,
  validateEmail,
} from "../services/validators.js";
import { isValidSigningSecret, verifySvixSignature } from "../services/webhookSignature.js";

export const CONTACT_STATUSES = ["new", "contacted", "completed"];
const WEBHOOK_EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_CLAIM_STALE_MS = 2 * 60 * 1000;

const CONTACT_THREAD_PATTERN = /\[JE-CONTACT:([A-Za-z0-9-]{1,64})\]/i;
const CONTACT_THREAD_STRIP = /\[JE-CONTACT:[^\]]{0,200}\]/gi;
const DEFAULT_REPLY_SUBJECT = "Re: Your message to Juwon Electric";
const cleanContactThreadSubject = (subject) =>
  (subject || DEFAULT_REPLY_SUBJECT).replace(CONTACT_THREAD_STRIP, "").trim();

export const contactUs = asyncHandler(async (req, res) => {
  const turnstileToken = takeTurnstileToken(req.body);
  const fields = {
    name: requiredString(req.body, "name", "Name", { max: LIMITS.personName }),
    phoneNumber: requiredPhone(req.body),
    emailAddress: validateEmail(
      optionalString(req.body, "emailAddress", { label: "Email address", max: LIMITS.email })
    ),
    message: requiredString(req.body, "message", "Message", {
      max: LIMITS.contactMessage,
      multiline: true,
    }),
    source:
      optionalString(req.body, "source", { label: "Source", max: LIMITS.source }) || "client",
  };

  await enforceLimit(req, res, "public-contact", RATE_LIMITS.publicWrite);
  await verifyTurnstile(req, turnstileToken, "contact");

  const message = await appendCollectionItem("contacts", fields);

  track(
    sendMail(
      {
        subject: "You have a message",
        data: message,
      },
      contactTemplate
    )
  );

  created(res, "Message sent.", message);
});

export const adminListMessages = asyncHandler(async (_req, res) => {
  const messages = await listCollection("contacts", { includeInactive: true });
  ok(res, "Messages retrieved.", messages);
});

export const adminUpdateMessage = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = await getCollectionItem("contacts", req.params.id);
  const status = enumField(body, "status", CONTACT_STATUSES, {
    label: "Status",
    existing: existing.status,
  });
  const note =
    body.note === undefined || body.note === null
      ? undefined
      : optionalString(body, "note", { label: "Note", max: LIMITS.note, multiline: true });
  const isActive = optionalBoolean(body, "isActive", undefined);

  // Only the fields that were sent are written (against the fresh record).
  const patch = { status, note, isActive };
  const changedKeys = Object.keys(patch).filter((key) => patch[key] !== undefined);
  const message = await updateCollectionItem("contacts", existing.id, patch);
  auditUpdate(req, "contact", existing, message, changedKeys);
  ok(res, "Message updated.", message);
});

export const adminDeleteMessage = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("contacts", req.params.id);
  const contact = await deleteCollectionItem("contacts", existing.id);
  auditDelete(req, "contact", contact);
  ok(res, "Message deleted.", contact);
});

export const adminReplyMessage = asyncHandler(async (req, res) => {
  const reply = requiredString(req.body, "message", "Reply message", {
    max: LIMITS.replyMessage,
    multiline: true,
  });
  const subject = cleanContactThreadSubject(
    optionalString(req.body, "subject", { label: "Subject", max: LIMITS.replySubject })
  );

  const contact = await getCollectionItem("contacts", req.params.id);

  if (!contact.emailAddress) {
    throw badRequest("This contact did not provide an email address.");
  }

  const sentAt = new Date().toISOString();
  const replyRecord = {
    subject,
    message: reply,
    sentAt,
    sentBy: req.admin?.email || (req.adminStaticToken ? "static-token" : "admin"),
  };

  const delivered = await sendMail(
    {
      to: contact.emailAddress,
      subject,
      data: {
        name: contact.name,
        originalMessage: contact.message,
        reply,
      },
    },
    contactReplyTemplate
  );

  if (!delivered) {
    throw new ApiError(502, "Unable to send the reply email. Please try again.");
  }

  // Append (never rewrite the whole array), then the status change on its own.
  await appendToCollectionArray("contacts", contact.id, "replies", replyRecord, {
    lastRepliedAt: sentAt,
  });
  const message = await updateCollectionItem("contacts", contact.id, { status: "contacted" });

  audit(req, {
    action: "contact.reply",
    entity: "contact",
    entityId: contact.id,
    summary: `Replied to ${contact.name || contact.emailAddress}`,
    changes: ["status", "replies", "lastRepliedAt"],
  });
  ok(res, "Reply sent.", message);
});

// ---- inbound reply webhook --------------------------------------------------

const webhookError = () => new ApiError(401, "Invalid webhook signature.");

// Outcome that is acknowledged (200) but not stored; the sender must not retry.
class WebhookIgnored extends Error {}
const ignore = (reason) => new WebhookIgnored(reason);

const parseWebhookBody = (raw) => {
  let body;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
  return body;
};

const INBOUND_TEXT_CAP = 200_000;
const RESEND_RESPONSE_CAP = 1_000_000;
const RESEND_EMAIL_ID = /^[0-9a-fA-F-]{36}$/;
const BASIC_ADDRESS = /^[^\s@<>]+@[^\s@<>]+$/;

const textOf = (value) => (typeof value === "string" ? value : "");

// "Name <user@example.com>" -> "user@example.com"; input is capped first.
const extractAddress = (value) => {
  const text = textOf(value).slice(0, LIMITS.inboundFrom).trim();
  const open = text.lastIndexOf("<");
  const close = text.lastIndexOf(">");
  const address = open !== -1 && close > open ? text.slice(open + 1, close) : text;
  const cleaned = stripInvalidChars(address).trim().toLowerCase();
  return BASIC_ADDRESS.test(cleaned) ? cleaned : "";
};

// Linear-time HTML to text (no backtracking-prone patterns).
export const stripHtml = (html) => {
  const source = textOf(html).slice(0, INBOUND_TEXT_CAP);
  const lower = source.toLowerCase();
  let text = "";
  let position = 0;
  while (position < source.length) {
    const script = lower.indexOf("<script", position);
    const style = lower.indexOf("<style", position);
    const start = script === -1 ? style : style === -1 ? script : Math.min(script, style);
    if (start === -1) {
      text += source.slice(position);
      break;
    }
    text += `${source.slice(position, start)} `;
    const closeTag = start === script ? "</script" : "</style";
    const close = lower.indexOf(closeTag, start);
    if (close === -1) break;
    const end = lower.indexOf(">", close);
    if (end === -1) break;
    position = end + 1;
  }
  return text
    .replace(/<br\b[^<>]*>/gi, "\n")
    .replace(/<\/(?:p|div)\s*>/gi, "\n")
    .replace(/<[^<>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// Resend's email.received event only carries metadata; the body is fetched
// from the Resend API (requires RESEND_API_KEY).
const fetchResendReceivedEmail = async (emailId) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  let response;
  try {
    response = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch (error) {
    console.error("Fetching inbound email from Resend failed:", error?.name, error?.message);
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }
  if (!response.ok) {
    console.error("Fetching inbound email from Resend failed: status", response.status);
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }

  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > RESEND_RESPONSE_CAP) {
    response.body?.cancel().catch(() => {});
    throw ignore("inbound email from Resend is too large");
  }
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of response.body || []) {
      size += chunk.length;
      if (size > RESEND_RESPONSE_CAP) throw ignore("inbound email from Resend is too large");
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof WebhookIgnored) throw error;
    console.error("Reading inbound email from Resend failed:", error?.name, error?.message);
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }
  try {
    const email = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return email && typeof email === "object" ? email : null;
  } catch {
    console.error("Fetching inbound email from Resend failed: invalid JSON");
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }
};

const cut = (value, max) => ({ value: value.slice(0, max), cut: value.length > max });

const recordInboundReply = async (body) => {
  let source = body;
  let emailId = null;
  if (body.type !== undefined) {
    if (body.type !== "email.received") throw ignore(`unsupported event type`);
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      throw ignore("event without data");
    }
    source = body.data;
    emailId = textOf(source.email_id);
    if (!RESEND_EMAIL_ID.test(emailId)) throw ignore("invalid email_id");
  }

  let subject = textOf(source.subject);
  let fromEmail = extractAddress(
    textOf(source.fromEmail) || textOf(source.from) || textOf(source.sender)
  );
  let message = textOf(source.text) || textOf(source.body) || textOf(source.message);
  message = message.slice(0, INBOUND_TEXT_CAP);

  if (emailId && !message.trim()) {
    const email = await fetchResendReceivedEmail(emailId);
    if (email) {
      message = textOf(email.text).slice(0, INBOUND_TEXT_CAP).trim() || stripHtml(email.html);
      if (!subject) subject = textOf(email.subject);
      if (!fromEmail) fromEmail = extractAddress(textOf(email.from));
    }
  }

  // Inbound content is cleaned and truncated, never rejected for length.
  const cleanSubject = cut(
    stripInvalidChars(subject.slice(0, INBOUND_TEXT_CAP)).trim(),
    LIMITS.inboundSubject
  );
  const cleanMessage = cut(stripInvalidChars(message, true).trim(), LIMITS.inboundMessage);

  if (!fromEmail) throw ignore("missing or invalid sender");
  if (!cleanMessage.value) throw ignore("empty message");

  const tag = cleanSubject.value.match(CONTACT_THREAD_PATTERN);
  let contact;
  if (tag) {
    contact = await findCollectionItem("contacts", { id: tag[1] });
    if (!contact) throw ignore("thread tag does not match a contact");
    if (String(contact.emailAddress || "").toLowerCase() !== fromEmail) {
      throw ignore("sender does not match the tagged contact");
    }
  } else {
    contact = await findLatestCollectionItem("contacts", { emailAddress: fromEmail });
    if (!contact) throw ignore("no contact for sender");
  }

  const receivedAt = new Date().toISOString();
  const entry = {
    fromEmail,
    subject: cleanSubject.value,
    message: cleanMessage.value,
    receivedAt,
    ...(cleanSubject.cut || cleanMessage.cut ? { truncated: true } : {}),
  };
  await appendToCollectionArray("contacts", contact.id, "inboundReplies", entry, {
    lastInboundReplyAt: receivedAt,
  });
  return updateCollectionItem("contacts", contact.id, { status: "contacted" });
};

// Claims a svix id: { state: "claimed" | "done" | "busy" }.
const claimWebhookEvent = async (svixId) => {
  const now = Date.now();
  track(
    deleteRecordsBefore(
      "webhookEvents",
      "createdAt",
      new Date(now - WEBHOOK_EVENT_TTL_MS).toISOString()
    ).catch((error) => console.warn("Webhook event cleanup failed:", error?.message))
  );
  const claimedAt = new Date(now).toISOString();
  const inserted = await insertRecordIfAbsent("webhookEvents", {
    id: svixId,
    status: "processing",
    claimedAt,
    createdAt: claimedAt,
  });
  if (inserted) return "claimed";

  const existing = await findRecord("webhookEvents", { id: svixId });
  if (!existing) return "busy";
  if (existing.status !== "processing") return "done";
  const age = now - new Date(existing.claimedAt || 0).getTime();
  if (!(age > WEBHOOK_CLAIM_STALE_MS)) return "busy";
  // Take over a stale claim (compare-and-set on the old claimedAt).
  const taken = await updateRecords(
    "webhookEvents",
    { id: svixId, status: "processing", claimedAt: existing.claimedAt },
    { claimedAt }
  );
  return taken === 1 ? "claimed" : "busy";
};

const finishWebhookEvent = (svixId) =>
  updateRecords("webhookEvents", { id: svixId }, { status: "done" }).catch((error) =>
    console.warn("Marking webhook event done failed:", error?.message)
  );

export const inboundContactReply = asyncHandler(async (req, res) => {
  const signingSecret = String(process.env.INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET || "").trim();
  const legacySecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  let svixId = null;
  if (signingSecret) {
    if (!isValidSigningSecret(signingSecret)) {
      console.error(
        "INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET is malformed (expected whsec_ followed by base64)."
      );
      throw new ApiError(500, "Webhook is not configured correctly.");
    }
    // Verify the raw bytes before parsing anything.
    svixId = req.get("svix-id") || "";
    const verified = verifySvixSignature({
      secret: signingSecret,
      id: svixId,
      timestamp: req.get("svix-timestamp") || "",
      signatureHeader: req.get("svix-signature") || "",
      rawBody,
    });
    if (!verified) throw webhookError();
  } else if (!legacySecret || !safeEqual(req.get("x-webhook-secret") || "", legacySecret)) {
    throw new ApiError(401, "Invalid webhook secret.");
  }

  const body = parseWebhookBody(rawBody);

  if (svixId) {
    // Replay protection: ids are remembered for 24 h and claimed atomically.
    const state = await claimWebhookEvent(svixId);
    if (state === "done") {
      ok(res, "Webhook already processed.");
      return;
    }
    if (state === "busy") {
      throw new ApiError(409, "Webhook is already being processed.");
    }
  }

  try {
    const contact = await recordInboundReply(body);
    if (svixId) await finishWebhookEvent(svixId);
    ok(res, "Inbound reply recorded.", contact);
  } catch (error) {
    if (error instanceof WebhookIgnored) {
      console.warn(`Webhook ignored [${req.id}]: ${error.message}`);
      if (svixId) await finishWebhookEvent(svixId);
      ok(res, "Webhook ignored.");
      return;
    }
    // Let the sender retry a delivery that did not get recorded.
    if (svixId) {
      await deleteRecords("webhookEvents", { id: svixId }).catch((releaseError) =>
        console.warn("Releasing webhook event failed:", releaseError?.message)
      );
    }
    throw error;
  }
});
