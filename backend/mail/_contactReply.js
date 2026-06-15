import config from "../config.js";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default function contactReplyTemplate({ name, originalMessage, reply }) {
  const safeName = escapeHtml(name || "there");
  const safeReply = escapeHtml(reply);
  const safeOriginalMessage = escapeHtml(originalMessage);

  return `
    <div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#202124;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ece7df;border-radius:8px;overflow:hidden;">
        <div style="background:#811418;color:#ffffff;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">${config.application_name}</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${safeName},</p>
          <div style="font-size:15px;line-height:1.7;margin-bottom:22px;white-space:pre-wrap;">${safeReply}</div>
          ${
            originalMessage
              ? `<div style="background:#fff1f1;border:1px solid #f4b7ba;border-left:5px solid #db464c;border-radius:7px;padding:16px;margin-top:20px;">
                  <p style="color:#811418;font-size:12px;font-weight:bold;text-transform:uppercase;margin:0 0 8px;">Your original message</p>
                  <p style="margin:0;line-height:1.6;white-space:pre-wrap;color:#202124;">${safeOriginalMessage}</p>
                </div>`
              : ""
          }
          <p style="font-size:14px;color:#666;margin:24px 0 0;">Regards,<br/>${config.application_name}</p>
        </div>
      </div>
    </div>
  `;
}
