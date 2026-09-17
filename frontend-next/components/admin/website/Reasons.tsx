"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { REASON_ICON_OPTIONS, ReasonIconPreview } from "@/components/admin/website/reasonIcons";
import { WEBSITE_LIMITS, compactErrors, lengthError, reorderUpdates } from "@/lib/admin/website";
import { deleteReason, getReasons, saveReason } from "@/lib/api/admin";
import { REASON_ICONS, type Reason, type ReasonIcon, type ReasonInput } from "@/lib/api/types";
import { DeleteDialog, EditorDrawer, SampleBadge, SampleBanner, useCollection } from "./shared";

const FORM_ID = "reason-form";

/**
 * "Why customers choose us" cards (home page): list with ▲▼ order, create/edit drawer and delete confirmation.
 * Each card is an icon, a title and a sentence. With none active the home page shows the four built-in reasons.
 */
export function Reasons() {
  const c = useCollection<Reason>({
    key: "website:reasons",
    load: getReasons,
    remove: deleteReason,
    save: (reasonId, sortOrder) => saveReason(reasonId, { sortOrder }),
    noun: "reason",
  });
  const colSpan = 5;
  const ids = c.items.map((item) => item.id);

  const move = (item: Reason, direction: -1 | 1) => c.applyOrder(item.id, reorderUpdates(c.items, ids, item.id, direction));

  const addButton = (size?: "sm") =>
    c.canWrite ? (
      <Button size={size} onClick={c.openCreate} icon={<Plus aria-hidden="true" />}>
        Add reason
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (c.firstLoad && c.list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="Reasons couldn’t be loaded"
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
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!c.items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={Sparkles}
          title="No reasons yet"
          description="Add what makes customers choose Juwon Electric. Until you do, the home page shows four standard reasons."
          action={addButton("sm")}
        />
      );
    }
    return c.items.map((item, index) => (
      <TR key={item.id} selected={c.drawerOpen && c.editing?.id === item.id}>
        <TD className="max-w-[460px]">
          <div className="flex min-w-0 gap-3">
            <ReasonIconPreview icon={item.icon} />
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium text-slate-900">{item.title}</p>
              <p className="line-clamp-2 text-sm text-slate-500">{item.text}</p>
              {item.sample && (
                <div className="mt-1">
                  <SampleBadge />
                </div>
              )}
            </div>
          </div>
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
                aria-label={`Move “${item.title}” up`}
                title="Move up"
                disabled={index === 0 || Boolean(c.moving)}
                onClick={() => move(item, -1)}
              >
                <ChevronUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move “${item.title}” down`}
                title="Move down"
                disabled={index === c.items.length - 1 || Boolean(c.moving)}
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
                aria-label={`Edit “${item.title}”`}
                title="Edit"
                onClick={() => c.openEdit(item)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete “${item.title}”`}
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
      module="reasons"
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
        aria-label="All reasons"
        header={
          <ListCardHeader
            title="All reasons"
            count={c.firstLoad ? undefined : c.items.length}
            description="The “Why customers choose us” band on the home page shows the active reasons in this order. Four fit on one row."
          />
        }
      >
        <THead>
          <TH>Reason</TH>
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
        title={c.editing ? "Edit reason" : "Add reason"}
        description={c.editing ? c.editing.title : "Fields marked * are required."}
        submitLabel={c.editing ? "Save changes" : "Add reason"}
        noun="reason"
        formError={c.formError}
        sample={c.editing?.sample}
      >
        <ReasonForm
          key={c.formKey}
          reason={c.editing}
          onSubmit={(input) =>
            c.runSave((reasonId) => saveReason(reasonId, reasonId ? input : { ...input, sortOrder: c.nextSortOrder }))
          }
        />
      </EditorDrawer>

      <DeleteDialog
        open={Boolean(c.pendingDelete)}
        noun="reason"
        subject={c.pendingDelete ? `“${c.pendingDelete.title}”` : ""}
        deleting={c.deleting}
        onClose={c.cancelDelete}
        onConfirm={c.confirmDelete}
      />
    </AdminPage>
  );
}

type ReasonErrors = Partial<Record<"title" | "text", string>>;

function ReasonForm({ reason, onSubmit }: { reason: Reason | null; onSubmit: (input: ReasonInput) => void }) {
  const [title, setTitle] = useState(reason?.title ?? "");
  const [text, setText] = useState(reason?.text ?? "");
  const [icon, setIcon] = useState<ReasonIcon>(reason?.icon ?? REASON_ICONS[0]);
  const [isActive, setIsActive] = useState(reason?.isActive ?? true);
  const [errors, setErrors] = useState<ReasonErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      title: lengthError(title, "Title", { min: WEBSITE_LIMITS.reasonTitleMin, max: WEBSITE_LIMITS.reasonTitle }),
      text: lengthError(text, "Text", { min: WEBSITE_LIMITS.reasonTextMin, max: WEBSITE_LIMITS.reasonText }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ title: title.trim(), text: text.trim(), icon, isActive });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Title" required error={errors.title} helper="A few words, e.g. “Installed by our engineers”.">
        <Input value={title} maxLength={WEBSITE_LIMITS.reasonTitle} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field
        label="Text"
        required
        error={errors.text}
        helper={`One or two sentences. ${text.trim().length}/${WEBSITE_LIMITS.reasonText}`}
      >
        <Textarea
          rows={3}
          value={text}
          maxLength={WEBSITE_LIMITS.reasonText}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Field label="Icon" helper="Shown in a gold circle above the title.">
        <div className="flex items-center gap-3">
          <ReasonIconPreview icon={icon} />
          <Select
            className="min-w-0 flex-1"
            aria-label="Icon"
            value={icon}
            options={REASON_ICON_OPTIONS}
            onChange={(event) => setIcon(event.target.value as ReasonIcon)}
          />
        </div>
      </Field>
      <Switch
        label="Show on the website"
        description="Hidden reasons stay here but aren’t shown to customers."
        checked={isActive}
        onChange={setIsActive}
      />
    </form>
  );
}
