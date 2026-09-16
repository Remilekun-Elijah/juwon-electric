import config from "../config.js";
import { escapeHtml } from "./_contactReply.js";

const formatExpiry = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toUTCString();
};

export default function passwordResetTemplate({
  name,
  email,
  resetToken,
  expiresAt,
  adminUrl,
}) {
  const safeName = escapeHtml(name || "there");
  const safeEmail = escapeHtml(email);
  const safeToken = escapeHtml(resetToken);
  const safeExpiry = escapeHtml(formatExpiry(expiresAt));
  const safeUrl = adminUrl ? escapeHtml(adminUrl) : "";

  return `
    <div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#202124;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ece7df;border-radius:8px;overflow:hidden;">
        <div style="background:#811418;color:#ffffff;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">${config.application_name}</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${safeName},</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">
            A password reset was requested for the admin account <strong>${safeEmail}</strong>.
            Use the reset token below to choose a new password.
          </p>
          <div style="background:#fff1f1;border:1px solid #f4b7ba;border-left:5px solid #db464c;border-radius:7px;padding:16px;margin:0 0 20px;">
            <p style="color:#811418;font-size:12px;font-weight:bold;text-transform:uppercase;margin:0 0 8px;">Reset token</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.6;word-break:break-all;color:#202124;">${safeToken}</p>
          </div>
          <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">To reset your password:</p>
          <ol style="font-size:15px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
            <li>Go back to the admin console page where you requested the reset${
              safeUrl
                ? ` (or open <a href="${safeUrl}" style="color:#db464c;">${safeUrl}</a>)`
                : ""
            }. The reset form is shown right after you click "Generate reset token".</li>
            <li>Enter your admin email (<strong>${safeEmail}</strong>).</li>
            <li>Paste the token above into the "Reset token" field.</li>
            <li>Enter and confirm your new password (at least 8 characters), then click "Reset password".</li>
          </ol>
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
            This token can be used once and expires at ${safeExpiry}. Requesting another reset
            makes this token invalid.
          </p>
          <p style="font-size:14px;line-height:1.6;color:#666;margin:0;">
            If you did not request this, you can ignore this email; your password will not change.
          </p>
          <p style="font-size:14px;color:#666;margin:24px 0 0;">Regards,<br/>${config.application_name}</p>
        </div>
      </div>
    </div>
  `;
}
