// Security headers for every API response (including errors, 404 and OPTIONS).
const ADMIN_PATH = /^\/(api\/)?admin(\/|$)/i;

export const securityHeaders = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    // CORP only applies to no-cors loads (img/script); the frontend's CORS
    // fetches are unaffected.
    "Cross-Origin-Resource-Policy": "same-site",
  });
  if (req.secure) {
    res.set("Strict-Transport-Security", "max-age=31536000");
  }
  // Express routing is case-insensitive, so this match must be too.
  if (ADMIN_PATH.test(req.path || "")) {
    res.set("Cache-Control", "no-store");
  }
  next();
};
