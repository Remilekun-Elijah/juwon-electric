"use client";

import { useEffect, useState } from "react";
import { ClipboardList, SearchX } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Button,
  ErrorState,
  Field,
  Input,
  ListCardHeader,
  Pagination,
  Select,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  type TabItem,
} from "@/components/ui";
import { JobStatusBadge } from "@/components/admin/orders/orderStatus";
import { formatDateTime } from "@/lib/admin/format";
import { jobStatusLabels } from "@/lib/admin/transitions";
import { getEngineers, getJob, getJobs } from "@/lib/api/admin";
import type { InstallationJob, JobStatus, Paged } from "@/lib/api/types";
import { ChecklistProgress } from "./ChecklistProgress";
import { CrewStack } from "./EngineerCrew";
import { JobDrawer } from "./JobDrawer";
import { dayBoundary, errorMessage, jobAddress, jobCrew } from "./jobUtils";

const PAGE_SIZE = 20;
const COLUMNS = 6;

type StatusFilter = "all" | JobStatus;

const STATUSES: JobStatus[] = ["unassigned", "assigned", "in_progress", "completed", "cancelled"];
const tabItems: TabItem<StatusFilter>[] = [
  { value: "all", label: "All" },
  ...STATUSES.map((status) => ({ value: status, label: jobStatusLabels[status] })),
];

const replaceJob = (job: InstallationJob) => (current: Paged<InstallationJob> | undefined) =>
  current && { ...current, items: current.items.map((item) => (item.id === job.id ? job : item)) };

export function Jobs() {
  const { can } = useAdmin();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [engineerId, setEngineerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InstallationJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = {
    status: status === "all" ? ("" as const) : status,
    engineerId,
    from: dayBoundary(from),
    to: dayBoundary(to, true),
    page,
    limit: PAGE_SIZE,
  };
  const jobs = useAdminQuery(`jobs|${JSON.stringify(query)}`, () => getJobs(query));
  const canReadStaff = can("staff:read");
  const engineers = useAdminQuery("engineers", getEngineers, { enabled: canReadStaff });

  // Deep link: /admin/installations?job=<id> (for example from an order) opens that job. Read after mount, as on Orders.
  useEffect(() => {
    const jobId = new URLSearchParams(window.location.search).get("job");
    if (!jobId) return undefined;
    let active = true;
    getJob(jobId).then(
      (job) => {
        if (!active) return;
        setSelected(job);
        setDrawerOpen(true);
      },
      (error: unknown) => {
        if (active) toast.error(errorMessage(error));
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const items = jobs.data?.items ?? [];
  const total = jobs.data?.total ?? 0;
  const filtersActive = status !== "all" || Boolean(engineerId || from || to);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus("all");
    setEngineerId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const openJob = (job: InstallationJob) => {
    setSelected(job);
    setDrawerOpen(true);
  };

  const handleChanged = (job: InstallationJob) => {
    setSelected(job);
    jobs.setData(replaceJob(job));
    jobs.reload();
  };

  const handleDeleted = () => {
    setDrawerOpen(false);
    jobs.reload();
  };

  const engineerOptions = [
    { value: "", label: "All engineers" },
    ...(engineers.data ?? []).map((engineer) => ({ value: engineer.id, label: engineer.name })),
  ];

  const renderRows = () => {
    if (jobs.initialLoading) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COLUMNS}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }

    if (!jobs.data && jobs.error) {
      return (
        <TableEmpty colSpan={COLUMNS}>
          <ErrorState
            title="Jobs couldn’t be loaded"
            description={jobs.error}
            onRetry={jobs.reload}
            retrying={jobs.loading}
          />
        </TableEmpty>
      );
    }

    if (!items.length) {
      return filtersActive ? (
        <TableEmpty
          colSpan={COLUMNS}
          icon={SearchX}
          title="No jobs match your filters"
          description="Try a different status, engineer or date range."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <TableEmpty
          colSpan={COLUMNS}
          icon={ClipboardList}
          title="No installation jobs yet"
          description="Jobs created from orders that need installation will show up here."
        />
      );
    }

    return items.map((job) => {
      const address = jobAddress(job);
      return (
        <TR
          key={job.id}
          interactive
          selected={drawerOpen && selected?.id === job.id}
          onClick={() => openJob(job)}
        >
          <TD className="whitespace-nowrap">
            {job.scheduledAt ? (
              <span className="text-slate-700">{formatDateTime(job.scheduledAt)}</span>
            ) : (
              <span className="text-slate-400">Not scheduled</span>
            )}
          </TD>
          <TD className="max-w-[260px]">
            <p className="truncate font-medium text-slate-900">{job.order?.name || "Customer"}</p>
            <p className="truncate text-sm text-slate-500">{address || "No address"}</p>
          </TD>
          <TD className="hidden whitespace-nowrap md:table-cell">
            <CrewStack crew={jobCrew(job)} />
          </TD>
          <TD className="hidden lg:table-cell">
            <ChecklistProgress job={job} compact />
          </TD>
          <TD>
            <JobStatusBadge status={job.status} />
          </TD>
          <TD align="right">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                openJob(job);
              }}
            >
              View<span className="sr-only"> job for {job.order?.name || "customer"}</span>
            </Button>
          </TD>
        </TR>
      );
    });
  };

  return (
    <AdminPage
      module="installations"
      previewAreas={["jobs"]}
      error={jobs.data ? jobs.error : ""}
      onRetry={jobs.reload}
      retrying={jobs.loading}
    >
      <Table
        aria-label="Installation jobs"
        header={
          <ListCardHeader title="All jobs" count={jobs.data ? total : undefined}>
            <div className="flex flex-col gap-3">
              <Tabs
                aria-label="Filter jobs by status"
                value={status}
                onChange={resetPage(setStatus)}
                items={tabItems}
                className="w-full sm:w-auto"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                {canReadStaff && (
                  <Field label="Engineer">
                    <Select
                      value={engineerId}
                      options={engineerOptions}
                      onChange={(event) => resetPage(setEngineerId)(event.target.value)}
                    />
                  </Field>
                )}
                <Field label="Scheduled from">
                  <Input type="date" value={from} max={to || undefined} onChange={(event) => resetPage(setFrom)(event.target.value)} />
                </Field>
                <Field label="Scheduled to">
                  <Input type="date" value={to} min={from || undefined} onChange={(event) => resetPage(setTo)(event.target.value)} />
                </Field>
                {filtersActive && (
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </ListCardHeader>
        }
        footer={
          jobs.data && (
            <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="jobs" />
          )
        }
      >
        <THead>
          <TH>Scheduled</TH>
          <TH>Customer</TH>
          <TH className="hidden md:table-cell">Engineer</TH>
          <TH className="hidden lg:table-cell">Checklist</TH>
          <TH>Status</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <JobDrawer
        job={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        engineers={engineers.data ?? []}
        engineersLoading={engineers.loading}
        engineersError={engineers.error}
        onChanged={handleChanged}
        onDeleted={handleDeleted}
      />
    </AdminPage>
  );
}
