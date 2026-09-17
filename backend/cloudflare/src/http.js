// HTTP plumbing shared by every route: error type, JSON responses, request body
// reading with a byte cap, Content-Type checks, CORS, security headers, request ids
// and client IP normalization.

export const MAX_BODY_BYTES = 100 * 1024;

export class ApiError extends Error {
  constructor(statusCode, message, details, headers) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.headers = headers;
  }
}

export const badRequest = (message) => {
  throw new ApiError(400, message);
};

export const notFound = (message = "Route not found.") => {
  throw new ApiError(404, message);
};

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...extraHeaders, "Content-Type": "application/json" },
  });

export const ok = (message, data = null) => json({ success: true, message, data });
export const created = (message, data = null) => json({ success: true, message, data }, 201);

const warned = new Set();
export const warnOnce = (key, message) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
};

// "1 minute" / "N minutes", rounded up, at least 1.
export const minutesText = (remainingMs) => {
  const minutes = Math.max(Math.ceil(remainingMs / 60000), 1);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
};

export const retryAfterSeconds = (remainingMs) => String(Math.max(Math.ceil(remainingMs / 1000), 1));

// Short error details for logs: never whole provider objects or response bodies.
export const describeError = (error) => {
  if (!error) return "unknown error";
  const name = error.name || "Error";
  const code = error.code ? ` (${error.code})` : "";
  return `${name}${code}: ${String(error.message || error).slice(0, 300)}`;
};

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

const tooLarge = () => new ApiError(413, "Request body is too large.");

const BODY_METHODS = ["POST", "PUT", "PATCH"];

// A body is declared when Content-Length > 0, or when Content-Length is absent and a
// body stream (or Transfer-Encoding) is present.
export const hasDeclaredBody = (request) => {
  if (!BODY_METHODS.includes(request.method)) return false;
  const declared = request.headers.get("Content-Length");
  if (declared !== null && declared.trim() !== "") {
    const length = Number(declared);
    return !(Number.isFinite(length) && length === 0);
  }
  return request.body !== null || request.headers.has("Transfer-Encoding");
};

export const isJsonContentType = (request) => {
  const mediaType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  return mediaType === "application/json";
};

export const assertJsonContentType = (request) => {
  if (hasDeclaredBody(request) && !isJsonContentType(request)) {
    throw new ApiError(415, "Content-Type must be application/json.");
  }
};

// Reads the raw body bytes. Content-Length is checked up front, but the bytes actually
// read are capped too because the header can be missing or wrong.
export const readBodyBytes = async (request, maxBytes = MAX_BODY_BYTES) => {
  if (!BODY_METHODS.includes(request.method) || !request.body) return new Uint8Array(0);

  const declared = request.headers.get("Content-Length");
  if (declared !== null && declared.trim() !== "") {
    const length = Number(declared);
    if (Number.isFinite(length) && length > maxBytes) throw tooLarge();
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

// UTF-8 decode (a leading BOM is dropped, which JSON.parse would reject anyway).
export const decodeBody = (bytes) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
};

// Empty bodies are treated as {} so body-less POSTs (e.g. logout) keep working.
export const parseJsonBody = (raw) => {
  if (!raw || !raw.trim()) return {};
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    badRequest("Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    badRequest("Request body must be a JSON object.");
  }
  return body;
};

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS";
const ALLOW_HEADERS = "Content-Type,Authorization,X-Admin-Token";
const EXPOSE_HEADERS = "Retry-After,X-Request-Id";
const PREFLIGHT_MAX_AGE = "600";

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "").toLowerCase();

export const parseAllowedOrigins = (env) =>
  String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

// { allowed, headers }: allowed is false only when ALLOWED_ORIGINS is set and the
// request carries an Origin that is not listed.
export const corsHeaders = (request, env) => {
  const allowed = parseAllowedOrigins(env);
  const base = {
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Expose-Headers": EXPOSE_HEADERS,
  };
  if (request.method === "OPTIONS") base["Access-Control-Max-Age"] = PREFLIGHT_MAX_AGE;

  if (allowed.length === 0) {
    warnOnce(
      "cors-open",
      "ALLOWED_ORIGINS is not set; CORS allows any origin (*). Set ALLOWED_ORIGINS to the frontend origin(s) in production."
    );
    return { allowed: true, headers: { ...base, "Access-Control-Allow-Origin": "*" } };
  }

  const origin = request.headers.get("Origin");
  if (origin === null) return { allowed: true, headers: { ...base, Vary: "Origin" } };
  if (allowed.includes(normalizeOrigin(origin))) {
    return {
      allowed: true,
      headers: { ...base, "Access-Control-Allow-Origin": origin, Vary: "Origin" },
    };
  }
  return { allowed: false, headers: { Vary: "Origin" } };
};

