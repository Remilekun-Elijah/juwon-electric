"use client";

import { useState, type FormEvent } from "react";
import { MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  ListCardHeader,
  Select,
  Skeleton,
  StatusBadge,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Textarea,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/AdminPage";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { cn } from "@/lib/cn";
import { WEBSITE_LIMITS, blankToNull, compactErrors, imageLocationError, lengthError } from "@/lib/admin/website";
import { deleteTestimonial, getTestimonials, saveTestimonial } from "@/lib/api/admin";
import type { Testimonial, TestimonialInput, TestimonialSource } from "@/lib/api/types";
import { DeleteDialog, EditorDrawer, SampleBadge, SampleBanner, useCollection } from "./shared";

const FORM_ID = "review-form";

type Rating = NonNullable<Testimonial["rating"]>;

export const sourceLabels: Record<TestimonialSource, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  google: "Google",
  facebook: "Facebook",
  in_person: "In person",
};

const sourceOptions = [
  { value: "", label: "Not specified" },
  ...(Object.keys(sourceLabels) as TestimonialSource[]).map((value) => ({ value, label: sourceLabels[value] })),
];

/** Read-only 1–5 stars. */
function StarRating({ rating, className }: { rating: Testimonial["rating"]; className?: string }) {
  if (!rating) return <span className={cn("text-sm text-slate-400", className)}>No rating</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn("size-4", value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")}
        />
      ))}
    </span>
  );
}

/** Customer reviews (LANDING_V1 §1.2): list with star ratings, create/edit drawer and delete confirmation. */
export function Reviews() {
  const c = useCollection<Testimonial>({
    key: "website:testimonials",
    load: getTestimonials,
    remove: deleteTestimonial,
    save: (testimonialId, sortOrder) => saveTestimonial(testimonialId, { sortOrder }),
    noun: "review",
  });
  const colSpan = 5;

  const addButton = (size?: "sm") =>
    c.canWrite ? (
      <Button size={size} onClick={c.openCreate} icon={<Plus aria-hidden="true" />}>
        Add review
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (c.firstLoad && c.list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="Reviews couldn’t be loaded"
            description={c.list.error}
            onRetry={c.list.reload}
            retrying={c.list.loading}
          />
        </TableEmpty>
      );
    }
    if (c.firstLoad) {
      return Array.from({ length: 4 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={colSpan}>
            <Skeleton className="h-14 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!c.items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={MessageSquareQuote}
          title="No reviews yet"
          description="Add what customers have said about you. Active reviews show on the home page."
          action={addButton("sm")}
        />
      );
    }
    return c.items.map((item) => (
      <TR key={item.id} selected={c.drawerOpen && c.editing?.id === item.id}>
        <TD className="max-w-[420px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium text-slate-900">{item.name}</p>
            {item.sample && <SampleBadge />}
          </div>
          {item.context && <p className="truncate text-sm text-slate-500">{item.context}</p>}
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">“{item.quote}”</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 md:hidden">
            <StarRating rating={item.rating} />
            {item.source && <Badge tone="neutral">{sourceLabels[item.source]}</Badge>}
          </div>
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">
          <StarRating rating={item.rating} />
        </TD>
        <TD className="hidden whitespace-nowrap md:table-cell">
          {item.source ? <Badge tone="neutral">{sourceLabels[item.source]}</Badge> : <span className="text-slate-400">—</span>}
        </TD>
        <TD>
          <StatusBadge type="catalog" status={item.isActive !== false} />
        </TD>
        <TD align="right">
          {c.canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit the review from ${item.name}`}
                title="Edit"
                onClick={() => c.openEdit(item)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete the review from ${item.name}`}
                title="Delete"
                onClick={() => c.askDelete(item)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )}
        </TD>
      </TR>
    ));
  };

  return (
    <AdminPage
      module="reviews"
      actions={addButton()}
      error={c.firstLoad ? undefined : c.list.error}
      onRetry={c.list.reload}
      retrying={c.list.loading}
    >
      {c.hasSample && <SampleBanner />}
      {c.pageError && (
        <Alert tone="danger" onDismiss={c.clearPageError}>
          {c.pageError}
        </Alert>
      )}

      <Table
        aria-label="All reviews"
        header={
          <ListCardHeader
            title="All reviews"
            count={c.firstLoad ? undefined : c.items.length}
            description="Only add reviews customers actually gave you."
          />
        }
      >
        <THead>
          <TH>Review</TH>
          <TH className="hidden md:table-cell">Rating</TH>
          <TH className="hidden md:table-cell">Source</TH>
          <TH>Status</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      <EditorDrawer
        open={c.drawerOpen}
        onClose={c.closeDrawer}
        saving={c.saving}
        formId={FORM_ID}
        title={c.editing ? "Edit review" : "Add review"}
        description={c.editing ? c.editing.name : "Fields marked * are required."}
        submitLabel={c.editing ? "Save changes" : "Add review"}
        noun="review"
        formError={c.formError}
        sample={c.editing?.sample}
      >
        <ReviewForm
          key={c.formKey}
          review={c.editing}
          onSubmit={(input) =>
            c.runSave((reviewId) => saveTestimonial(reviewId, reviewId ? input : { ...input, sortOrder: c.nextSortOrder }))
          }
        />
      </EditorDrawer>

      <DeleteDialog
        open={Boolean(c.pendingDelete)}
        noun="review"
        subject={c.pendingDelete ? `the review from “${c.pendingDelete.name}”` : ""}
        deleting={c.deleting}
        onClose={c.cancelDelete}
        onConfirm={c.confirmDelete}
      />
    </AdminPage>
  );
}

