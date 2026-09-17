// Outbound email through Resend. Resolves to { skipped } when email is not configured,
// { skipped: false, failed: true } when the provider call fails, never throws.
import { describeError } from "./http.js";

export const sendNotification = async (env, { to, subject, text, html }) => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !to) return { skipped: true };

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to,
        subject,
        text,
        html,
        reply_to: env.MAIL_REPLY_TO || env.MAIL_FROM,
      }),
    });
  } catch (error) {
    console.error("Email provider request failed:", describeError(error));
    return { skipped: false, failed: true };
  }

  if (!response.ok) {
    response.body?.cancel?.().catch?.(() => {});
    console.error(`Email provider failed with HTTP ${response.status}`);
    return { skipped: false, failed: true };
  }

  return { skipped: false };
};
