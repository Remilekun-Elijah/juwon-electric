"use client";

import { useMemo, useState } from "react";
import { CornerDownRight, FolderTree, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  ListCardHeader,
  SearchInput,
  Skeleton,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
} from "@/components/ui";
import { deleteCategory, getCategories } from "@/lib/api/admin";
import type { Category } from "@/lib/api/types";
import { errorMessage } from "@/lib/admin/format";
import { CategoryForm } from "./CategoryForm";
import { flattenCategoryTree } from "./categoryTree";

const COL_SPAN = 5;

export function Categories() {
  const { can } = useAdmin();
  const canWrite = can("products:write");
  const q = useAdminQuery("admin-categories", getCategories);
  const categories = useMemo(() => q.data ?? [], [q.data]);
  const tree = useMemo(() => flattenCategoryTree(categories), [categories]);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{
    open: boolean;
    category: Category | null;
    key: number;
  }>({
    open: false,
    category: null,
    key: 0,
  });
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tree.filter(({ category }) => `${category.name} ${category.slug}`.toLowerCase().includes(needle))
    : tree;
  const parentName = (id: string | null) => categories.find((item) => item.id === id)?.name;

  const openForm = (category: Category | null) =>
    setForm((current) => ({ open: true, category, key: current.key + 1 }));
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete.id);
      toast.success("Category deleted.");
      q.setData((current) => current?.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "The category couldn’t be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const renderRows = () => {
    if (q.initialLoading) {
      return Array.from({ length: 5 }, (_, index) => (
        <TR key={index}>
          <TD colSpan={COL_SPAN}>
            <Skeleton className="h-9 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!q.data && q.error) {
      return (
        <TableEmpty colSpan={COL_SPAN}>
          <ErrorState
            title="Categories couldn’t be loaded"
            description={q.error}
            onRetry={q.reload}
            retrying={q.loading}
          />
        </TableEmpty>
      );
    }
    if (!tree.length) {
      return (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={FolderTree}
          title="No categories yet"
          description="Categories group products on the website and set the specifications each product records."
          action={
            canWrite && (
              <Button size="sm" onClick={() => openForm(null)} icon={<Plus aria-hidden="true" />}>
                Add category
              </Button>
            )
          }
        />
      );
    }
    if (!visible.length) {
      return (
        <TableEmpty
          colSpan={COL_SPAN}
          icon={SearchX}
          title="No categories match your search"
          description="Try a different search."
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      );
    }

    return visible.map(({ category, depth }) => (
      <TR key={category.id} selected={form.open && form.category?.id === category.id}>
        <TD className="max-w-[320px]">
          <div
            className="flex min-w-0 items-start gap-1.5"
            style={needle ? undefined : { paddingLeft: `${Math.min(depth, 6) * 1.25}rem` }}
          >
            {depth > 0 && !needle && (
              <CornerDownRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{category.name}</p>
              <p className="truncate font-mono text-xs text-slate-500">
                {category.slug}
                {needle && category.parentId && parentName(category.parentId) ? (
                  <span className="font-sans"> · in {parentName(category.parentId)}</span>
                ) : null}
              </p>
            </div>
          </div>
        </TD>
        <TD className="hidden whitespace-nowrap tabular-nums md:table-cell">
          {category.attributes.length ? `${category.attributes.length}` : "—"}
        </TD>
        <TD className="hidden whitespace-nowrap tabular-nums sm:table-cell">{category.sortOrder}</TD>
        <TD>
          {category.isActive ? <StatusBadge type="catalog" status="active" /> : <Badge tone="neutral">Inactive</Badge>}
        </TD>
        <TD align="right">
          {canWrite && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${category.name}`}
                title="Edit"
                onClick={() => openForm(category)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-red-50 hover:text-red-700"
                aria-label={`Delete ${category.name}`}
                title="Delete"
                onClick={() => setPendingDelete(category)}
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
      module="categories"
      previewAreas={["catalog"]}
      error={q.data ? q.error : undefined}
      onRetry={q.reload}
      retrying={q.loading}
      actions={
        canWrite && (
          <Button onClick={() => openForm(null)} icon={<Plus aria-hidden="true" />}>
            Add category
          </Button>
        )
      }
    >
      <Table
        aria-label="Categories"
        header={
          <ListCardHeader title="Categories" count={q.initialLoading ? undefined : categories.length}>
            <SearchInput
              aria-label="Search categories"
              placeholder="Search categories"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </ListCardHeader>
        }
      >
        <THead>
          <TH>Category</TH>
          <TH className="hidden md:table-cell">Specifications</TH>
          <TH className="hidden sm:table-cell">Sort order</TH>
          <TH>Status</TH>
          <TH align="right" srOnly>
            Actions
          </TH>
        </THead>
        <TBody>{renderRows()}</TBody>
      </Table>

      {form.key > 0 && (
        <CategoryForm
          key={form.key}
          open={form.open}
          category={form.category}
          categories={categories}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            q.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={remove}
        loading={deleting}
        loadingText="Deleting…"
        title="Delete category"
        description={
          pendingDelete
            ? `Are you sure you want to delete “${pendingDelete.name}”? Categories with subcategories or products can’t be deleted. This can’t be undone.`
            : ""
        }
        confirmLabel="Delete category"
        confirmIcon={<Trash2 aria-hidden="true" />}
      />
    </AdminPage>
  );
}