/** Clickable 1–5 star input with a clear button. Arrow keys move within the group. */
function StarInput({ value, onChange }: { value: Rating | null; onChange: (value: Rating | null) => void }) {
  const [hover, setHover] = useState<Rating | null>(null);
  const shown = hover ?? value ?? 0;
  const ratings: Rating[] = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Rating"
        className="flex items-center"
        onMouseLeave={() => setHover(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const next = Math.min(5, Math.max(1, (value ?? 0) + (event.key === "ArrowRight" ? 1 : -1))) as Rating;
          onChange(next);
          const group = event.currentTarget;
          requestAnimationFrame(() => group.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`)?.focus());
        }}
      >
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            role="radio"
            data-rating={rating}
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            tabIndex={(value ?? 1) === rating ? 0 : -1}
            className="rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            onMouseEnter={() => setHover(rating)}
            onClick={() => onChange(rating)}
          >
            <Star
              aria-hidden="true"
              className={cn("size-6", rating <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300")}
            />
          </button>
        ))}
      </div>
      <span className="text-sm tabular-nums text-slate-500">{value ? `${value} of 5` : "No rating"}</span>
      {value !== null && (
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Clear
        </Button>
      )}
    </div>
  );
}

type ReviewErrors = Partial<Record<"name" | "context" | "quote" | "imageUrl", string>>;

function ReviewForm({ review, onSubmit }: { review: Testimonial | null; onSubmit: (input: TestimonialInput) => void }) {
  const [name, setName] = useState(review?.name ?? "");
  const [context, setContext] = useState(review?.context ?? "");
  const [quote, setQuote] = useState(review?.quote ?? "");
  const [rating, setRating] = useState<Rating | null>(review?.rating ?? null);
  const [source, setSource] = useState<TestimonialSource | "">(review?.source ?? "");
  const [imageUrl, setImageUrl] = useState(review?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(review?.isActive ?? true);
  const [errors, setErrors] = useState<ReviewErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      name: lengthError(name, "Name", { min: 1, max: WEBSITE_LIMITS.reviewName }),
      context: lengthError(context, "Context", { max: WEBSITE_LIMITS.reviewContext }),
      quote: lengthError(quote, "Review", { min: WEBSITE_LIMITS.reviewQuoteMin, max: WEBSITE_LIMITS.reviewQuote }),
      imageUrl: imageLocationError(imageUrl, "Photo"),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({
      name: name.trim(),
      context: blankToNull(context),
      quote: quote.trim(),
      rating,
      source: source || null,
      imageUrl: blankToNull(imageUrl),
      isActive,
    });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" required error={errors.name} helper="First name and initial is enough.">
          <Input
            value={name}
            maxLength={WEBSITE_LIMITS.reviewName}
            placeholder="Adaeze O."
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Context" error={errors.context} helper="What you installed and where.">
          <Input
            value={context}
            maxLength={WEBSITE_LIMITS.reviewContext}
            placeholder="3.5kVA lithium, Ikeja"
            onChange={(event) => setContext(event.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Review"
        required
        error={errors.quote}
        helper={`In the customer’s words. ${quote.trim().length}/${WEBSITE_LIMITS.reviewQuote}`}
      >
        <Textarea rows={5} value={quote} maxLength={WEBSITE_LIMITS.reviewQuote} onChange={(event) => setQuote(event.target.value)} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Rating</legend>
        <StarInput value={rating} onChange={setRating} />
      </fieldset>
      <Field label="Source" helper="Where the customer left the review." className="max-w-sm">
        <Select
          value={source}
          options={sourceOptions}
          onChange={(event) => setSource(event.target.value as TestimonialSource | "")}
        />
      </Field>
      <ImageUpload
        label="Photo"
        value={imageUrl}
        onChange={setImageUrl}
        purpose="reviews"
        error={errors.imageUrl}
        helper="Optional. Only use a photo the customer agreed to share."
        linkHelper="An https:// link or a site path such as /reviews/adaeze.jpg."
        preview="round"
        previewAlt={name.trim() ? `Photo of ${name.trim()}` : "Customer photo"}
      />
      <Switch
        label="Show on the website"
        description="Hidden reviews stay here but aren’t shown to customers."
        checked={isActive}
        onChange={setIsActive}
      />
    </form>
  );
}
