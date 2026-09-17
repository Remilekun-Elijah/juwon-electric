"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, CircleQuestionMark, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import {
  Alert,
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
import { WEBSITE_LIMITS, blankToNull, compactErrors, lengthError, reorderUpdates } from "@/lib/admin/website";
import { deleteFaq, getFaqs, saveFaq } from "@/lib/api/admin";
import type { Faq } from "@/lib/api/types";
import { DeleteDialog, EditorDrawer, SampleBadge, SampleBanner, useCollection } from "./shared";

const ALL = "__all";
const NONE = "__none";
const FORM_ID = "faq-form";
const CATEGORY_LIST_ID = "faq-category-suggestions";

/** FAQs (LANDING_V1 §1.1): list with a category filter and ▲▼ order, create/edit drawer and delete confirmation. */
export function Faqs() {
  const c = useCollection<Faq>({
    key: "website:faqs",
    load: getFaqs,
    remove: deleteFaq,
    save: (faqId, sortOrder) => saveFaq(faqId, { sortOrder }),
    noun: "FAQ",
  });
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(
    () =>
      [...new Set(c.items.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value)))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [c.items]
  );
  const visible = c.items.filter((item) =>
    category === ALL ? true : category === NONE ? !item.category?.trim() : item.category?.trim() === category
  );
  const visibleIds = visible.map((item) => item.id);
  const filterOptions = [
    { value: ALL, label: "All categories" },
    ...categories.map((value) => ({ value, label: value })),
    { value: NONE, label: "No category" },
  ];
  const colSpan = 5;

  const move = (item: Faq, direction: -1 | 1) =>
    c.applyOrder(item.id, reorderUpdates(c.items, visibleIds, item.id, direction));

  const addButton = (size?: "sm") =>
    c.canWrite ? (
      <Button size={size} onClick={c.openCreate} icon={<Plus aria-hidden="true" />}>
        Add FAQ
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (c.firstLoad && c.list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="FAQs couldn’t be loaded"
            description={c.list.error}
            onRetry={c.list.reload}
            retrying={c.list.loading}
          />
        </TableEmpty>
      );
    }
    if (c.firstLoad) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={colSpan}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!c.items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={CircleQuestionMark}
          title="No FAQs yet"
          description="Add the questions customers ask most. Active FAQs show on the home page and the FAQ page."
          action={addButton("sm")}
        />
      );
    }
    if (!visible.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No FAQs in this category"
          description="Choose another category or show all."
          action={
            <Button size="sm" variant="outline" onClick={() => setCategory(ALL)}>
              Show all
            </Button>
          }
        />
      );
    }
    return visible.map((item, index) => (
      <TR key={item.id} selected={c.drawerOpen && c.editing?.id === item.id}>
        <TD className="max-w-[420px]">
          <p className="line-clamp-2 font-medium text-slate-900">{item.question}</p>
          <p className="truncate text-sm text-slate-500">{item.answer}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.category && <span className="text-xs text-slate-500 md:hidden">{item.category}</span>}
            {item.sample && <SampleBadge />}
          </div>
        </TD>
        <TD className="hidden max-w-[180px] md:table-cell">
          {item.category ? (
            <span className="block truncate text-slate-700">{item.category}</span>
          ) : (
            <span className="text-slate-400">No category</span>
          )}
        </TD>
        <TD>
          <StatusBadge type="catalog" status={item.isActive !== false} />
        </TD>
        <TD className="whitespace-nowrap">
          {c.canWrite ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move “${item.question}” up`}
                title="Move up"
                disabled={index === 0 || Boolean(c.moving)}
                onClick={() => move(item, -1)}
              >
                <ChevronUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move “${item.question}” down`}
                title="Move down"
                disabled={index === visible.length - 1 || Boolean(c.moving)}
                onClick={() => move(item, 1)}
              >
                <ChevronDown aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <span className="tabular-nums text-slate-500">{index + 1}</span>
          )}
        </TD>
        <TD align="right">
          {c.canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit “${item.question}”`}
                title="Edit"
                onClick={() => c.openEdit(item)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete “${item.question}”`}
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
      module="faqs"
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
        aria-label="All FAQs"
        header={
          <ListCardHeader
            title="All FAQs"
            count={c.firstLoad ? undefined : c.items.length}
            description="The website lists active FAQs in this order."
          >
            <Select
              aria-label="Filter by category"
              className="sm:w-[220px]"
              value={category}
              options={filterOptions}
              onChange={(event) => setCategory(event.target.value)}
            />
          </ListCardHeader>
        }
      >
        <THead>
          <TH>Question</TH>
          <TH className="hidden md:table-cell">Category</TH>
          <TH>Status</TH>
          <TH>Order</TH>
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
        title={c.editing ? "Edit FAQ" : "Add FAQ"}
        description={c.editing ? c.editing.question : "Fields marked * are required."}
        submitLabel={c.editing ? "Save changes" : "Add FAQ"}
        noun="FAQ"
        formError={c.formError}
        sample={c.editing?.sample}
      >
        <FaqForm
          key={c.formKey}
          faq={c.editing}
          categories={categories}
          onSubmit={(input) =>
            c.runSave((faqId) => saveFaq(faqId, faqId ? input : { ...input, sortOrder: c.nextSortOrder }))
          }
        />
      </EditorDrawer>

      <DeleteDialog
        open={Boolean(c.pendingDelete)}
        noun="FAQ"
        subject={c.pendingDelete ? `“${c.pendingDelete.question}”` : ""}
        deleting={c.deleting}
        onClose={c.cancelDelete}
        onConfirm={c.confirmDelete}
      />
    </AdminPage>
  );
}