// ---------------------------------------------------------------------------
// Headers, request ids, paths
// ---------------------------------------------------------------------------

export const isAdminPath = (path) => {
  const lowered = String(path || "").toLowerCase();
  return lowered === "/admin" || lowered.startsWith("/admin/");
};

export const securityHeaders = (request, path) => {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    // CORP is only enforced for no-cors requests; the frontend's CORS fetches are unaffected.
    "Cross-Origin-Resource-Policy": "same-site",
  };
  // Uploaded images are embedded by the storefront, which can be on another site.
  if (path !== null && /^\/(api\/)?uploads\//.test(path)) headers["Cross-Origin-Resource-Policy"] = "cross-origin";
  let protocol = "";
  try {
    protocol = new URL(request.url).protocol;
  } catch {
    // ignore
  }
  if (protocol === "https:") headers["Strict-Transport-Security"] = "max-age=31536000";
  if (path !== null && isAdminPath(path)) headers["Cache-Control"] = "no-store";
  return headers;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export const resolveRequestId = (request) => {
  const incoming = request.headers.get("X-Request-Id");
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
};

// Copies the response with CORS, security and request id headers applied (overriding
// any existing values). HEAD responses lose their body.
export const finalizeResponse = (response, request, env, path, requestId) => {
  const headers = new Headers(response.headers);
  let cors = { headers: {} };
  try {
    cors = corsHeaders(request, env);
  } catch (error) {
    console.error("CORS header computation failed", describeError(error));
  }
  headers.delete("Access-Control-Allow-Origin");
  for (const [key, value] of Object.entries({ ...cors.headers, ...securityHeaders(request, path) })) {
    headers.set(key, value);
  }
  if (requestId) headers.set("X-Request-Id", requestId);
  const noBody = request.method === "HEAD" || response.status === 204;
  return new Response(noBody ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const normalizePath = (url) => {
  const path = url.pathname;
  if (/^\/api(\/|$)/.test(path)) return path.slice(4) || "/";
  return path;
};

// ---------------------------------------------------------------------------
// Client IP
// ---------------------------------------------------------------------------

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const HEXTET_PATTERN = /^[0-9a-f]{1,4}$/;

const isIpv4 = (value) => IPV4_PATTERN.test(value) && value.split(".").every((part) => Number(part) <= 255);

// Returns the 8 hextets of an IPv6 address as numbers, or null when it does not parse.
const expandIpv6 = (input) => {
  let value = String(input).toLowerCase();
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  if (value.length > 45 || !value.includes(":")) return null;

  let tail = [];
  const lastColon = value.lastIndexOf(":");
  const lastPart = value.slice(lastColon + 1);
  if (lastPart.includes(".")) {
    if (!isIpv4(lastPart)) return null;
    const octets = lastPart.split(".").map(Number);
    tail = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    // Drop ":a.b.c.d" but keep a "::" that directly precedes it.
    const prefix = value.slice(0, lastColon + 1);
    value = prefix.endsWith("::") ? prefix : prefix.slice(0, -1);
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const parse = (text) => (text === "" ? [] : text.split(":"));
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  if ([...head, ...rest].some((part) => !HEXTET_PATTERN.test(part))) return null;
  const known = head.length + rest.length + tail.length;
  if (halves.length === 2) {
    if (known > 7) return null;
    return [...head, ...Array(8 - known).fill("0"), ...rest].map((part) => parseInt(part, 16)).concat(tail);
  }
  if (known !== 8) return null;
  return [...head.map((part) => parseInt(part, 16)), ...tail];
};

// Full client address, normalized: IPv4-mapped IPv6 becomes plain IPv4.
export const normalizeIp = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "unknown";
  if (isIpv4(value)) return value;
  const hextets = expandIpv6(value);
  if (!hextets) return value.slice(0, 64);
  if (hextets.slice(0, 5).every((part) => part === 0) && hextets[5] === 0xffff) {
    return [hextets[6] >> 8, hextets[6] & 255, hextets[7] >> 8, hextets[7] & 255].join(".");
  }
  return value.toLowerCase();
};

// Key used for rate limits and lockouts: IPv4 as-is, IPv6 as its /64 prefix.
export const ipPrefix = (ip) => {
  const normalized = normalizeIp(ip);
  if (normalized === "unknown" || isIpv4(normalized)) return normalized;
  const hextets = expandIpv6(normalized);
  if (!hextets) return normalized;
  return `${hextets
    .slice(0, 4)
    .map((part) => part.toString(16))
    .join(":")}::/64`;
};

export const getClientIp = (request) => normalizeIp(request.headers.get("CF-Connecting-IP"));
export const getClientIpPrefix = (request) => ipPrefix(getClientIp(request));

export const getUserAgent = (request) => (request.headers.get("User-Agent") || "").slice(0, 256);
