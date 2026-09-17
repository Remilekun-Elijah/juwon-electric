import { UPLOAD_PATH, WEBHOOK_PATH } from "./paths.js";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

const hasBody = (req) =>
  req.headers["transfer-encoding"] !== undefined || Number(req.headers["content-length"]) > 0;

// POST/PUT/PATCH bodies must be JSON (charset parameters allowed). The inbound
// webhook is exempt: it verifies and parses the raw body itself. So is the image upload, which
// checks its own image Content-Type and reads the bytes with its own cap.
export const requireJsonBody = (req, res, next) => {
  if (!METHODS_WITH_BODY.has(req.method) || !hasBody(req) || WEBHOOK_PATH.test(req.path) || UPLOAD_PATH.test(req.path)) {
    return next();
  }
  const mediaType = String(req.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    return res
      .status(415)
      .json({ success: false, message: "Content-Type must be application/json." });
  }
  return next();
};
