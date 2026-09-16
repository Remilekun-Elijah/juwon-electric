// Cloudflare Turnstile verification for public write endpoints.
//
// TURNSTILE_SECRET_KEY unset:
//   TURNSTILE_DISABLED=true            -> skipped (warns once)
//   NODE_ENV=production                -> 503 (fail closed, logged)
//   otherwise (local development)      -> skipped (warns once)
import { ApiError, badRequest } from "../services/errors.js";
import { requestIp } from "../services/ip.js";
import { LIMITS } from "../services/validators.js";
import { parseOrigins } from "./cors.js";

const DEFAULT_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;
const FAILED_MESSAGE = "Please complete the security check and try again.";
const UNAVAILABLE_MESSAGE = "Security check is temporarily unavailable. Please try again.";
const CONFIG_ERROR_CODES = ["missing-input-secret", "invalid-input-secret", "internal-error"];

let warnedDisabled = false;
const warnDisabled = (reason) => {
  if (warnedDisabled) return;
  warnedDisabled = true;
  console.warn(
    `Turnstile verification is skipped (${reason}): bot protection on /contact, /order, /subscribe and /cart is disabled.`
  );
};

const turnstileSecret = () => String(process.env.TURNSTILE_SECRET_KEY || "").trim();

export const warnIfTurnstileDisabled = () => {
  if (turnstileSecret()) return;
  if (process.env.TURNSTILE_DISABLED === "true") warnDisabled("TURNSTILE_DISABLED=true");
  else if (process.env.NODE_ENV === "production") {
    console.error(
      "TURNSTILE_SECRET_KEY is not set in production: public form submissions answer 503. Set it, or TURNSTILE_DISABLED=true to deliberately skip verification."
    );
  } else warnDisabled("TURNSTILE_SECRET_KEY is not set");
};

// TURNSTILE_HOSTNAMES, else the hostnames of ALLOWED_ORIGINS, else no check.
const allowedHostnames = () => {
  const explicit = String(process.env.TURNSTILE_HOSTNAMES || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (explicit.length) return explicit;
  return parseOrigins(process.env.ALLOWED_ORIGINS)
    .map((origin) => {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
};

/**
 * Verifies `token` for `action` ("contact" | "order" | "subscribe" | "cart").
 * Throws 400 (missing/invalid) or 503 (unavailable / misconfigured).
 */
export const verifyTurnstile = async (req, token, action) => {
  const secret = turnstileSecret();
  if (!secret) {
    if (process.env.TURNSTILE_DISABLED === "true") {
      warnDisabled("TURNSTILE_DISABLED=true");
      return;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("Turnstile: TURNSTILE_SECRET_KEY is not set in production; rejecting with 503.");
      throw new ApiError(503, UNAVAILABLE_MESSAGE);
    }
    warnDisabled("TURNSTILE_SECRET_KEY is not set");
    return;
  }

  if (typeof token !== "string" || !token.trim() || token.length > LIMITS.turnstileToken) {
    throw badRequest(FAILED_MESSAGE);
  }

  // TURNSTILE_VERIFY_URL is for tests only (points at a local stub).
  const verifyUrl = process.env.TURNSTILE_VERIFY_URL || DEFAULT_VERIFY_URL;
  const form = new URLSearchParams({ secret, response: token.trim() });
  const ip = requestIp(req);
  if (ip) form.set("remoteip", ip);

  let outcome;
  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`siteverify responded ${response.status}`);
    outcome = await response.json();
  } catch (error) {
    console.warn("Turnstile verification unavailable:", error?.name, error?.message);
    throw new ApiError(503, UNAVAILABLE_MESSAGE);
  }

  const errorCodes = Array.isArray(outcome?.["error-codes"])
    ? outcome["error-codes"].map((code) => String(code).slice(0, 64))
    : [];
  if (errorCodes.length) console.warn(`Turnstile error-codes [${req.id}]:`, errorCodes.join(","));
  if (errorCodes.some((code) => CONFIG_ERROR_CODES.includes(code))) {
    console.error(
      "TURNSTILE MISCONFIGURED: siteverify reported",
      errorCodes.join(","),
      "- check TURNSTILE_SECRET_KEY."
    );
    throw new ApiError(503, UNAVAILABLE_MESSAGE);
  }

  if (outcome?.success !== true) throw badRequest(FAILED_MESSAGE);

  if (outcome.action !== action) {
    console.warn(`Turnstile action mismatch [${req.id}]: expected ${action}`);
    throw badRequest(FAILED_MESSAGE);
  }

  const hostnames = allowedHostnames();
  const hostname = String(outcome.hostname || "").toLowerCase();
  if (hostnames.length && !hostnames.includes(hostname)) {
    console.warn(`Turnstile hostname not allowed [${req.id}]:`, hostname.slice(0, 253));
    throw badRequest(FAILED_MESSAGE);
  }
};

/** Removes the token from the body (it is never stored) and returns it. */
export const takeTurnstileToken = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const token = body.turnstileToken;
  delete body.turnstileToken;
  return token;
};
