// Crypto helpers, Turnstile verification and Svix (Resend) webhook signatures.
import { ApiError, badRequest, getClientIp, parseAllowedOrigins, warnOnce } from "./http.js";
import { LIMITS } from "./validation.js";

export const textEncoder = new TextEncoder();

export const bytesToHex = (bytes) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const bytesToBase64 = (bytes) => {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let index = 0; index < view.length; index += 1) binary += String.fromCharCode(view[index]);
  return btoa(binary);
};

const toBase64url = (base64) => base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

export const randomBase64url = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64url(bytesToBase64(bytes));
};

export const base64urlEncode = (value) =>
  toBase64url(bytesToBase64(textEncoder.encode(typeof value === "string" ? value : JSON.stringify(value))));

export const base64urlDecode = (value) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
};

export const sha256Hex = async (value) =>
  bytesToHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(String(value ?? ""))));

// Hashing both sides first gives equal-length inputs, so timingSafeEqual never
// short-circuits on length and leaks nothing about the expected value.
export const timingSafeEqualStrings = async (a, b) => {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(String(a ?? ""))),
    crypto.subtle.digest("SHA-256", textEncoder.encode(String(b ?? ""))),
  ]);
  return crypto.subtle.timingSafeEqual(left, right);
};

export const hmacHex = async (secret, payload) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
};

// ---------------------------------------------------------------------------
// Cloudflare Turnstile
// ---------------------------------------------------------------------------

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5000;
const TURNSTILE_FAILED = "Please complete the security check and try again.";
const TURNSTILE_UNAVAILABLE = "Security check is temporarily unavailable. Please try again.";
const TURNSTILE_CONFIG_ERRORS = ["missing-input-secret", "invalid-input-secret", "internal-error"];

const unavailable = () => new ApiError(503, TURNSTILE_UNAVAILABLE);

// Hostnames the Turnstile widget may be solved on: TURNSTILE_HOSTNAMES, else the
// hostnames of ALLOWED_ORIGINS, else an empty list (no hostname check).
export const turnstileHostnames = (env) => {
  const explicit = String(env.TURNSTILE_HOSTNAMES || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (explicit.length) return explicit;
  return parseAllowedOrigins(env)
    .map((origin) => {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
};

// action: "contact" | "order" | "subscribe" | "cart"
export const verifyTurnstile = async (request, env, body, action) => {
  if (env.TURNSTILE_DISABLED === "true") {
    warnOnce("turnstile-disabled", "TURNSTILE_DISABLED=true; Turnstile bot protection is switched off for public forms.");
    return;
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error(
      "TURNSTILE_SECRET_KEY is not set; public form submissions are rejected (503). Set the secret, or TURNSTILE_DISABLED=true for local development."
    );
    throw unavailable();
  }

  const token = body?.turnstileToken;
  if (typeof token !== "string" || !token.trim() || token.length > LIMITS.turnstileToken) {
    badRequest(TURNSTILE_FAILED);
  }

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token.trim());
  const ip = getClientIp(request);
  if (ip !== "unknown") form.append("remoteip", ip);

  let outcome;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`siteverify HTTP ${response.status}`);
    outcome = await response.json();
  } catch (error) {
    console.error("Turnstile verification unavailable:", error?.name || "Error", String(error?.message || "").slice(0, 200));
    throw unavailable();
  }

  const errorCodes = Array.isArray(outcome?.["error-codes"]) ? outcome["error-codes"].map(String) : [];
  if (errorCodes.length) console.warn(`Turnstile error-codes (${action}): ${errorCodes.join(", ")}`);
  if (errorCodes.some((code) => TURNSTILE_CONFIG_ERRORS.includes(code))) {
    console.error(`TURNSTILE MISCONFIGURED OR UNAVAILABLE: ${errorCodes.join(", ")}`);
    throw unavailable();
  }

  if (!outcome || outcome.success !== true) badRequest(TURNSTILE_FAILED);

  if (outcome.action !== action) {
    console.warn(`Turnstile action mismatch: expected ${action}, got ${String(outcome.action).slice(0, 50)}`);
    badRequest(TURNSTILE_FAILED);
  }

  const hostnames = turnstileHostnames(env);
  if (hostnames.length && !hostnames.includes(String(outcome.hostname || "").toLowerCase())) {
    console.warn(`Turnstile hostname mismatch: ${String(outcome.hostname).slice(0, 100)}`);
    badRequest(TURNSTILE_FAILED);
  }
};

// ---------------------------------------------------------------------------
// Svix-style webhook signatures (used by Resend)
// https://docs.svix.com/receiving/verifying-payloads/how-manual
// ---------------------------------------------------------------------------

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

const invalidSignature = () => new ApiError(401, "Invalid webhook signature.");

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

// Returns the key bytes, or null when the secret is not "whsec_" + valid base64.
export const decodeSvixSecret = (secret) => {
  const value = String(secret ?? "").trim();
  if (!value.startsWith("whsec_")) return null;
  const encoded = value.slice("whsec_".length);
  if (!encoded || !BASE64_PATTERN.test(encoded)) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    return bytes.length ? bytes : null;
  } catch {
    return null;
  }
};

export const assertSvixSecret = (secret) => {
  const keyBytes = decodeSvixSecret(secret);
  if (!keyBytes) {
    console.error("INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET is malformed (expected whsec_ followed by base64).");
    throw new ApiError(500, "Webhook is not configured correctly.");
  }
  return keyBytes;
};

// Throws 401 unless one of the v1 signatures matches and the timestamp is fresh.
// The HMAC covers the raw body bytes exactly as received (a BOM included).
// Returns the svix-id for replay protection.
export const verifySvixSignature = async (request, secret, rawBytes, nowMs = Date.now()) => {
  const keyBytes = assertSvixSecret(secret);

  const id = request.headers.get("svix-id") || "";
  const timestamp = request.headers.get("svix-timestamp") || "";
  const signatureHeader = request.headers.get("svix-signature") || "";
  if (!id || !timestamp || !signatureHeader || id.length > 256) throw invalidSignature();
  if (!/^\d{1,12}$/.test(timestamp)) throw invalidSignature();
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) throw invalidSignature();

  const prefix = textEncoder.encode(`${id}.${timestamp}.`);
  const signed = new Uint8Array(prefix.length + rawBytes.length);
  signed.set(prefix, 0);
  signed.set(rawBytes, prefix.length);

  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = bytesToBase64(await crypto.subtle.sign("HMAC", key, signed));

  let matched = false;
  for (const entry of signatureHeader.split(" ").slice(0, 20)) {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) continue;
    // Evaluate every candidate so timing does not reveal which one matched.
    if (await timingSafeEqualStrings(signature, expected)) matched = true;
  }
  if (!matched) throw invalidSignature();
  return id;
};
