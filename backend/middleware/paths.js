// Path patterns shared by middleware. Express routing is case-insensitive and
// ignores a trailing slash, so these are too.
export const WEBHOOK_PATH = /^\/(api\/)?webhooks\/contact-reply\/?$/i;
