// Path patterns shared by middleware. Express routing is case-insensitive and
// ignores a trailing slash, so these are too.
export const WEBHOOK_PATH = /^\/(api\/)?webhooks\/contact-reply\/?$/i;
// Image uploads send raw image bytes (UPLOADS_V1 §2).
export const UPLOAD_PATH = /^\/(api\/)?admin\/uploads\/?$/i;
