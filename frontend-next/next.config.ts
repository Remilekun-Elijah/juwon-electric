import type { NextConfig } from "next";

// Baseline response headers for every route. No CSP yet: Turnstile, Quill (admin) and next/font need a reviewed policy.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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
