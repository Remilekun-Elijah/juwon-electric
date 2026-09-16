// Svix-style webhook signature verification (used by Resend).
// https://docs.svix.com/receiving/verifying-payloads/how-manual
import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SECONDS = 5 * 60;
const SECRET_PATTERN = /^whsec_([A-Za-z0-9+/]+={0,2})$/;

/** "whsec_" followed by non-empty, well-formed base64. */
export const isValidSigningSecret = (secret) => {
  const match = String(secret || "").trim().match(SECRET_PATTERN);
  return Boolean(match) && match[1].length % 4 === 0 && Buffer.from(match[1], "base64").length > 0;
};

const decodeSecret = (secret) => Buffer.from(String(secret).trim().slice("whsec_".length), "base64");

/**
 * @returns {boolean} true when any v1 signature in the header matches and the
 * timestamp is within +/- 5 minutes. Callers check isValidSigningSecret first.
 */
export const verifySvixSignature = ({
  secret,
  id,
  timestamp,
  signatureHeader,
  rawBody,
  now = Date.now(),
}) => {
  if (!isValidSigningSecret(secret) || !id || !timestamp || !signatureHeader) return false;
  if (id.length > 256 || signatureHeader.length > 4096) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const key = decodeSecret(secret);
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ""), "utf8");
  const expected = createHmac("sha256", key)
    .update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`, "utf8"), body]))
    .digest();

  let matched = false;
  for (const part of signatureHeader.split(" ")) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) continue;
    const candidate = Buffer.from(signature, "base64");
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      matched = true; // keep looping: constant work regardless of position
    }
  }
  return matched;
};
