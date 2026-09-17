// notify(env, ctx, { type, title, message, entity, entityId, recipientId? }) for the Worker
// (API_CONTRACT_V3 §8.2). Best effort: runs in ctx.waitUntil, never throws and never fails
// the request that triggered it. Records older than 90 days are removed opportunistically.
import { createCollectionItem, getById } from "./store.js";
import { describeError } from "./http.js";
import { sendNotification } from "./email.js";
import { NOTIFICATION_RETENTION_MS, buildNotification, vacancyPostedNotification } from "../../shared/notifications.js";
import { SETTINGS_ID, mergeSettings } from "../../shared/settings.js";

const CLEANUP_PROBABILITY = 0.02;

const cleanup = async (env) => {
  if (Math.random() >= CLEANUP_PROBABILITY) return;
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_MS).toISOString();
  await env.DB.prepare("DELETE FROM records WHERE collection = 'notifications' AND created_at < ?").bind(cutoff).run();
  await env.DB.prepare("DELETE FROM records WHERE collection = 'notificationReads' AND json_extract(data, '$.readAt') < ?")
    .bind(cutoff)
    .run();
};

const background = (ctx, label, task) => {
  const promise = Promise.resolve()
    .then(task)
    .catch((error) => console.error(`${label} failed:`, describeError(error)));
  ctx?.waitUntil?.(promise);
  return promise;
};

export const notify = (env, ctx, input) =>
  background(ctx, "Notification", async () => {
    const timestamp = new Date().toISOString();
    await createCollectionItem(env, "notifications", buildNotification(input, { id: crypto.randomUUID(), timestamp }));
    await cleanup(env);
  });

const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** First publish of a vacancy: vacancy_posted notification, plus an email when vacancyEmails is set. */
export const notifyVacancyPosted = (env, ctx, vacancy) => {
  notify(env, ctx, vacancyPostedNotification(vacancy));
  background(ctx, "Vacancy email", async () => {
    const recipients = mergeSettings(await getById(env, "settings", SETTINGS_ID)).notifications.vacancyEmails;
    if (!recipients.length) return;
    await sendNotification(env, {
      to: recipients,
      subject: `Vacancy posted: ${vacancy.title}`.slice(0, 200),
      text: `A vacancy is now open: ${vacancy.title}.`,
      html: `<p>A vacancy is now open: <strong>${escapeHtml(vacancy.title)}</strong>.</p>`,
    });
  });
};
