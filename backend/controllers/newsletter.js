import subscriberTemplate from "../mail/_subscriber.js";
import { sendMail } from "../mail/mail.js";
import { LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { takeTurnstileToken, verifyTurnstile } from "../middleware/turnstile.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { auditDelete, auditUpdate } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { track } from "../services/runtime.js";
import {
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
  upsertCollectionItem,
} from "../services/store.js";
import {
  LIMITS,
  optionalBoolean,
  optionalString,
  enumField,
  validateEmail,
} from "../services/validators.js";

const NEWSLETTER_STATUSES = ["new", "active", "inactive"];
const SUBSCRIBED_MESSAGE = "You're subscribed.";

export const subscribe = asyncHandler(async (req, res) => {
  const turnstileToken = takeTurnstileToken(req.body);
  const emailKey =
    req.body?.emailAddress !== undefined && req.body?.emailAddress !== null && req.body?.emailAddress !== ""
      ? "emailAddress"
      : "email";
  const emailAddress = validateEmail(
    optionalString(req.body, emailKey, { label: "Email address", max: LIMITS.email }),
    true
  );
  const fields = {
    emailAddress,
    name: optionalString(req.body, "name", { label: "Name", max: LIMITS.personName }),
    source:
      optionalString(req.body, "source", { label: "Source", max: LIMITS.source }) || "client",
  };

  await enforceLimit(req, res, "public-subscribe", RATE_LIMITS.publicWrite);
  await verifyTurnstile(req, turnstileToken, "subscribe");

  // One record per email: an existing subscriber is reactivated, never duplicated.
  // Same body either way (only the status code differs) so emails can't be enumerated.
  const { item: subscriber, created: isNew } = await upsertCollectionItem(
    "newsletters",
    { emailAddress },
    {
      create: { ...fields, status: "new", receivedAt: new Date().toISOString() },
      update: (existing) =>
        existing.isActive === false || existing.status === "inactive"
          ? {
              isActive: true,
              ...(existing.status === "inactive" ? { status: "active" } : {}),
            }
          : null,
    }
  );

  if (isNew) {
    track(
      sendMail(
        {
          subject: "You have a new subscriber",
          data: subscriber,
        },
        subscriberTemplate
      )
    );
    created(res, SUBSCRIBED_MESSAGE, { emailAddress });
  } else {
    ok(res, SUBSCRIBED_MESSAGE, { emailAddress });
  }
});

export const adminListSubscribers = asyncHandler(async (_req, res) => {
  const subscribers = await listCollection("newsletters", { includeInactive: true });
  ok(res, "Subscribers retrieved.", subscribers);
});

export const adminUpdateSubscriber = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = await getCollectionItem("newsletters", req.params.id);
  const status = enumField(body, "status", NEWSLETTER_STATUSES, {
    label: "Status",
    existing: existing.status,
  });
  const isActive = optionalBoolean(body, "isActive", undefined);

  // Only the fields that were sent are written (against the fresh record).
  const patch = { status, isActive };
  const changedKeys = Object.keys(patch).filter((key) => patch[key] !== undefined);
  const subscriber = await updateCollectionItem("newsletters", existing.id, patch);
  auditUpdate(req, "newsletter", existing, subscriber, changedKeys);
  ok(res, "Subscriber updated.", subscriber);
});

export const adminDeleteSubscriber = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("newsletters", req.params.id);
  const subscriber = await deleteCollectionItem("newsletters", existing.id);
  auditDelete(req, "newsletter", subscriber);
  ok(res, "Subscriber deleted.", subscriber);
});
