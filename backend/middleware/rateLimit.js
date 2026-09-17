// Fixed-window rate limits (no external dependencies).
// Counters live in MongoDB when connected (shared across instances) and in
// process memory otherwise; see services/counterStore.js.
//
// Limits are enforced from inside the handlers, after body validation and
// before Turnstile / database work (see docs/API.md "Order of checks").
import { hitCounter } from "../services/counterStore.js";
import { minutesText, tooManyRequests } from "../services/errors.js";
import { requestIpPrefix } from "../services/ip.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const LIMIT_MESSAGES = {
  generic: (ms) => `Too many requests. Please try again in ${minutesText(ms)}.`,
  signIn: (ms) => `Too many sign-in attempts. Try again in ${minutesText(ms)}.`,
  lockout: (ms) => `Too many failed sign-in attempts. Try again in ${minutesText(ms)}.`,
  resetRequest: (ms) => `Too many password reset requests. Try again in ${minutesText(ms)}.`,
};

export const LIMITS = {
  publicWrite: { limit: 30, windowMs: 10 * MINUTE, message: LIMIT_MESSAGES.generic },
  quote: { limit: 60, windowMs: 10 * MINUTE, message: LIMIT_MESSAGES.generic },
  loginIp: { limit: 20, windowMs: 15 * MINUTE, message: LIMIT_MESSAGES.signIn },
  resetRequest: { limit: 3, windowMs: HOUR, message: LIMIT_MESSAGES.resetRequest },
  resetConfirm: { limit: 10, windowMs: HOUR, message: LIMIT_MESSAGES.generic },
  // Per admin (UPLOADS_V1 §2).
  upload: { limit: 60, windowMs: 10 * MINUTE, message: LIMIT_MESSAGES.generic },
};

/**
 * Counts one hit on `name` for `key` (default: the client IP prefix) and throws
 * a 429 ApiError (with Retry-After) once the limit is exceeded.
 */
export const enforceLimit = async (req, res, name, { limit, windowMs, message }, key) => {
  const bucketKey = `rl:${name}:${key ?? requestIpPrefix(req)}`;
  let result;
  try {
    result = await hitCounter(bucketKey, windowMs);
  } catch (error) {
    // Never fail the request because the limiter itself broke.
    console.warn("Rate limiter error:", error?.name, error?.message);
    return;
  }
  if (result.count > limit) {
    const remaining = Math.max(result.resetAt - Date.now(), 0);
    throw tooManyRequests(res, message(remaining), remaining);
  }
};
