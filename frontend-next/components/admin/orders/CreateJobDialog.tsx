"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { DurationPicker, durationError } from "@/components/admin/DurationPicker";
import { EngineerCrewPicker } from "@/components/admin/jobs/EngineerCrew";
import { Alert, Button, Dialog, Field, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/admin/format";
import { ApiError, createJob } from "@/lib/api/admin";
import type { AdminUser, JobCreateInput, Order } from "@/lib/api/types";
import { LIMITS, linesOf } from "@/lib/validation";

const FORM_ID = "create-installation-job";

/** Commerce v3 §1.2: the server refuses a second open job for an order with this message. */
export const ONE_JOB_MESSAGE = "This order already has an installation job.";

type Props = {
  open: boolean;
  order: Order;
  engineers: AdminUser[];
  engineersLoading?: boolean;
  engineersError?: string;
  onRetryEngineers?: () => void;
  onClose: () => void;
  onCreated: () => void;
  /** Called on a 409 (the order already has a job) so the order can be reloaded behind the dialog. */
  onConflict?: () => void;
};

type Errors = Partial<Record<"engineers" | "scheduledAt" | "duration" | "checklist" | "notes", string>>;

/** Small form that creates an installation job for an order (contract §7.2). */
export function CreateJobDialog({ open, order, onClose, ...rest }: Props) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Create installation job"
      description={`For the order from ${order.name || "this customer"}. You can change the details later on the installations page.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving} loadingText="Creating…">
            Create job
          </Button>
        </>
      }
    >
      {open && (
        <CreateJobForm
          key={order.id}
          order={order}
          {...rest}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </Dialog>
  );
}

type FormProps = Omit<Props, "open" | "onClose"> & {
  saving: boolean;
  setSaving: (saving: boolean) => void;
};

function CreateJobForm({
  order,
  engineers,
  engineersLoading,
  engineersError,
  onRetryEngineers,
  onCreated,
  onConflict,
  saving,
  setSaving,
}: FormProps) {
  // The order-level engineer starts as the lead (the server does the same when no crew is sent).
  const [engineerIds, setEngineerIds] = useState<string[]>(order.assignedEngineerId ? [order.assignedEngineerId] : []);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [checklist, setChecklist] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);

  const clearError = (key: keyof Errors) => setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));

  const validate = (): Errors => {
    const next: Errors = {};
    const tooShort = durationError(duration);
    if (tooShort) next.duration = tooShort;
    const items = linesOf(checklist);
    if (items.length > LIMITS.jobChecklistItems) next.checklist = `Add at most ${LIMITS.jobChecklistItems} checklist items.`;
    else if (items.some((item) => item.length > LIMITS.jobChecklistLabel)) {
      next.checklist = `Each checklist item must be ${LIMITS.jobChecklistLabel} characters or fewer.`;
    }
    if (notes.trim().length > LIMITS.jobNotes) next.notes = `Notes must be ${LIMITS.jobNotes} characters or fewer.`;
    return next;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    // Always send the crew (even empty) so the server doesn't fall back to the order-level engineer after a removal.
    const input: JobCreateInput = { orderId: order.id, engineerIds };
    if (scheduledAt) input.scheduledAt = scheduledAt;
    if (duration != null) input.durationEstimateMinutes = duration;
    const items = linesOf(checklist);
    if (items.length) input.checklist = items;
    if (notes.trim()) input.notes = notes.trim();

    setSaving(true);
    try {
      await createJob(input, order);
      toast.success("Installation job created");
      onCreated();
    } catch (error) {
      const message = errorMessage(error);
      if (error instanceof ApiError && error.status === 409 && /already has an installation job/i.test(message)) {
        setConflict(true);
        onConflict?.();
      } else if (error instanceof ApiError && error.status === 400 && /engineer/i.test(message)) {
        setErrors({ engineers: message });
      } else if (error instanceof ApiError && error.status === 400 && /scheduled/i.test(message)) {
        setErrors({ scheduledAt: message });
      } else if (error instanceof ApiError && error.status === 400 && /duration/i.test(message)) {
        setErrors({ duration: message });
      } else {
        setFormError(message);
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-4" aria-busy={saving}>
      {conflict && (
        <Alert tone="warning" title={ONE_JOB_MESSAGE} onDismiss={() => setConflict(false)}>
          <p>Someone created it while this form was open. Close this form to see the job on the order.</p>
        </Alert>
      )}

      {formError && (
        <Alert tone="danger" title="Couldn’t create the job" onDismiss={() => setFormError("")}>
          <p>{formError}</p>
        </Alert>
      )}

      <Field
        label="Engineers"
        helper={
          engineersError && !engineers.length
            ? `Couldn’t load engineers. ${engineersError}`
            : "Optional. The first engineer is the lead. Only active engineers are listed."
        }
        error={errors.engineers}
      >
        <EngineerCrewPicker
          value={engineerIds}
          engineers={engineers}
          loading={engineersLoading}
          error={engineersError}
          onRetry={onRetryEngineers}
          disabled={saving}
          onChange={(next) => {
            setEngineerIds(next);
            clearError("engineers");
          }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scheduled for" helper="Lagos time. Leave empty if not scheduled yet." error={errors.scheduledAt}>
          <DateTimePicker
            value={scheduledAt}
            disabled={saving}
            onChange={(next) => {
              setScheduledAt(next);
              clearError("scheduledAt");
            }}
          />
        </Field>

        <Field label="Estimated duration" error={errors.duration}>
          <DurationPicker
            value={duration}
            disabled={saving}
            onChange={(next) => {
              setDuration(next);
              clearError("duration");
            }}
          />
        </Field>
      </div>

      <Field label="Checklist" helper="One task per line." error={errors.checklist}>
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={4}
            value={checklist}
            disabled={saving}
            onChange={(event) => setChecklist(event.target.value)}
          />
        )}
      </Field>

      <Field label="Notes for the engineer" error={errors.notes}>
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={3}
            maxLength={LIMITS.jobNotes}
            value={notes}
            disabled={saving}
            onChange={(event) => setNotes(event.target.value)}
          />
        )}
      </Field>
    </form>
  );
}
