"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, Pencil, Trash2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import { Button, ConfirmDialog, Drawer, Field } from "@/components/ui";
import { JobStatusBadge } from "@/components/admin/orders/orderStatus";
import { formatDateTime } from "@/lib/admin/format";
import { formatDuration } from "@/lib/admin/lagosTime";
import { JOB_TRANSITIONS } from "@/lib/admin/transitions";
import { assignJob, deleteJob, setJobStatus } from "@/lib/api/admin";
import type { AdminUser, InstallationJob, JobStatus } from "@/lib/api/types";
import { ChecklistProgress } from "./ChecklistProgress";
import { CrewList, EngineerCrewPicker } from "./EngineerCrew";
import { JobEditDialog } from "./JobEditDialog";
import { errorMessage, isClosedJob, jobAddress, jobCrew, jobEngineerIds, mapsUrl, telHref } from "./jobUtils";

const statusActionLabels: Partial<Record<JobStatus, string>> = {
  in_progress: "Mark in progress",
  completed: "Mark completed",
  cancelled: "Cancel job",
};

const DELETABLE: JobStatus[] = ["unassigned", "assigned", "cancelled"];

type JobDrawerProps = {
  job: InstallationJob | null;
  open: boolean;
  onClose: () => void;
  engineers: AdminUser[];
  engineersLoading?: boolean;
  engineersError?: string;
  onChanged: (job: InstallationJob) => void;
  onDeleted: (jobId: string) => void;
};

/** Job details and admin actions (assign, status, edit, delete). */
export function JobDrawer({ job, open, onClose, ...rest }: JobDrawerProps) {
  return (
    <Drawer
      open={open && Boolean(job)}
      onClose={onClose}
      size="lg"
      title={job?.order?.name || "Installation job"}
      description={job ? (job.scheduledAt ? `Scheduled ${formatDateTime(job.scheduledAt)}` : "Not scheduled yet") : undefined}
    >
      {job && (
        // Remount after each save so drafts (like the crew) start from the saved job.
        <JobDetails key={`${job.id}:${job.updatedAt}`} job={job} {...rest} />
      )}
    </Drawer>
  );
}

type JobDetailsProps = Omit<JobDrawerProps, "open" | "onClose"> & { job: InstallationJob };

