import subscriberTemplate from "../mail/_subscriber.js";
import { sendMail } from "../mail/mail.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { created, ok } from "../services/http.js";
import {
  appendCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { optionalString, validateEmail } from "../services/validators.js";

export const subscribe = asyncHandler(async (req, res) => {
  const emailAddress = validateEmail(req.body.emailAddress || req.body.email, true);
  const subscriber = await appendCollectionItem("newsletters", {
    emailAddress,
    name: optionalString(req.body, "name"),
    source: optionalString(req.body, "source") || "client",
  });

  sendMail(
    {
      subject: "You have a new subscriber",
      data: subscriber,
    },
    subscriberTemplate
  );

  created(res, "Thank you for subscribing to our newsletter. We will keep you up to date when we add a new product.", subscriber);
});

export const adminListSubscribers = asyncHandler(async (_req, res) => {
  const subscribers = await listCollection("newsletters", { includeInactive: true });
  ok(res, "Subscribers retrieved.", subscribers);
});

export const adminUpdateSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await updateCollectionItem("newsletters", req.params.id, {
    status: req.body.status || "new",
    isActive: req.body.isActive ?? true,
  });
  ok(res, "Subscriber updated.", subscriber);
});
