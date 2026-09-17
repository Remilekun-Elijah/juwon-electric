import nodemailer from "nodemailer";
import config from "../config.js";

const extractEmail = (value = "") => value.match(/<([^<>]+)>/)?.[1] || value;

// Only the error's name, code and message: provider errors can include
// recipients, message bodies or server responses.
const describeError = (err) =>
  [err?.name, err?.code, err?.responseCode, err?.message].filter(Boolean).join(" ");

let warnedUnconfigured = false;
const smtpConfigured = () => Boolean(config.smtp_user && config.smtp_secret && config.smtp_from);

let transporter = null;
const getTransporter = () => {
  transporter ||= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.smtp_user,
      pass: config.smtp_secret,
    },
  });
  return transporter;
};

// Never rejects: callers fire-and-forget this, and an unhandled rejection would
// crash the process. Resolves to true when the mail was delivered.
export const sendMail = async function (message, template) {
  if (!smtpConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("SMTP is not configured (SMTP_USER, SMTP_SECRET, SMTP_FROM): emails are not sent.");
    }
    return false;
  }

  try {
    const from = config.smtp_from.includes("<")
      ? config.smtp_from
      : `"${config.application_name}" <${config.smtp_from}>`;
    const deliveryAddress = extractEmail(config.smtp_from);
    const packet = {
      from,
      to: message.to || deliveryAddress,
      // BCC is opt-in via MAIL_BCC (comma-separated); none by default.
      // `bcc: false` opts a message out (the private storage alert).
      ...(config.mail_bcc?.length && message.bcc !== false ? { bcc: config.mail_bcc } : {}),
      replyTo: message.replyTo || deliveryAddress,
      subject: message.subject,
      html: template(message.data),
      ...(message.text ? { text: message.text } : {}),
    };

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await getTransporter().sendMail(packet);
        message?.handleSuccess?.();
        console.log("Email sent.");
        return true;
      } catch (err) {
        console.error(`Email sending failed (attempt ${attempt}):`, describeError(err));
      }
    }
    message?.handleError?.();
    return false;
  } catch (e) {
    console.error("Something is wrong with the mail service:", describeError(e));
    message?.handleError?.();
    return false;
  }
};
