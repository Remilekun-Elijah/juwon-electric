// notify() for Express (API_CONTRACT_V3 §8.2). Best effort: runs in the background, never
// throws and never fails the request that triggered it. Records older than 90 days are
// removed opportunistically (at most once an hour per process).
import { randomUUID } from "crypto";
import { sendMail } from "../mail/mail.js";
import { runInBackground } from "./runtime.js";
import { getSettings } from "./settings.js";
import { createCollectionItem, deleteCollectionItemsBefore } from "./store.js";
import { NOTIFICATION_RETENTION_MS, buildNotification, vacancyPostedNotification } from "../shared/notifications.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

const cleanup = async () => {
  const current = Date.now();
  if (current - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = current;
  const cutoff = new Date(current - NOTIFICATION_RETENTION_MS).toISOString();
  await deleteCollectionItemsBefore("notifications", "createdAt", cutoff);
  await deleteCollectionItemsBefore("notificationReads", "readAt", cutoff);
};

/** notify({ type, title, message, entity, entityId, recipientId? }) */
export const notify = (input) =>
  runInBackground("Notification", async () => {
    await createCollectionItem("notifications", buildNotification(input, { id: randomUUID(), timestamp: new Date().toISOString() }));
    await cleanup();
  });

const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** First publish of a vacancy: vacancy_posted notification, plus an email when vacancyEmails is set. */
export const notifyVacancyPosted = (vacancy) => {
  notify(vacancyPostedNotification(vacancy));
  runInBackground("Vacancy email", async () => {
    const recipients = (await getSettings()).notifications.vacancyEmails;
    if (!recipients.length) return;
    const html = `<p>A vacancy is now open: <strong>${escapeHtml(vacancy.title)}</strong>.</p>`;
    await sendMail({ subject: `Vacancy posted: ${vacancy.title}`.slice(0, 200), to: recipients, data: html }, (body) => body);
  });
};
