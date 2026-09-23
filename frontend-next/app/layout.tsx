import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Manrope, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// Public body font (Vite App.css `body { font-family: "Inter" }`) and the `.inter-*` helpers.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
// `.sora-*` helpers (headings on the public site).
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
// `.manrope-*` helpers.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "600"], display: "swap" });
// Theme `font-sans`: the admin app sets it on its root (FE-2).
const plusJakartaSans = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta-sans", subsets: ["latin"], display: "swap" });
const jetBrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

const fontVariables = [inter, sora, manrope, plusJakartaSans, jetBrainsMono].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image", site: "@juwon_electric" },
};

export const viewport: Viewport = {
  themeColor: "#d42027",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
