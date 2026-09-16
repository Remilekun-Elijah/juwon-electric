// Admin invite email (POST /admin/users), identical in Express (nodemailer) and the
// Worker (Resend). Pure ESM: returns { subject, html, text }.
export const APPLICATION_NAME = "Juwon Electric";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatExpiry = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? "") : date.toUTCString();
};

// Only an absolute http(s) URL is linked.
const safeUrl = (value) => {
  const text = String(value || "").trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(text) ? text : "";
};

export const adminInviteEmail = ({ name, email, role, token, expiresAt, adminUrl }) => {
  const url = safeUrl(adminUrl);
  const expiry = formatExpiry(expiresAt);
  const subject = `Set up your ${APPLICATION_NAME} admin account`;

  const text = [
    `Hello ${name || "there"},`,
    "",
    `An ${APPLICATION_NAME} admin account (role: ${role}) was created for ${email}.`,
    "Set your password with the setup token below.",
    "",
    `Setup token: ${token}`,
    "",
    "To set your password:",
    `1. Open the admin console${url ? ` (${url})` : ""} and choose "Forgot password".`,
    `2. Enter your admin email (${email}).`,
    "3. Paste the setup token into the \"Reset token\" field.",
    "4. Enter and confirm your new password (12-128 characters), then submit.",
    "",
    `This token can be used once and expires at ${expiry}. If it has expired, request a new one with "Forgot password".`,
    "",
    `If you were not expecting this, you can ignore this email.`,
    "",
    `Regards,`,
    APPLICATION_NAME,
  ].join("\n");

  const safe = {
    name: escapeHtml(name || "there"),
    email: escapeHtml(email),
    role: escapeHtml(role),
    token: escapeHtml(token),
    expiry: escapeHtml(expiry),
    url: escapeHtml(url),
  };

  const html = `
    <div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#202124;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ece7df;border-radius:8px;overflow:hidden;">
        <div style="background:#811418;color:#ffffff;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">${APPLICATION_NAME}</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${safe.name},</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">
            An admin account with the role <strong>${safe.role}</strong> was created for <strong>${safe.email}</strong>.
            Use the setup token below to choose your password.
          </p>
          <div style="background:#fff1f1;border:1px solid #f4b7ba;border-left:5px solid #db464c;border-radius:7px;padding:16px;margin:0 0 20px;">
            <p style="color:#811418;font-size:12px;font-weight:bold;text-transform:uppercase;margin:0 0 8px;">Setup token</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.6;word-break:break-all;color:#202124;">${safe.token}</p>
          </div>
          <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">To set your password:</p>
          <ol style="font-size:15px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
            <li>Open the admin console${
              safe.url ? ` (<a href="${safe.url}" style="color:#db464c;">${safe.url}</a>)` : ""
            } and choose "Forgot password".</li>
            <li>Enter your admin email (<strong>${safe.email}</strong>).</li>
            <li>Paste the token above into the "Reset token" field.</li>
            <li>Enter and confirm your new password (12-128 characters), then submit.</li>
          </ol>
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
            This token can be used once and expires at ${safe.expiry}. If it has expired, request a new one with "Forgot password".
          </p>
          <p style="font-size:14px;line-height:1.6;color:#666;margin:0;">If you were not expecting this, you can ignore this email.</p>
          <p style="font-size:14px;color:#666;margin:24px 0 0;">Regards,<br/>${APPLICATION_NAME}</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html, text };
};
