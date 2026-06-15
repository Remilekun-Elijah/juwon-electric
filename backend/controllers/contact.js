import contactTemplate from "../mail/_contact.js";
import contactReplyTemplate from "../mail/_contactReply.js";
import { sendMail } from "../mail/mail.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import {
  appendCollectionItem,
  findCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { optionalString, requiredString, validateEmail } from "../services/validators.js";

const CONTACT_THREAD_PATTERN = /\[JE-CONTACT:([^\]]+)\]/i;

const getContactThreadSubject = (subject, id) => {
  const cleanSubject = subject || "Re: Your message to Juwon Electric";
  return cleanSubject.includes("[JE-CONTACT:")
    ? cleanSubject
    : `${cleanSubject} [JE-CONTACT:${id}]`;
};

export const contactUs = asyncHandler(async (req, res) => {
  const message = await appendCollectionItem("contacts", {
    name: requiredString(req.body, "name", "Name"),
    phoneNumber: requiredString(req.body, "phoneNumber", "Phone number"),
    emailAddress: validateEmail(optionalString(req.body, "emailAddress")),
    message: requiredString(req.body, "message", "Message"),
    source: optionalString(req.body, "source") || "client",
  });

  sendMail(
    {
      subject: "You have a message",
      data: message,
    },
    contactTemplate
  );

  created(res, "Message sent.", message);
});

export const adminListMessages = asyncHandler(async (_req, res) => {
  const messages = await listCollection("contacts", { includeInactive: true });
  ok(res, "Messages retrieved.", messages);
});

export const adminUpdateMessage = asyncHandler(async (req, res) => {
  const message = await updateCollectionItem("contacts", req.params.id, {
    status: req.body.status || "new",
    note: optionalString(req.body, "note"),
    isActive: req.body.isActive ?? true,
  });
  ok(res, "Message updated.", message);
});

export const adminReplyMessage = asyncHandler(async (req, res) => {
  const contact = await getCollectionItem("contacts", req.params.id);

  if (!contact.emailAddress) {
    throw badRequest("This contact did not provide an email address.");
  }

  const reply = requiredString(req.body, "message", "Reply message");
  const subject = getContactThreadSubject(
    optionalString(req.body, "subject"),
    contact.id
  );
  const sentAt = new Date().toISOString();
  const replyRecord = {
    subject,
    message: reply,
    sentAt,
    sentBy: req.admin?.email || "admin",
  };

  sendMail(
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

  const message = await updateCollectionItem("contacts", req.params.id, {
    status: "contacted",
    replies: [...(contact.replies || []), replyRecord],
    lastRepliedAt: sentAt,
  });

  ok(res, "Reply sent.", message);
});

export const inboundContactReply = asyncHandler(async (req, res) => {
  const expectedSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (expectedSecret && req.get("x-webhook-secret") !== expectedSecret) {
    throw badRequest("Invalid webhook secret.");
  }

  const subject = optionalString(req.body, "subject");
  const fromEmail = validateEmail(
    optionalString(req.body, "fromEmail") ||
      optionalString(req.body, "from") ||
      optionalString(req.body, "sender"),
    true
  );
  const message =
    optionalString(req.body, "text") ||
    optionalString(req.body, "body") ||
    optionalString(req.body, "message");

  if (!message) throw badRequest("Inbound message body is required.");

  const subjectMatch = subject.match(CONTACT_THREAD_PATTERN);
  const contact = subjectMatch
    ? await getCollectionItem("contacts", subjectMatch[1])
    : await findCollectionItem("contacts", { emailAddress: fromEmail });

  if (!contact) throw badRequest("Unable to match inbound email to a contact.");

  const receivedAt = new Date().toISOString();
  const updated = await updateCollectionItem("contacts", contact.id, {
    status: "contacted",
    inboundReplies: [
      ...(contact.inboundReplies || []),
      {
        fromEmail,
        subject,
        message,
        receivedAt,
      },
    ],
    lastInboundReplyAt: receivedAt,
  });

  ok(res, "Inbound reply recorded.", updated);
});
