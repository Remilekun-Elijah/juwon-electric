"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { SampleBadge } from "@/components/admin/website/shared";
import { Badge, ErrorState, Skeleton } from "@/components/ui";
import { formatDateTime } from "@/lib/admin/format";
import type { Settings } from "@/lib/api/types";
import { hasSection, sectionSummary, settingsGroups, settingsSections, type SettingsSectionMeta } from "./sections";
import { useSettings } from "./SettingsContext";
import { VIEW_ONLY } from "./SettingsSectionPage";

const gridClasses = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

function SectionCardLink({ section, data, canWrite }: { section: SettingsSectionMeta; data: Settings; canWrite: boolean }) {
  const Icon = section.icon;
  const available = hasSection(data, section.id);
  const sample = Boolean(section.landing && available && (data[section.id] as { sample?: boolean }).sample);

  return (
    <li className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-elev-1 transition-shadow focus-within:ring-2 focus-within:ring-brand-500 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{section.label}</h3>
            {sample && <SampleBadge />}
            {!available && <Badge tone="neutral">Not available yet</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{section.description}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">
        {available ? sectionSummary(data, section.id) : "The server doesn’t return these settings yet."}
      </p>
      <Link
        href={section.href}
        className="mt-3 inline-flex min-h-11 items-center gap-1 self-start text-xs font-semibold text-brand-700 transition-colors after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:text-brand-800 focus-visible:outline-hidden sm:min-h-0"
      >
        {canWrite && available ? "Edit" : "View"} {section.label.toLowerCase()}
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </li>
  );
}

/** /admin/settings: every settings section as a card, grouped, with a live summary of what's set. */
export function SettingsOverview() {
  const { settings, canWrite } = useSettings();
  const data = settings.data;

  return (
    <AdminPage
      module="settings"
      previewAreas={["settings"]}
      error={data ? settings.error : ""}
      onRetry={settings.reload}
      retrying={settings.loading}
    >
      {settings.initialLoading ? (
        <div className="space-y-8" aria-busy="true" aria-label="Loading settings">
          {[1, 2].map((group) => (
            <div key={group} className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className={gridClasses}>
                {[1, 2].map((card) => (
                  <div key={card} className="rounded-xl border border-slate-200 bg-white p-5 shadow-elev-1">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-4 w-48" />
                  </div>
                ))}
              </div>
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
        <div className="space-y-8">
          <p className="text-sm text-slate-500">
            {data.updatedAt
              ? `Last updated ${formatDateTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy.email}` : ""}.`
              : "Using the default settings. Nothing has been saved yet."}
          </p>
          {!canWrite && VIEW_ONLY}
          {settingsGroups.map((group) => {
            const headingId = `settings-group-${group.id}`;
            return (
              <section key={group.id} aria-labelledby={headingId} className="space-y-3">
                <h2 id={headingId} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </h2>
                <ul className={gridClasses}>
                  {settingsSections
                    .filter((section) => section.group === group.id)
                    .map((section) => (
                      <SectionCardLink key={section.id} section={section} data={data} canWrite={canWrite} />
                    ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
