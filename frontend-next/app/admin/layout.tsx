import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Juwon Electric admin" },
  robots: { index: false, follow: false },
};

/** Everything under /admin is client-rendered behind the session check in AdminApp. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="font-sans antialiased">
      <AdminApp>{children}</AdminApp>
    </div>
  );
}
