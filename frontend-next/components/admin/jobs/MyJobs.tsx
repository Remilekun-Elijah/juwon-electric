"use client";

import { useState } from "react";
import { HardHat } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { Button, Drawer, EmptyState, ErrorState, Skeleton } from "@/components/admin/kit";
import { getMyJobs } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import type { InstallationJob, Paged } from "@/lib/api/types";
import { MyJobCard } from "./MyJobCard";
import { MyJobDetail } from "./MyJobDetail";
import { relativeSchedule } from "./jobUtils";

const PAGE_SIZE = 20;

type Filter = "active" | "completed";

const filters: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

/** Engineer's own jobs, mobile first (contract §7.3). */
export function MyJobs() {
  const [filter, setFilter] = useState<Filter>("active");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InstallationJob | null>(null);
  const [open, setOpen] = useState(false);

  const query = { status: filter === "completed" ? ("completed" as const) : ("" as const), page, limit: PAGE_SIZE };
  const jobs = useAdminQuery(`my-jobs|${filter}|${page}`, () => getMyJobs(query));
  const items = jobs.data?.items ?? [];
  const total = jobs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openJob = (job: InstallationJob) => {
    setSelected(job);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    jobs.reload();
  };

  const handleChanged = (job: InstallationJob) => {
    setSelected(job);
    jobs.setData(
      (current: Paged<InstallationJob> | undefined) =>
        current && { ...current, items: current.items.map((item) => (item.id === job.id ? job : item)) }
    );
  };

  const renderList = () => {
    if (jobs.initialLoading) {
      return (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (!jobs.data && jobs.error) {
      return (
        <ErrorState
          title="Your jobs couldn’t be loaded"
          description={jobs.error}
          onRetry={jobs.reload}
          retrying={jobs.loading}
        />
      );
    }

    if (!items.length) {
      return (
        <EmptyState
          standalone
          icon={HardHat}
          title={filter === "active" ? "No active jobs" : "No completed jobs yet"}
          description={
            filter === "active"
              ? "Jobs assigned to you will show up here."
              : "Jobs you complete will be listed here."
          }
        />
      );
    }

    return (
      <ul className="space-y-3">
        {items.map((job) => (
          <li key={job.id}>
            <MyJobCard job={job} onOpen={() => openJob(job)} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <AdminPage
      module="my-jobs"
      previewAreas={["my-jobs"]}
      error={jobs.data ? jobs.error : ""}
      onRetry={jobs.reload}
      retrying={jobs.loading}
    >
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div
          role="group"
          aria-label="Show jobs"
          className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
        >
          {filters.map((option) => {
            const active = option.value === filter;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(option.value);
                  setPage(1);
                }}
                className={cn(
                  "min-h-11 rounded-lg px-3 text-base font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500",
                  active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {renderList()}

        {jobs.data && total > PAGE_SIZE && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            <Button variant="outline" size="lg" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm tabular-nums text-slate-500">
              Page {page} of {pages}
            </span>
            <Button variant="outline" size="lg" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </div>

      <Drawer
        open={open && Boolean(selected)}
        onClose={close}
        size="lg"
        title={selected?.order?.name || "Job"}
        description={selected ? relativeSchedule(selected.scheduledAt) : undefined}
        bodyClassName="px-4 sm:px-6"
      >
        {selected && <MyJobDetail key={selected.id} initialJob={selected} onChanged={handleChanged} />}
      </Drawer>
    </AdminPage>
  );
}
