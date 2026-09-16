export const config = {
  backendUrl: (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000").replace(/\/+$/, ""),
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
};
