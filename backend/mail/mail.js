import nodemailer from "nodemailer";
import config from "../config.js";

const { info, error, log } = console;

export const sendMail = async function (message, template) {
  console.log(config);

  info(message);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587, // 587 465
    auth: {
      user: config.smtp_user,
      pass: config.smtp_secret,
    },
  });
  const packet = {
    from: `"${config.application_name}" <${config.smtp_from}>`,
    to: config.smtp_from,
    bcc: ["remilekunelijah97@gmail.com"],
    replyTo: `<${config.smtp_from}>`,
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
