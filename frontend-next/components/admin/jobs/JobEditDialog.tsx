"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Dialog, Field, Input, Textarea } from "@/components/admin/kit";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/admin/format";
import { updateJob } from "@/lib/api/admin";
import type { InstallationJob, JobUpdateInput } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";
import { errorMessage, isValidationError } from "./jobUtils";

const MIN_DURATION = 15;
const MAX_DURATION = 10080;

type JobEditDialogProps = {
  open: boolean;
  job: InstallationJob;
  onClose: () => void;
  onSaved: (job: InstallationJob) => void;
};

/** Edit schedule, duration, address, notes and checklist (PUT /admin/jobs/:id). */
export function JobEditDialog({ open, job, onClose, onSaved }: JobEditDialogProps) {
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
type Errors = Partial<Record<"scheduledAt" | "duration" | "address" | "notes" | "checklist", string>>;

function JobEditForm({
  formId,
  job,
  onSaving,
  onSaved,
}: {
  formId: string;
  job: InstallationJob;
  onSaving: (saving: boolean) => void;
  onSaved: (job: InstallationJob) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(toDateTimeInput(job.scheduledAt));
  const [duration, setDuration] = useState(job.durationEstimateMinutes ? String(job.durationEstimateMinutes) : "");
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
    if (scheduledAt && !fromDateTimeInput(scheduledAt)) next.scheduledAt = "Scheduled time must be a valid date.";
    if (duration) {
      const minutes = Number(duration);
      if (!Number.isInteger(minutes) || minutes < MIN_DURATION || minutes > MAX_DURATION) {
        next.duration = `Enter a whole number of minutes from ${MIN_DURATION} to ${MAX_DURATION}.`;
      }
    }
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
      scheduledAt: scheduledAt ? fromDateTimeInput(scheduledAt) : null,
      durationEstimateMinutes: duration ? Number(duration) : null,
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
      if (isValidationError(error)) setFormError(errorMessage(error));
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scheduled time" error={errors.scheduledAt} helper="Leave empty if not scheduled yet.">
          <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
        </Field>
        <Field label="Estimated duration (minutes)" error={errors.duration}>
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={15}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
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
