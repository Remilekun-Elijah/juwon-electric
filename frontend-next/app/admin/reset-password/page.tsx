import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Reset password" };

export default function AdminResetPasswordPage() {
  return <AdminLogin initialMode="reset" />;
}
