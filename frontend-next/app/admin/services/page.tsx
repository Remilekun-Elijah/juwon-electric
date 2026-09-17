"use client";

import { ContentManager } from "@/components/admin/content/ContentManager";
import { CustomerSegments } from "@/components/admin/content/CustomerSegments";

export default function AdminServicesPage() {
  return (
    <ContentManager type="services">
      <CustomerSegments />
    </ContentManager>
  );
}
