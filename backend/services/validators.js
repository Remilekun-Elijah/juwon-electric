import { badRequest } from "./errors.js";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const requiredString = (body, field, label = field) => {
  const value = body?.[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`${label} is required.`);
  }
  return value.trim();
};

export const optionalString = (body, field) => {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw badRequest(`${field} must be text.`);
  return value.trim();
};

export const requiredNumber = (body, field, label = field) => {
  const value = Number(body?.[field]);
  if (!Number.isFinite(value)) throw badRequest(`${label} must be a number.`);
  return value;
};

export const optionalNumber = (body, field) => {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${field} must be a number.`);
  return number;
};

export const optionalBoolean = (body, field, defaultValue = true) => {
  const value = body?.[field];
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest(`${field} must be true or false.`);
};

export const validateEmail = (email, required = false) => {
  if (!email && !required) return "";
  if (!email || !EMAIL_REGEX.test(email)) {
    throw badRequest("A valid email address is required.");
  }
  return email.trim().toLowerCase();
};

export const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const validateOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    throw badRequest("At least one package option is required.");
  }

  return options.map((option) => ({
    name: requiredString(option, "name", "Option name"),
    price: requiredNumber(option, "price", "Option price"),
    kits: requiredString(option, "kits", "Option kits"),
  }));
};
