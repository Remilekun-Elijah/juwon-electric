import env from "dotenv";
import express from "express";
if (express().get("env") === "development") env.config();

const environment = {};

environment.development = {
  port: process.env.PORT || 9000,
  application_name: "Juwon Electric",
  // smtp_user: "remilekunelijah21997@gmail.com",
  // smtp_secret: "hcxuahkunnkthgrq",
  // smtp_from: "remilekunelijah21997@gmail.com",

  smtp_host: "",
  smtp_secret: process.env.SMTP_SECRET,
  smtp_user: process.env.SMTP_USER,
  smtp_from: process.env.SMTP_FROM,
};

environment.production = {
  port: process.env.PORT || 9000,

  smtp_host: "",
  application_name: "Juwon Electric",
  smtp_secret: process.env.SMTP_SECRET,
  smtp_user: process.env.SMTP_USER,
  smtp_from: process.env.SMTP_FROM,
};

export default environment[process.env.NODE_ENV];
