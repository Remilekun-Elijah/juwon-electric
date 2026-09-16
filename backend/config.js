import env from "dotenv";
import express from "express";
if (express().get("env") === "development") env.config();

// Comma-separated env value -> trimmed, non-empty entries.
const parseList = (value = "") =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const environment = {};

environment.development = {
  port: process.env.PORT || 9000,
  application_name: "Juwon Electric",
  env: process.env.NODE_ENV,
  smtp_host: "",
  smtp_secret: process.env.SMTP_SECRET,
  smtp_user: process.env.SMTP_USER,
  smtp_from: process.env.SMTP_FROM,
  mongodb_uri: process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI,
  mail_bcc: parseList(process.env.MAIL_BCC),
  admin_app_url: (process.env.ADMIN_APP_URL || "").trim(),
};

environment.production = {
  port: process.env.PORT || 9000,
  env: process.env.NODE_ENV,
  smtp_host: "",
  application_name: "Juwon Electric",
  smtp_secret: process.env.SMTP_SECRET,
  smtp_user: process.env.SMTP_USER,
  smtp_from: process.env.SMTP_FROM,
  mongodb_uri: process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI,
  mail_bcc: parseList(process.env.MAIL_BCC),
  admin_app_url: (process.env.ADMIN_APP_URL || "").trim(),
};

export default environment[process.env.NODE_ENV] || environment.development;
