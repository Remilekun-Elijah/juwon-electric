"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from "@/components/admin/kit";
import { errorMessage, fromDateTimeInput } from "@/lib/admin/format";
import { ApiError, createJob } from "@/lib/api/admin";
import type { AdminUser, JobCreateInput, Order } from "@/lib/api/types";
import { LIMITS, linesOf } from "@/lib/validation";

const DURATION_MIN = 15;
const DURATION_MAX = 10080;
const FORM_ID = "create-installation-job";

type Props = {
  open: boolean;
  order: Order;
  engineers: AdminUser[];
  onClose: () => void;
  onCreated: () => void;
};

type Errors = Partial<Record<"scheduledAt" | "duration" | "checklist" | "notes", string>>;

/** Small form that creates an installation job for an order (contract §7.2). */
export function CreateJobDialog({ open, order, engineers, onClose, onCreated }: Props) {
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
          engineers={engineers}
          onCreated={onCreated}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </Dialog>
  );
}

type FormProps = Pick<Props, "order" | "engineers" | "onCreated"> & {
  saving: boolean;
  setSaving: (saving: boolean) => void;
};

function CreateJobForm({ order, engineers, onCreated, saving, setSaving }: FormProps) {
  const [engineerId, setEngineerId] = useState(order.assignedEngineerId || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("");
  const [checklist, setChecklist] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");

  const engineerOptions = [
    { value: "", label: "Assign later" },
    ...engineers.map((engineer) => ({ value: engineer.id, label: engineer.name || engineer.email })),
  ];

  const validate = (): Errors => {
    const next: Errors = {};
    if (scheduledAt && !fromDateTimeInput(scheduledAt)) next.scheduledAt = "Scheduled time must be a valid date.";
    if (duration.trim()) {
      const minutes = Number(duration);
      if (!Number.isInteger(minutes) || minutes < DURATION_MIN || minutes > DURATION_MAX) {
        next.duration = `Enter whole minutes between ${DURATION_MIN} and ${DURATION_MAX}.`;
      }
    }
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

    const input: JobCreateInput = { orderId: order.id };
    if (engineerId) input.engineerId = engineerId;
    const scheduled = fromDateTimeInput(scheduledAt);
    if (scheduled) input.scheduledAt = scheduled;
    if (duration.trim()) input.durationEstimateMinutes = Number(duration);
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
      if (error instanceof ApiError && error.status === 400 && /scheduled/i.test(message)) {
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
      {formError && (
        <Alert tone="danger" title="Couldn’t create the job" onDismiss={() => setFormError("")}>
          <p>{formError}</p>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Engineer" helper="Optional. Only active engineers are listed." className="sm:col-span-2">
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={engineerId}
              options={engineerOptions}
              disabled={saving}
              onChange={(event) => setEngineerId(event.target.value)}
            />
          )}
        </Field>

        <Field label="Scheduled for" error={errors.scheduledAt}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="datetime-local"
              aria-describedby={describedBy}
              invalid={invalid}
              value={scheduledAt}
              disabled={saving}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          )}
        </Field>

        <Field label="Estimated duration (minutes)" error={errors.duration}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={DURATION_MIN}
              max={DURATION_MAX}
              step={15}
              aria-describedby={describedBy}
              invalid={invalid}
              value={duration}
              disabled={saving}
              onChange={(event) => setDuration(event.target.value)}
            />
          )}
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
