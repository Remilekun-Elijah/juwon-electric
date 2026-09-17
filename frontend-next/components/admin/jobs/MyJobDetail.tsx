"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, MapPin, Phone, Play, Plus, Trash2, Users } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { toast } from "sonner";
import { Button, Field, Input, Textarea, buttonClasses } from "@/components/ui";
import { ImageDropZone, ImagePreview, LinkToggle, UploadProgress, useUploadTask } from "@/components/admin/ImageUpload";
import { JobStatusBadge } from "@/components/admin/orders/orderStatus";
import { formatDateTime } from "@/lib/admin/format";
import { formatDuration } from "@/lib/admin/lagosTime";
import { ENGINEER_JOB_TRANSITIONS } from "@/lib/admin/transitions";
import { setMyJobStatus, updateMyJob } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import type { InstallationJob } from "@/lib/api/types";
import {
  isUploadUnavailable,
  uploadErrorMessage,
  useUploadConfig,
  validateImageUrl,
} from "@/lib/admin/imageUpload";
import { LIMITS } from "@/lib/validation";
import { ChecklistProgress } from "./ChecklistProgress";
import { crewmatesText, errorMessage, jobAddress, mapsUrl, relativeSchedule, telHref } from "./jobUtils";

type MyJobDetailProps = { initialJob: InstallationJob; onChanged: (job: InstallationJob) => void };