function JobDetails({ job, engineers, engineersLoading, engineersError, onChanged, onDeleted }: JobDetailsProps) {
  const { can } = useAdmin();
  const canAssign = can("jobs:assign");
  const closed = isClosedJob(job.status);
  const [busy, setBusy] = useState("");
  const currentCrew = jobEngineerIds(job);
  const crew = jobCrew(job);
  const [crewDraft, setCrewDraft] = useState<string[]>(currentCrew);
  const crewChanged = crewDraft.length !== currentCrew.length || crewDraft.some((item, index) => item !== currentCrew[index]);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const address = jobAddress(job);
  const phone = job.order?.phoneNumber;
  const nextStatuses = JOB_TRANSITIONS[job.status].filter((status) => status !== "assigned" && status !== "unassigned");
  const canChangeEngineer = job.status === "unassigned" || job.status === "assigned";

  const run = async (key: string, action: () => Promise<InstallationJob>, success: string) => {
    setBusy(key);
    try {
      const updated = await action();
      onChanged(updated);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy("");
    }
  };

  const saveCrew = () =>
    run(
      "assign",
      () => assignJob(job.id, crewDraft),
      crewDraft.length ? (currentCrew.length ? "Engineers updated." : "Job assigned.") : "Job unassigned."
    );

  const changeStatus = async (status: JobStatus) => {
    await run(`status-${status}`, () => setJobStatus(job.id, status), "Job status updated.");
    if (status === "cancelled") setConfirmCancel(false);
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await deleteJob(job.id);
      toast.success("Job deleted.");
      setConfirmDelete(false);
      onDeleted(job.id);
    } catch (error) {
      setConfirmDelete(false);
      toast.error(errorMessage(error));
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <JobStatusBadge status={job.status} />
        {closed && <span className="text-sm text-slate-500">This job is closed and can’t be changed.</span>}
      </div>

      <section aria-labelledby="job-details-heading">
        <h3 id="job-details-heading" className="text-sm font-semibold text-slate-900">
          Details
        </h3>
        <DetailList
          items={[
            {
              label: "Order",
              value: (
                <Link
                  href={`/admin/orders?order=${encodeURIComponent(job.orderId)}`}
                  className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                >
                  View order<span className="sr-only"> {job.orderId}</span>
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              ),
            },
            { label: "Customer", value: job.order?.name || "—" },
            {
              label: "Phone",
              value: phone ? (
                <a href={telHref(phone)} className="text-brand-700 hover:underline">
                  {phone}
                </a>
              ) : (
                "No phone"
              ),
            },
            { label: crew.length > 1 ? `Engineers (${crew.length})` : "Engineer", full: true, value: <CrewList crew={crew} /> },
            { label: "Scheduled", value: job.scheduledAt ? formatDateTime(job.scheduledAt) : "Not scheduled" },
            {
              label: "Estimated duration",
              value: formatDuration(job.durationEstimateMinutes) || "—",
            },
            {
              label: "Address",
              full: true,
              value: address ? (
                <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                  {address}
                </a>
              ) : (
                "—"
              ),
            },
            ...(job.startedAt ? [{ label: "Started", value: formatDateTime(job.startedAt) }] : []),
            ...(job.completedAt ? [{ label: "Completed", value: formatDateTime(job.completedAt) }] : []),
            ...(job.cancelledAt ? [{ label: "Cancelled", value: formatDateTime(job.cancelledAt) }] : []),
            { label: "Admin notes", full: true, value: <span className="whitespace-pre-line">{job.notes || "—"}</span> },
            {
              label: "Completion notes",
              full: true,
              value: <span className="whitespace-pre-line">{job.completionNotes || "—"}</span>,
            },
          ]}
        />
      </section>

      <section aria-labelledby="job-checklist-heading" className="space-y-3">
        <h3 id="job-checklist-heading" className="text-sm font-semibold text-slate-900">
          Checklist
        </h3>
        <ChecklistProgress job={job} />
        {job.checklist.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {job.checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                <span className={item.done ? "text-slate-500 line-through" : "text-slate-700"}>
                  {item.label}
                  <span className="sr-only">{item.done ? " (done)" : " (not done)"}</span>
                </span>
                {item.done && item.doneAt && (
                  <span className="ml-auto shrink-0 text-xs text-slate-400">{formatDateTime(item.doneAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="job-photos-heading" className="space-y-2">
        <h3 id="job-photos-heading" className="text-sm font-semibold text-slate-900">
          Photos
        </h3>
        {job.photos.length ? (
          <ul className="space-y-1.5">
            {job.photos.map((photo, index) => (
              <li key={`${photo}-${index}`} className="min-w-0">
                <a
                  href={photo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-sm text-brand-700 hover:underline"
                >
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Photo {index + 1}</span>
                  <span className="sr-only">: {photo}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No photos yet.</p>
        )}
      </section>

      {canAssign && !closed && (
        <section aria-labelledby="job-actions-heading" className="space-y-4 border-t border-slate-200 pt-5">
          <h3 id="job-actions-heading" className="text-sm font-semibold text-slate-900">
            Manage job
          </h3>

          {canChangeEngineer && (
            <div className="space-y-2">
              <Field
                label="Engineers"
                helper={
                  engineersError && !engineers.length
                    ? `Couldn’t load engineers. ${engineersError}`
                    : "The first engineer is the lead. Remove everyone to unassign."
                }
              >
                <EngineerCrewPicker
                  value={crewDraft}
                  engineers={engineers}
                  known={crew}
                  loading={engineersLoading}
                  error={engineersError}
                  disabled={Boolean(busy)}
                  onChange={setCrewDraft}
                />
              </Field>
              {crewChanged && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<Users aria-hidden="true" />}
                    onClick={saveCrew}
                    disabled={Boolean(busy)}
                    loading={busy === "assign"}
                    loadingText="Saving…"
                  >
                    {crewDraft.length ? "Save engineers" : "Unassign job"}
                  </Button>
                  <Button variant="ghost" onClick={() => setCrewDraft(currentCrew)} disabled={Boolean(busy)}>
                    Undo changes
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) =>
              status === "cancelled" ? (
                <Button
                  key={status}
                  variant="soft-danger"
                  icon={<XCircle aria-hidden="true" />}
                  onClick={() => setConfirmCancel(true)}
                  disabled={Boolean(busy)}
                >
                  {statusActionLabels[status]}
                </Button>
              ) : (
                <Button
                  key={status}
                  variant="secondary"
                  onClick={() => changeStatus(status)}
                  disabled={Boolean(busy)}
                  loading={busy === `status-${status}`}
                >
                  {statusActionLabels[status] ?? status}
                </Button>
              )
            )}
            <Button
              variant="outline"
              icon={<Pencil aria-hidden="true" />}
              onClick={() => setEditing(true)}
              disabled={Boolean(busy)}
            >
              Edit details
            </Button>
          </div>
        </section>
      )}

      {canAssign && DELETABLE.includes(job.status) && (
        <div className="border-t border-slate-200 pt-5">
          <Button
            variant="ghost"
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
            icon={<Trash2 aria-hidden="true" />}
            onClick={() => setConfirmDelete(true)}
            disabled={Boolean(busy)}
          >
            Delete job
          </Button>
        </div>
      )}

      {canAssign && !closed && (
        <JobEditDialog
          open={editing}
          job={job}
          engineers={engineers}
          engineersLoading={engineersLoading}
          engineersError={engineersError}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => changeStatus("cancelled")}
        loading={busy === "status-cancelled"}
        loadingText="Cancelling…"
        title="Cancel this job?"
        description={`The installation for “${job.order?.name || "this customer"}” will be cancelled and can’t be reopened.`}
        confirmLabel="Cancel job"
        cancelLabel="Keep job"
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={busy === "delete"}
        loadingText="Deleting…"
        title="Delete job"
        description={`Are you sure you want to delete the installation job for “${job.order?.name || "this customer"}”? This can’t be undone.`}
        confirmLabel="Delete job"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </>
  );
}
