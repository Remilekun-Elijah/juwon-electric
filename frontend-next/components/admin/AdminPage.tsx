"use client";

import type { ReactNode } from "react";
import { FlaskConical, Lock } from "lucide-react";
import { Alert, Button, EmptyState, PageHeader } from "@/components/ui";
import type { Capability } from "@/lib/admin/capabilities";
import { FEATURE_UNAVAILABLE_MESSAGE } from "@/lib/api/admin";
import { getModule, type ModuleId } from "@/lib/admin/modules";
import { useAdmin, useMockedAreas } from "./AdminContext";

export type PreviewArea =
  | "orders"
  | "vacancies"
  | "catalog"
  | "inventory"
  | "jobs"
  | "my-jobs"
  | "users"
  | "staff"
  | "settings"
  | "notifications"
  | "dashboard";

type AdminPageProps = {
  module: ModuleId;
  /** Overrides the module's capability (for example a detail page that needs more). */
  capability?: Capability;
  actions?: ReactNode;
  /** Shared load error shown above the content, with a retry button. */
  error?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Mock areas this screen reads; a notice shows while any of them is served from preview data. */
  previewAreas?: PreviewArea[];
  title?: string;
  description?: string;
  children: ReactNode;
};

/** Page wrapper for every admin screen: header from the module registry, capability gate, preview notice, load error. */
export function AdminPage({
  module,
  capability,
  actions,
  error,
  onRetry,
  retrying,
  previewAreas = [],
  title,
  description,
  children,
}: AdminPageProps) {
  const meta = getModule(module);
  const { can } = useAdmin();
  const mocked = useMockedAreas();
  const allowed = can(capability ?? meta.capability);
  const previewing = previewAreas.some((area) => mocked.includes(area));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={meta.eyebrow}
        title={title ?? meta.title}
        description={description ?? meta.description}
        actions={allowed ? actions : undefined}
      />
      {!allowed ? (
        <EmptyState
          standalone
          icon={Lock}
          title="You don’t have access to this page"
          description="Your role doesn’t include this area. Ask an administrator if you need it."
        />
      ) : (
        <>
          {previewing && (
            <Alert tone="warning" icon={FlaskConical} title="Preview data">
              <p>
                The server doesn’t support this screen yet, so it shows sample data. Changes you make here aren’t saved
                and disappear when you reload.
              </p>
            </Alert>
          )}
          {error === FEATURE_UNAVAILABLE_MESSAGE ? (
            <Alert tone="info" title="Not available yet">
              <p>
                {FEATURE_UNAVAILABLE_MESSAGE} This screen will work once the server is updated. Nothing here has been
                changed.
              </p>
            </Alert>
          ) : error && (
            <Alert tone="danger" title="Couldn’t load the latest data">
              <p>{error}</p>
              {onRetry && (
                <Button variant="link" size="sm" className="mt-1 text-red-700" onClick={onRetry} disabled={retrying}>
                  Try again
                </Button>
              )}
            </Alert>
          )}
          {children}
        </>
      )}
    </div>
  );
}
