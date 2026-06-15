import nodemailer from "nodemailer";
import config from "../config.js";

const { info, error, log } = console;
const extractEmail = (value = "") => value.match(/<([^>]+)>/)?.[1] || value;

export const sendMail = async function (message, template) {
  info({ subject: message.subject });
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587, // 587 465
    auth: {
      user: config.smtp_user,
      pass: config.smtp_secret,
    },
  });
  const from = config.smtp_from?.includes("<")
    ? config.smtp_from
    : `"${config.application_name}" <${config.smtp_from}>`;
  const deliveryAddress = extractEmail(config.smtp_from);
  const packet = {
    from,
    to: message.to || deliveryAddress,
    bcc: ["remilekunelijah97@gmail.com"],
    replyTo: message.replyTo || deliveryAddress,
    subject: message.subject,
    html: template(message.data),
  };

  try {
    /* send the mail */
    transporter.sendMail(packet, (err, infos) => {
      if (err) {
        error("email sending failed:", err.message);
        info("attempting to send mail again...");
        transporter.sendMail(packet, (err, info) => {
          if (err) {
            console.error(err);
            error("Failed to send mail");
            message?.handleError?.();
          } else {
            message?.handleSuccess?.();
            log("Email sent to:", info.messageId, "after failed trial ");
          }
        });
      } else {
        message?.handleSuccess?.();
        log("Email sent to:", infos.messageId);
      }
    });
  } catch (e) {
    throw new Error(
      "Something is wrong with the mail service, please try again."
    );
  }
};
