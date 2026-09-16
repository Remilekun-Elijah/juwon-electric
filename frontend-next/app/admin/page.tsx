"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminContext";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { firstAllowedHref } from "@/lib/admin/modules";

export default function AdminDashboardPage() {
  const { can } = useAdmin();
  const router = useRouter();
  const allowed = can("dashboard:read");
  const landing = firstAllowedHref(can);

  // Roles without the dashboard (for example engineers) land on their first available screen instead.
  useEffect(() => {
    if (!allowed && landing !== "/admin") router.replace(landing);
  }, [allowed, landing, router]);

  return <Dashboard />;
}