/** Full-height job view for engineers on site: status, checklist, photos and completion notes. */
export function MyJobDetail({ initialJob, onChanged }: MyJobDetailProps) {
  const [job, setJob] = useState(initialJob);
  const [statusBusy, setStatusBusy] = useState(false);
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photosBusy, setPhotosBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadTurn, setUploadTurn] = useState<{ index: number; total: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const linkId = useId();
  const uploadConfig = useUploadConfig();
  const uploadTask = useUploadTask();
  /** Last saved photo list, read between uploads that run one after another. */
  const photosRef = useRef(initialJob.photos);
  const [notes, setNotes] = useState(initialJob.completionNotes ?? "");
  const [notesBusy, setNotesBusy] = useState(false);

  const editable = job.status === "assigned" || job.status === "in_progress";
  const next = ENGINEER_JOB_TRANSITIONS[job.status];
  const allDone = job.checklist.every((item) => item.done);
  const address = jobAddress(job);
  const phone = job.order?.phoneNumber;
  const name = job.order?.name || "Customer";
  const crewmates = crewmatesText(job, useAdmin().admin.id);

  const publish = (updated: InstallationJob) => {
    photosRef.current = updated.photos;
    setJob(updated);
    onChanged(updated);
  };

  const changeStatus = async () => {
    if (next !== "in_progress" && next !== "completed") return;
    setStatusBusy(true);
    try {
      const updated = await setMyJobStatus(job.id, next);
      publish(updated);
      toast.success(next === "completed" ? "Job marked complete." : "Job started.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStatusBusy(false);
    }
  };

  const toggleItem = async (itemId: string, done: boolean) => {
    const setDone = (value: boolean) =>
      setJob((current) => ({
        ...current,
        checklist: current.checklist.map((item) => (item.id === itemId ? { ...item, done: value } : item)),
      }));

    setDone(done);
    setPendingItems((current) => [...current, itemId]);
    try {
      const updated = await updateMyJob(job.id, { checklist: [{ id: itemId, done }] });
      const saved = updated.checklist.find((item) => item.id === itemId);
      setJob((current) => ({
        ...current,
        status: updated.status,
        updatedAt: updated.updatedAt,
        checklist: current.checklist.map((item) => (item.id === itemId && saved ? saved : item)),
      }));
      onChanged(updated);
    } catch (error) {
      setDone(!done);
      toast.error(errorMessage(error));
    } finally {
      setPendingItems((current) => current.filter((id) => id !== itemId));
    }
  };

  /** Saves the whole photo list (the existing payload). `success` "" skips the toast. */
  const savePhotos = async (photos: string[], success: string) => {
    setPhotosBusy(true);
    try {
      publish(await updateMyJob(job.id, { photos }));
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setPhotosBusy(false);
    }
  };

  const addPhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = photoUrl.trim();
    const problem =
      validateImageUrl(url, "Photo link", { required: true }) ||
      (job.photos.includes(url) ? "This photo is already added." : "") ||
      (job.photos.length >= LIMITS.jobPhotos ? `You can add up to ${LIMITS.jobPhotos} photos.` : "");
    setPhotoError(problem);
    if (problem) return;
    if (await savePhotos([...job.photos, url], "Photo added.")) setPhotoUrl("");
  };

  /** Uploads the chosen or taken photos one at a time and saves each to the job as soon as it's uploaded. */
  const uploadPhotos = async (files: File[]) => {
    if (uploadConfig.status !== "ready") return;
    setUploadError("");
    const room = LIMITS.jobPhotos - photosRef.current.length;
    if (room <= 0) {
      setUploadError(`You can add up to ${LIMITS.jobPhotos} photos.`);
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > accepted.length) {
      setUploadError(`You can add up to ${LIMITS.jobPhotos} photos, so only the first ${accepted.length} will be added.`);
    }
    let added = 0;
    try {
      for (const [index, file] of accepted.entries()) {
        setUploadTurn({ index: index + 1, total: accepted.length });
        let url: string | null;
        try {
          url = await uploadTask.run(file, { purpose: "jobs", kind: "photo", config: uploadConfig.config });
        } catch (caught) {
          const message = uploadErrorMessage(caught);
          setUploadError(accepted.length > 1 ? `${file.name}: ${message}` : message);
          if (isUploadUnavailable(caught)) setLinkOpen(true);
          break;
        }
        if (!url) break; // Cancelled.
        if (!(await savePhotos([...photosRef.current, url], ""))) break;
        added += 1;
      }
    } finally {
      setUploadTurn(null);
    }
    if (added) toast.success(added === 1 ? "Photo added." : `${added} photos added.`);
  };

  const saveNotes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotesBusy(true);
    try {
      const updated = await updateMyJob(job.id, { completionNotes: notes.trim() || null });
      publish(updated);
      setNotes(updated.completionNotes ?? "");
      toast.success("Notes saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setNotesBusy(false);
    }
  };

  const notesChanged = (notes.trim() || null) !== (job.completionNotes || null);
  const bigLink = buttonClasses({ variant: "outline", size: "lg", className: "min-h-11 w-full text-base" });

  return (
    <div className="space-y-6 text-base">
      <section aria-label="Job summary" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-slate-500">{relativeSchedule(job.scheduledAt)}</span>
          {Boolean(job.durationEstimateMinutes) && (
            <span className="text-sm text-slate-500">· about {formatDuration(job.durationEstimateMinutes)}</span>
          )}
        </div>
        <p className="text-base text-slate-700">{address || "No address on this job."}</p>
        {crewmates && (
          <p className="flex items-start gap-2 text-base text-slate-700">
            <Users aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            {crewmates}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {address ? (
            <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className={bigLink}>
              <MapPin aria-hidden="true" />
              Directions<span className="sr-only"> to {address} (opens Google Maps)</span>
            </a>
          ) : (
            <span className={cn(bigLink, "pointer-events-none opacity-50")}>No address</span>
          )}
          {phone ? (
            <a href={telHref(phone)} className={bigLink}>
              <Phone aria-hidden="true" />
              Call<span className="sr-only"> {name} on {phone}</span>
            </a>
          ) : (
            <span className={cn(bigLink, "pointer-events-none opacity-50")}>No phone</span>
          )}
        </div>
        {phone && <p className="text-sm text-slate-500">Customer phone: {phone}</p>}
      </section>

      {editable && next && (
        <section aria-label="Job status" className="space-y-2">
          {next === "in_progress" ? (
            <Button
              size="lg"
              className="min-h-12 w-full text-base"
              icon={<Play aria-hidden="true" />}
              loading={statusBusy}
              loadingText="Starting…"
              onClick={changeStatus}
            >
              Start job
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="min-h-12 w-full text-base"
                icon={<CheckCircle2 aria-hidden="true" />}
                loading={statusBusy}
                loadingText="Saving…"
                disabled={!allDone || pendingItems.length > 0}
                aria-describedby={!allDone ? "complete-helper" : undefined}
                onClick={changeStatus}
              >
                Mark complete
              </Button>
              {!allDone && (
                <p id="complete-helper" className="text-sm text-slate-500">
                  Tick every checklist item before you mark the job complete.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!editable && (
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          {job.status === "completed"
            ? `Completed ${formatDateTime(job.completedAt)}. This job can no longer be changed.`
            : "This job is closed and can no longer be changed."}
        </p>
      )}

      <section aria-labelledby="my-job-checklist" className="space-y-3">
        <h3 id="my-job-checklist" className="text-lg font-semibold text-slate-900">
          Checklist
        </h3>
        <ChecklistProgress job={job} showLabel={false} />
        {job.checklist.length > 0 && (
          <ul className="space-y-2">
            {job.checklist.map((item) => {
              const pending = pendingItems.includes(item.id);
              return (
                <li key={item.id}>
                  <label
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      item.done ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white",
                      editable && !pending ? "cursor-pointer hover:border-slate-300" : "cursor-default",
                      pending && "opacity-70"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-6 w-6 shrink-0 cursor-pointer rounded-sm accent-brand-600 disabled:cursor-not-allowed"
                      checked={item.done}
                      disabled={!editable || pending}
                      onChange={(event) => toggleItem(item.id, event.target.checked)}
                    />
                    <span className={cn("text-base", item.done ? "text-slate-500 line-through" : "text-slate-800")}>
                      {item.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-job-photos" className="space-y-3">
        <h3 id="my-job-photos" className="text-lg font-semibold text-slate-900">
          Photos
        </h3>
        {job.photos.length ? (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {job.photos.map((photo, index) => (
              <li key={`${photo}-${index}`} className="flex min-h-12 items-center gap-2 pl-3">
                <a
                  href={photo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-brand-700 hover:underline"
                >
                  <ImagePreview src={photo} alt={`Photo ${index + 1}`} className="my-1 size-12" />
                  <span className="min-w-0 flex-1 truncate">{photo}</span>
                  <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
                </a>
                {editable && (
                  <Button
                    variant="ghost"
                    className="h-11 w-11 shrink-0 px-0 text-red-700 hover:bg-red-50"
                    aria-label={`Remove photo ${index + 1}`}
                    disabled={photosBusy}
                    onClick={() => savePhotos(job.photos.filter((_, position) => position !== index), "Photo removed.")}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No photos yet.</p>
        )}
        {editable && (
          <div className="space-y-2">
            {uploadConfig.status !== "unavailable" &&
              (uploadTurn ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <UploadProgress
                    stage={uploadTask.stage ?? "uploading"}
                    progress={uploadTask.stage ? uploadTask.progress : 1}
                    label={uploadTurn.total > 1 ? `Photo ${uploadTurn.index} of ${uploadTurn.total}` : undefined}
                    onCancel={uploadTask.stage ? uploadTask.cancel : undefined}
                  />
                </div>
              ) : (
                <ImageDropZone
                  multiple
                  disabled={uploadConfig.status !== "ready" || photosBusy || job.photos.length >= LIMITS.jobPhotos}
                  prompt="Take a photo or choose photos. On a computer, you can also drag them here."
                  buttonLabel="Add photos"
                  hint={`Up to ${LIMITS.jobPhotos} photos. Large photos are resized before upload.`}
                  onFiles={(files) => void uploadPhotos(files)}
                />
              ))}
            {uploadError && (
              <p role="alert" className="text-sm text-red-600">
                {uploadError}
              </p>
            )}
            {uploadConfig.status !== "unavailable" && (
              <LinkToggle open={linkOpen} controls={linkId} onToggle={() => setLinkOpen(!linkOpen)}>
                Use a photo link instead
              </LinkToggle>
            )}
            <div id={linkId} hidden={uploadConfig.status !== "unavailable" && !linkOpen}>
              {(uploadConfig.status === "unavailable" || linkOpen) && (
                <form onSubmit={addPhoto} noValidate className="space-y-2">
                  <Field
                    label="Photo link"
                    error={photoError}
                    helper={`Paste a link to the photo (https://…). Up to ${LIMITS.jobPhotos} photos.`}
                  >
                    <Input
                      type="url"
                      inputMode="url"
                      size="lg"
                      className="text-base"
                      value={photoUrl}
                      maxLength={LIMITS.url}
                      placeholder="https://"
                      onChange={(event) => setPhotoUrl(event.target.value)}
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="min-h-11 w-full text-base"
                    icon={<Plus aria-hidden="true" />}
                    loading={photosBusy && !uploadTurn}
                    disabled={job.photos.length >= LIMITS.jobPhotos || Boolean(uploadTurn)}
                  >
                    Add photo link
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="my-job-notes" className="space-y-3">
        <h3 id="my-job-notes" className="text-lg font-semibold text-slate-900">
          Completion notes
        </h3>
        {editable ? (
          <form onSubmit={saveNotes} className="space-y-2">
            <Field
              label="Notes for the office"
              error={notes.length > LIMITS.jobCompletionNotes ? `Notes must be ${LIMITS.jobCompletionNotes} characters or fewer.` : undefined}
              helper={`${notes.length}/${LIMITS.jobCompletionNotes}`}
            >
              <Textarea
                className="text-base"
                rows={5}
                value={notes}
                maxLength={LIMITS.jobCompletionNotes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="min-h-11 w-full text-base"
              loading={notesBusy}
              loadingText="Saving…"
              disabled={!notesChanged || notes.length > LIMITS.jobCompletionNotes}
            >
              Save notes
            </Button>
          </form>
        ) : (
          <p className="whitespace-pre-line text-base text-slate-700">{job.completionNotes || "No notes."}</p>
        )}
      </section>

      <section aria-labelledby="my-job-admin-notes" className="space-y-2 pb-4">
        <h3 id="my-job-admin-notes" className="text-lg font-semibold text-slate-900">
          Notes from the office
        </h3>
        <p className="whitespace-pre-line text-base text-slate-700">{job.notes || "No notes."}</p>
      </section>
    </div>
  );
}
