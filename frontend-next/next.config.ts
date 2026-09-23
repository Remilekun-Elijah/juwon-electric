import type { NextConfig } from "next";

// The backend API origin allowed by connect-src. Derived from NEXT_PUBLIC_BACKEND_URL at
// config-eval (build) time; when it is unset or unparseable we fall back to allowing any
// https: connection so a missing build env cannot break the storefront's API calls.
const backendConnectSrc = (() => {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!raw) return "https:";
  try {
    return new URL(raw).origin;
  } catch {
    return "https:";
  }
})();

// This CSP is intentionally permissive on script-src ('unsafe-inline'): a nonce/hash-based
// strict policy can break Next.js hydration and next/font, so tightening script-src is a
// separate task and explicitly out of scope here. img-src stays broad (data: https:) because
// CMS/admin images can point at any https host.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  `connect-src 'self' https://challenges.cloudflare.com ${backendConnectSrc}`,
].join("; ");

// Baseline response headers for every route.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/**
 * The seeded photos used to ship as SVG files with the picture embedded as base64 (21.5 MB in all, in every build).
 * They are now plain .jpg/.png (2.3 MB). Saved records still point at the old `.svg` names, so those keep resolving.
 */
const legacyImageRewrites = [
  { source: "/cartImage.svg", destination: "/cartImage.png" },
  { source: "/contactBackground.svg", destination: "/contactBackground.jpg" },
  { source: "/engineer.svg", destination: "/engineer.jpg" },
  { source: "/header.svg", destination: "/header.jpg" },
  { source: "/image-1.svg", destination: "/image-1.jpg" },
  { source: "/image-2.svg", destination: "/image-2.jpg" },
  { source: "/image-3.svg", destination: "/image-3.jpg" },
  { source: "/image-4.svg", destination: "/image-4.jpg" },
  { source: "/image-5.svg", destination: "/image-5.jpg" },
  { source: "/image-6.svg", destination: "/image-6.jpg" },
  { source: "/image-7.svg", destination: "/image-7.jpg" },
  { source: "/image-8.svg", destination: "/image-8.jpg" },
  { source: "/offer-2.svg", destination: "/offer-2.png" },
  { source: "/person-2.svg", destination: "/person-2.jpg" },
  { source: "/person-4.svg", destination: "/person-4.jpg" },
  { source: "/portfolio-11.svg", destination: "/portfolio-11.jpg" },
  { source: "/portfolio-12.svg", destination: "/portfolio-12.jpg" },
  { source: "/portfolio-5.svg", destination: "/portfolio-5.jpg" },
  { source: "/portfolio-6.svg", destination: "/portfolio-6.jpg" },
  { source: "/portfolio-7.svg", destination: "/portfolio-7.jpg" },
  { source: "/portfolio-8.svg", destination: "/portfolio-8.jpg" },
  { source: "/portfolio-9.svg", destination: "/portfolio-9.jpg" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev server only: extra hostnames allowed to load dev assets, comma-separated in DEV_ALLOWED_ORIGINS. Set it to this
  // machine's network IP (e.g. DEV_ALLOWED_ORIGINS=192.168.1.20) to test on a phone; without it only localhost works.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  images: {
    // Local images are optimised. CMS image URLs (any https host) are rendered with `unoptimized` by
    // components/public/SiteImage, so no remotePatterns allowlist is needed for them.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return legacyImageRewrites;
  },
};

export default nextConfig;