type FaqErrors = Partial<Record<"question" | "answer" | "category", string>>;

function FaqForm({
  faq,
  categories,
  onSubmit,
}: {
  faq: Faq | null;
  categories: string[];
  onSubmit: (input: { question: string; answer: string; category: string | null; isActive: boolean }) => void;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [category, setCategory] = useState(faq?.category ?? "");
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);
  const [errors, setErrors] = useState<FaqErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      question: lengthError(question, "Question", { min: WEBSITE_LIMITS.faqQuestionMin, max: WEBSITE_LIMITS.faqQuestion }),
      answer: lengthError(answer, "Answer", { min: 1, max: WEBSITE_LIMITS.faqAnswer }),
      category: lengthError(category, "Category", { max: WEBSITE_LIMITS.faqCategory }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ question: question.trim(), answer: answer.trim(), category: blankToNull(category), isActive });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Question" required error={errors.question}>
        <Input
          value={question}
          maxLength={WEBSITE_LIMITS.faqQuestion}
          placeholder="Do I pay to place an order?"
          onChange={(event) => setQuestion(event.target.value)}
        />
      </Field>
      <Field
        label="Answer"
        required
        error={errors.answer}
        helper={`Plain text. Line breaks are kept. ${answer.trim().length}/${WEBSITE_LIMITS.faqAnswer}`}
      >
        <Textarea
          rows={6}
          value={answer}
          maxLength={WEBSITE_LIMITS.faqAnswer}
          onChange={(event) => setAnswer(event.target.value)}
        />
      </Field>
      <Field
        label="Category"
        error={errors.category}
        helper="Groups questions on the FAQ page. Pick an existing category or type a new one."
      >
        <Input
          value={category}
          list={CATEGORY_LIST_ID}
          maxLength={WEBSITE_LIMITS.faqCategory}
          placeholder="Ordering"
          autoComplete="off"
          onChange={(event) => setCategory(event.target.value)}
        />
      </Field>
      <datalist id={CATEGORY_LIST_ID}>
        {categories.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <Switch
        label="Show on the website"
        description="Hidden FAQs stay here but aren’t shown to customers."
        checked={isActive}
        onChange={setIsActive}
      />
    </form>
  );
}
