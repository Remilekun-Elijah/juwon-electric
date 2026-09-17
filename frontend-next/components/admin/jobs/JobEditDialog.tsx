"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { DurationPicker, durationError } from "@/components/admin/DurationPicker";
import { Alert, Button, Dialog, Field, Input, Textarea } from "@/components/ui";
import { updateJob } from "@/lib/api/admin";
import type { AdminUser, InstallationJob, JobUpdateInput } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";
import { EngineerCrewPicker } from "./EngineerCrew";
import { errorMessage, isValidationError, jobCrew, jobEngineerIds } from "./jobUtils";

type JobEditDialogProps = {
  open: boolean;
  job: InstallationJob;
  /** Active engineers for the crew picker. */
  engineers: AdminUser[];
  engineersLoading?: boolean;
  engineersError?: string;
  onClose: () => void;
  onSaved: (job: InstallationJob) => void;
};

/** Edit crew, schedule, duration, address, notes and checklist (PUT /admin/jobs/:id). */
export function JobEditDialog({ open, job, engineers, engineersLoading, engineersError, onClose, onSaved }: JobEditDialogProps) {
  const formId = `job-edit-${useId().replace(/:/g, "")}`;
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      size="lg"
      title="Edit job"
      description="Existing checklist items keep their done state."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
            Save changes
          </Button>
        </>
      }
    >
      {open && (
        <JobEditForm
          key={job.updatedAt}
          formId={formId}
          job={job}
          engineers={engineers}
          engineersLoading={engineersLoading}
          engineersError={engineersError}
          onSaving={setSaving}
          onSaved={(updated) => {
            onSaved(updated);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

type ChecklistRow = { key: string; id?: string; label: string };
type Errors = Partial<Record<"engineers" | "scheduledAt" | "duration" | "address" | "notes" | "checklist", string>>;

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item, index) => item === b[index]);

function JobEditForm({
  formId,
  job,
  engineers,
  engineersLoading,
  engineersError,
  onSaving,
  onSaved,
}: {
  formId: string;
  job: InstallationJob;
  engineers: AdminUser[];
  engineersLoading?: boolean;
  engineersError?: string;
  onSaving: (saving: boolean) => void;
  onSaved: (job: InstallationJob) => void;
}) {
  // Commerce v3 §1.2: only open, not-started jobs can change engineers.
  const canChangeCrew = job.status === "unassigned" || job.status === "assigned";
  const initialCrew = jobEngineerIds(job);
  const [engineerIds, setEngineerIds] = useState<string[]>(initialCrew);
  const [scheduledAt, setScheduledAt] = useState<string | null>(job.scheduledAt);
  const [duration, setDuration] = useState<number | null>(job.durationEstimateMinutes);
  const [address, setAddress] = useState(job.address ?? "");
  const [notes, setNotes] = useState(job.notes ?? "");
  const [rows, setRows] = useState<ChecklistRow[]>(() =>
    job.checklist.map((item) => ({ key: item.id, id: item.id, label: item.label }))
  );
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const nextKey = useRef(0);

  const addRow = () => {
    nextKey.current += 1;
    setRows((current) => [...current, { key: `new-${nextKey.current}`, label: "" }]);
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const tooShort = durationError(duration);
    if (tooShort) next.duration = tooShort;
    if (address.trim().length > LIMITS.deliveryAddress) {
      next.address = `Address must be ${LIMITS.deliveryAddress} characters or fewer.`;
    }
    if (notes.trim().length > LIMITS.jobNotes) next.notes = `Notes must be ${LIMITS.jobNotes} characters or fewer.`;
    const labels = rows.filter((row) => row.label.trim());
    if (labels.length > LIMITS.jobChecklistItems) {
      next.checklist = `A checklist can have up to ${LIMITS.jobChecklistItems} items.`;
    } else if (labels.some((row) => row.label.trim().length > LIMITS.jobChecklistLabel)) {
      next.checklist = `Each checklist item must be ${LIMITS.jobChecklistLabel} characters or fewer.`;
    }
    return next;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: JobUpdateInput = {
      // Sent only when changed, so saving other details on a started job isn't refused.
      ...(canChangeCrew && !sameList(engineerIds, initialCrew) ? { engineerIds } : {}),
      scheduledAt,
      durationEstimateMinutes: duration,
      address: address.trim() || null,
      notes: notes.trim() || null,
      checklist: rows
        .filter((row) => row.label.trim())
        .map((row) => (row.id ? { id: row.id, label: row.label.trim() } : row.label.trim())),
    };

    onSaving(true);
    try {
      const updated = await updateJob(job.id, input);
      toast.success("Job updated.");
      onSaved(updated);
    } catch (error) {
      const message = errorMessage(error);
      if (isValidationError(error) && /engineer/i.test(message)) setErrors({ engineers: message });
      else if (isValidationError(error)) setFormError(message);
      else toast.error(errorMessage(error));
    } finally {
      onSaving(false);
    }
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-4">
      {formError && (
        <Alert tone="danger" onDismiss={() => setFormError("")}>
          {formError}
        </Alert>
      )}

      <Field
        label="Engineers"
        error={errors.engineers}
        helper={
          canChangeCrew
            ? engineersError && !engineers.length
              ? `Couldn’t load engineers. ${engineersError}`
              : "The first engineer is the lead. Leave empty to unassign."
            : "Engineers can’t be changed once the job has started."
        }
      >
        {canChangeCrew ? (
          <EngineerCrewPicker
            value={engineerIds}
            engineers={engineers}
            known={jobCrew(job)}
            loading={engineersLoading}
            error={engineersError}
            onChange={(next) => {
              setEngineerIds(next);
              setErrors((current) => ({ ...current, engineers: undefined }));
            }}
          />
        ) : (
          <p className="text-sm text-slate-700">{jobCrew(job).map((person) => person.name).join(", ") || "Unassigned"}</p>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scheduled time" error={errors.scheduledAt} helper="Lagos time. Leave empty if not scheduled yet.">
          <DateTimePicker
            value={scheduledAt}
            onChange={(next) => {
              setScheduledAt(next);
              setErrors((current) => ({ ...current, scheduledAt: undefined }));
            }}
          />
        </Field>
        <Field label="Estimated duration" error={errors.duration}>
          <DurationPicker
            value={duration}
            onChange={(next) => {
              setDuration(next);
              setErrors((current) => ({ ...current, duration: undefined }));
            }}
          />
        </Field>
      </div>

      <Field label="Address" error={errors.address} helper="Defaults to the order’s delivery address.">
        <Textarea
          rows={2}
          className="min-h-[72px]"
          value={address}
          maxLength={LIMITS.deliveryAddress}
          placeholder={job.order?.deliveryAddress || ""}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Field>

      <Field label="Admin notes" error={errors.notes} helper={`${notes.length}/${LIMITS.jobNotes}. Engineers can read these.`}>
        <Textarea value={notes} maxLength={LIMITS.jobNotes} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Checklist</legend>
        {rows.length === 0 && <p className="text-sm text-slate-500">No checklist items.</p>}
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.key} className="flex items-start gap-2">
              <Field label={`Checklist item ${index + 1}`} labelClassName="sr-only" className="flex-1 space-y-0">
                <Input
                  value={row.label}
                  maxLength={LIMITS.jobChecklistLabel}
                  placeholder="For example: Test inverter output"
                  onChange={(event) => {
                    const label = event.target.value;
                    setRows((current) => current.map((item) => (item.key === row.key ? { ...item, label } : item)));
                  }}
                />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove checklist item ${index + 1}`}
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        {errors.checklist && <p className="text-sm text-red-600">{errors.checklist}</p>}
        <Button
          variant="outline"
          size="sm"
          icon={<Plus aria-hidden="true" />}
          onClick={addRow}
          disabled={rows.length >= LIMITS.jobChecklistItems}
        >
          Add item
        </Button>
        <p className="text-xs text-slate-500">Empty items are removed when you save.</p>
      </fieldset>
    </form>
  );
}
