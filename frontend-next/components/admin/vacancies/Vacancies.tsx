"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CircleSlash,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  ConfirmDialog,
  ListCardHeader,
  Pagination,
  SearchInput,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
  Tabs,
  type Tone,
} from "@/components/ui";
import { errorMessage, formatDate } from "@/lib/admin/format";
import { vacancyStatusLabels } from "@/lib/admin/transitions";
import { deleteVacancy, getVacancies, publishVacancy, setVacancyStatus, unpublishVacancy } from "@/lib/api/admin";
import type { Paged, Vacancy, VacancyStatus } from "@/lib/api/types";
import { useAdmin, useAdminQuery } from "../AdminContext";
import { AdminPage } from "../AdminPage";
import { VacancyForm, employmentTypeOptions } from "./VacancyForm";

const PAGE_SIZE = 20;

type Filter = VacancyStatus | "all";

const statusTone: Record<VacancyStatus, Tone> = { draft: "neutral", open: "success", closed: "warning" };

const tabs: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

type Action = "publish" | "unpublish" | "close" | "reopen";

const actionCopy: Record<Action, { run: (id: string) => Promise<Vacancy>; done: string }> = {
  publish: { run: publishVacancy, done: "Vacancy published." },
  unpublish: { run: unpublishVacancy, done: "Vacancy unpublished." },
  close: { run: (id) => setVacancyStatus(id, "closed"), done: "Vacancy closed." },
  reopen: { run: publishVacancy, done: "Vacancy reopened." },
};

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function Vacancies() {
  const { can } = useAdmin();
  const canWrite = can("vacancies:write");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  const [editing, setEditing] = useState<Vacancy | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Vacancy | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const query = useAdminQuery<Paged<Vacancy>>(
    `vacancies:${filter}:${q}:${page}`,
    () => getVacancies({ status: filter === "all" ? "" : filter, q, page, limit: PAGE_SIZE }),
    { enabled: can("vacancies:read") }
  );
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const replace = (vacancy: Vacancy) =>
    query.setData((current) =>
      current ? { ...current, items: current.items.map((item) => (item.id === vacancy.id ? vacancy : item)) } : current
    );

  const openForm = (vacancy: Vacancy | null) => {
    if (vacancy && busy === vacancy.id) return;
    setEditing(vacancy);
    setFormOpen(true);
  };

  const onSaved = (vacancy: Vacancy, created: boolean) => {
    setFormOpen(false);
    toast.success(created ? (vacancy.status === "open" ? "Vacancy published." : "Draft saved.") : "Vacancy updated.");
    if (created) query.reload();
    else replace(vacancy);
  };

  const runAction = async (vacancy: Vacancy, action: Action) => {
    setBusy(vacancy.id);
    try {
      const updated = await actionCopy[action].run(vacancy.id);
      toast.success(actionCopy[action].done);
      // The row may no longer match the active filter.
      if (filter === "all") replace(updated);
      else query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    try {
      await deleteVacancy(pendingDelete.id);
      toast.success("Vacancy deleted.");
      setPendingDelete(null);
      query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const employmentLabel = (value: Vacancy["employmentType"]) =>
    employmentTypeOptions.find((option) => option.value === value)?.label;

  return (
    <AdminPage
      module="vacancies"
      previewAreas={["vacancies"]}
      error={query.error}
      onRetry={query.reload}
      retrying={query.loading}
      actions={
        canWrite && (
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" />
            New vacancy
          </Button>
        )
      }
    >
      <Table
        aria-label="Vacancies"
        header={
          <ListCardHeader title="All vacancies" count={query.data ? total : undefined}>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="overflow-x-auto">
                <Tabs aria-label="Filter by status" value={filter} onChange={changeFilter} items={tabs} />
              </div>
              <SearchInput
                aria-label="Search vacancies"
                placeholder="Search title, department or location"
                wrapperClassName="lg:max-w-xs"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </ListCardHeader>
        }
        footer={
          <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="vacancies" />
        }
      >
        <THead>
          <TH>Role</TH>
          <TH className="hidden md:table-cell">Type</TH>
          <TH>Status</TH>
          <TH className="hidden lg:table-cell">Posted</TH>
          <TH className="hidden sm:table-cell">Updated</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>
          {query.initialLoading &&
            Array.from({ length: 4 }, (_, index) => (
              <TR key={index}>
                <TD colSpan={6}>
                  <Skeleton className="h-10 w-full" />
                </TD>
              </TR>
            ))}
          {items.map((vacancy) => {
            const rowBusy = busy === vacancy.id;
            return (
              <TR key={vacancy.id}>
                <TD className="max-w-[280px]">
                  <p className="truncate font-medium text-slate-900">{vacancy.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[vacancy.department, vacancy.location].filter(Boolean).join(" · ") || "No department or location"}
                  </p>
                </TD>
                <TD className="hidden whitespace-nowrap md:table-cell">
                  {employmentLabel(vacancy.employmentType) ?? "—"}
                </TD>
                <TD>
                  <Badge tone={statusTone[vacancy.status]} dot>
                    {vacancyStatusLabels[vacancy.status]}
                  </Badge>
                </TD>
                <TD className="hidden whitespace-nowrap lg:table-cell">{formatDate(vacancy.postedAt)}</TD>
                <TD className="hidden whitespace-nowrap sm:table-cell">{formatDate(vacancy.updatedAt)}</TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1">
                    {vacancy.status === "open" && (
                      <Button
                        as={Link}
                        href={`/vacancies/${encodeURIComponent(vacancy.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View ${vacancy.title} on the careers page`}
                        title="View on the careers page"
                      >
                        <ExternalLink aria-hidden="true" />
                      </Button>
                    )}
                    {canWrite && (
                      <>
                        {vacancy.status === "draft" && (
                          <Button size="sm" variant="outline" loading={rowBusy} onClick={() => runAction(vacancy, "publish")}>
                            <Eye aria-hidden="true" />
                            Publish
                          </Button>
                        )}
                        {vacancy.status === "open" && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={rowBusy}
                              aria-label={`Unpublish ${vacancy.title}`}
                              title="Unpublish (back to draft)"
                              onClick={() => runAction(vacancy, "unpublish")}
                            >
                              <EyeOff aria-hidden="true" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={rowBusy}
                              aria-label={`Close ${vacancy.title}`}
                              title="Close (no longer hiring)"
                              onClick={() => runAction(vacancy, "close")}
                            >
                              <CircleSlash aria-hidden="true" />
                            </Button>
                          </>
                        )}
                        {vacancy.status === "closed" && (
                          <Button size="sm" variant="outline" loading={rowBusy} onClick={() => runAction(vacancy, "reopen")}>
                            <RotateCcw aria-hidden="true" />
                            Reopen
                          </Button>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${vacancy.title}`}
                          title="Edit"
                          disabled={rowBusy}
                          onClick={() => openForm(vacancy)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${vacancy.title}`}
                          title="Delete"
                          disabled={rowBusy}
                          onClick={() => setPendingDelete(vacancy)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
          {!query.initialLoading && !items.length && (
            <TableEmpty
              colSpan={6}
              icon={q ? SearchX : BriefcaseBusiness}
              title={q ? "No vacancies match your search" : filter === "all" ? "No vacancies yet" : `No ${filter} vacancies`}
              description={
                q
                  ? "Try a different title, department or location."
                  : canWrite
                    ? "Create a vacancy to start hiring. Drafts stay private until you publish them."
                    : "Vacancies created by your team will show up here."
              }
              action={
                canWrite && !q ? (
                  <Button size="sm" onClick={() => openForm(null)}>
                    <Plus aria-hidden="true" />
                    New vacancy
                  </Button>
                ) : undefined
              }
            />
          )}
        </TBody>
      </Table>

      <VacancyForm open={formOpen} vacancy={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this vacancy?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed permanently${
                pendingDelete.status === "open" ? " and taken off the careers page" : ""
              }. This can’t be undone.`
            : undefined
        }
        confirmLabel="Delete vacancy"
        loading={Boolean(pendingDelete && busy === pendingDelete.id)}
        loadingText="Deleting…"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}
