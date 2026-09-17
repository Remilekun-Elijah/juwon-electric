"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { FlaskConical, Lock } from "lucide-react";
import { useMockedAreas } from "@/components/admin/AdminContext";
import { SampleBadge, SampleBanner } from "@/components/admin/website/shared";
import { Alert, Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { FEATURE_UNAVAILABLE_MESSAGE } from "@/lib/api/admin";
import type { Settings } from "@/lib/api/types";
import { getSettingsSection, type SettingsSectionId } from "./sections";
import { useSettings } from "./SettingsContext";
import type { SaveSection } from "./settingsLayout";
import { SettingsPills, SettingsRail } from "./SettingsNav";

export const LANDING_UNAVAILABLE = (
  <Alert tone="info" title="Website, financing and calculator settings aren’t available yet">
    <p>The server doesn’t return these settings yet. They’ll show here once it’s updated.</p>
  </Alert>
);

export const VIEW_ONLY = (
  <Alert tone="info" title="View only">
    Your role can view settings but not change them.
  </Alert>
);

/** Shared load error above loaded content (the same notices as AdminPage). */
export function SettingsLoadError({ error, onRetry, retrying }: { error: string; onRetry: () => void; retrying: boolean }) {
  if (!error) return null;
  if (error === FEATURE_UNAVAILABLE_MESSAGE) {
    return (
      <Alert tone="info" title="Not available yet">
        <p>
          {FEATURE_UNAVAILABLE_MESSAGE} This screen will work once the server is updated. Nothing here has been changed.
        </p>
      </Alert>
    );
  }
  return (
    <Alert tone="danger" title="Couldn’t load the latest data">
      <p>{error}</p>
      <Button variant="link" size="sm" className="mt-1 text-red-700" onClick={onRetry} disabled={retrying}>
        Try again
      </Button>
    </Alert>
  );
}

type SectionContext = { canWrite: boolean; save: SaveSection };

/**
 * One settings page: header (with the Sample badge while the section is sample), section navigation,
 * loading/error/permission states, then the section's form. The form is keyed by its saved values and the Discard
 * counter, so saving or discarding resets it.
 */
export function SettingsSectionPage({
  id,
  children,
}: {
  id: SettingsSectionId;
  children: (data: Settings, context: SectionContext) => ReactNode;
}) {
  const meta = getSettingsSection(id);
  const { settings, canRead, canWrite, save, resetKey } = useSettings();
  const mocked = useMockedAreas();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const data = settings.data;
  const available = data ? Boolean(data[id]) : true;
  const sample = Boolean(meta.landing && data && available && (data[id] as { sample?: boolean }).sample);

  // Move focus to the page heading when a settings page opens, so screen readers announce the new section.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [id]);

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Settings</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-slate-900 focus:outline-hidden"
          >
            {meta.label}
          </h1>
          {sample && <SampleBadge />}
        </div>
      <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
      </header>

      {!canRead ? (
        <EmptyState
          standalone
          icon={Lock}
          title="You don’t have access to this page"
          description="Your role doesn’t include this area. Ask an administrator if you need it."
        />
      ) : (
        <>
          {mocked.includes("settings") && (
            <Alert tone="warning" icon={FlaskConical} title="Preview data">
              <p>
                The server doesn’t support this screen yet, so it shows sample data. Changes you make here aren’t saved
                and disappear when you reload.
              </p>
            </Alert>
          )}
          <SettingsPills active={id} />
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
            <SettingsRail active={id} />
            <div className="min-w-0 space-y-6">
              {settings.initialLoading ? (
                <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
                  {[40, 56].map((height, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-elev-1 sm:p-6">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
                      <Skeleton className="mt-5 w-full" style={{ height: height * 2 }} />
                    </div>
                  ))}
                </div>
              ) : !data ? (
                <ErrorState
                  standalone
                  title="Settings couldn’t be loaded"
                  description={settings.error}
                  onRetry={settings.reload}
                  retrying={settings.loading}
                />
              ) : (
                <>
                  <SettingsLoadError error={settings.error} onRetry={settings.reload} retrying={settings.loading} />
                  {!canWrite && VIEW_ONLY}
                  {!available ? (
                    LANDING_UNAVAILABLE
                  ) : (
                    <>
                      {sample && <SampleBanner />}
                      <Fragment key={`${JSON.stringify(data[id])}|${resetKey}`}>{children(data, { canWrite, save })}</Fragment>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
