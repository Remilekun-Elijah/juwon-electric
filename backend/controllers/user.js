import contactTemplate from "../mail/_contact.js";
import orderTemplate from "../mail/_orderTemplate.js";
import subscriberTemplate from "../mail/_subscriber.js";
import { sendMail } from "../mail/mail.js";

export const contactUs = (req, res) => {
  sendMail(
    {
      subject: "You have a message",
      data: req.body,
    },
    contactTemplate
  );

  res.status(200).json({ success: true, message: "Message sent." });
};

export const subscribe = (req, res) => {
  sendMail(
    {
      subject: "You have a new subscriber",
      data: req.body,
    },
    subscriberTemplate
  );

  res.status(200).json({
    success: true,
    message:
      "Thank you for subscribing to our newsletter. We will keep you up to date when we add a new product.",
  });
};

export const order = (req, res) => {
  sendMail(
    {
      subject: "You have a new order",
      data: req.body,
    },
    orderTemplate
  );

  res
    .status(200)
    .json({ success: true, message: "Order placed successfully." });
};
