// CORS without external dependencies.
//
// ALLOWED_ORIGINS set (comma-separated exact origins, compared lowercased):
//   listed origins get Access-Control-Allow-Origin (reflected) + Vary: Origin;
//   any request (including preflights) carrying an unlisted Origin gets 403.
//   Requests without an Origin header are unaffected.
// ALLOWED_ORIGINS unset: Access-Control-Allow-Origin: * (warns once).
// Preflights (OPTIONS) that are allowed answer 204 with an empty body.

const ALLOWED_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization,X-Admin-Token";
const EXPOSED_HEADERS = "Retry-After,X-Request-Id";
const MAX_AGE_SECONDS = "600";

export const parseOrigins = (value = "") =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, "").toLowerCase())
    .filter(Boolean);

let warnedOpen = false;

export const corsMiddleware = (req, res, next) => {
  const allowed = parseOrigins(process.env.ALLOWED_ORIGINS);
  const origin = req.get("origin");

  if (allowed.length === 0) {
    if (!warnedOpen) {
      warnedOpen = true;
      console.warn("ALLOWED_ORIGINS is not set: CORS allows any origin (*).");
    }
    res.set("Access-Control-Allow-Origin", "*");
  } else {
    res.vary("Origin");
    if (origin !== undefined) {
      if (!allowed.includes(origin.trim().replace(/\/+$/, "").toLowerCase())) {
        return res.status(403).json({ success: false, message: "Origin not allowed." });
      }
      res.set("Access-Control-Allow-Origin", origin);
    }
  }

  res.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    res.set("Access-Control-Max-Age", MAX_AGE_SECONDS);
    res.set("Content-Length", "0");
    return res.status(204).end();
  }

  return next();
};

export const warnIfCorsOpen = () => {
  if (parseOrigins(process.env.ALLOWED_ORIGINS).length === 0 && !warnedOpen) {
    warnedOpen = true;
    console.warn("ALLOWED_ORIGINS is not set: CORS allows any origin (*).");
  }
};
