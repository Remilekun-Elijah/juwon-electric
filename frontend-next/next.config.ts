import type { NextConfig } from "next";

// Baseline response headers for every route. No CSP yet: Turnstile, Quill (admin) and next/font need a reviewed policy.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Local images are optimised. CMS image URLs (any https host) are rendered with `unoptimized` by
    // components/public/SiteImage, so no remotePatterns allowlist is needed for them.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
