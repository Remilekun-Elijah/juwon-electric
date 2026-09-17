"use client";

import { useState, type FormEvent } from "react";
import { Building, ExternalLink, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ListCardHeader,
  Skeleton,
  StatusBadge,
  Switch,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/AdminPage";
import { cn } from "@/lib/cn";
import { WEBSITE_LIMITS, blankToNull, compactErrors, imageLocationError, isImageLocation, lengthError } from "@/lib/admin/website";
import { LIMITS, validateUrlField } from "@/lib/validation";
import { deleteClient, getClients, saveClient } from "@/lib/api/admin";
import type { Client, ClientInput } from "@/lib/api/types";
import { DeleteDialog, EditorDrawer, SampleBadge, SampleBanner, useCollection } from "./shared";

const FORM_ID = "client-form";

/** Fixed-size logo box; the image is contained, and a broken or missing URL shows a neutral placeholder. */
function LogoPreview({ src, name, className }: { src: string; name: string; className?: string }) {
  const [failed, setFailed] = useState("");
  const usable = isImageLocation(src) && failed !== src;
  return (
    <div
      className={cn(
        "flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3",
        className
      )}
    >
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL or site path
        <img
          src={src.trim()}
          alt={name ? `${name} logo` : "Logo preview"}
          className="h-full w-full object-contain"
          onError={() => setFailed(src)}
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-xs text-slate-400">
          <ImageOff aria-hidden="true" className="size-5" />
          {src.trim() ? "Can’t show this image" : "No logo yet"}
        </span>
      )}
    </div>
  );
}

/** Client logos (LANDING_V1 §1.3): a grid of logo previews, create/edit drawer and delete confirmation. */
export function ClientLogos() {
  const c = useCollection<Client>({
    key: "website:clients",
    load: getClients,
    remove: deleteClient,
    save: (clientId, sortOrder) => saveClient(clientId, { sortOrder }),
    noun: "client",
  });

  const addButton = (size?: "sm") =>
    c.canWrite ? (
      <Button size={size} onClick={c.openCreate} icon={<Plus aria-hidden="true" />}>
        Add client logo
      </Button>
    ) : undefined;

  const renderBody = () => {
    if (c.firstLoad && c.list.error) {
      return (
        <ErrorState
          title="Client logos couldn’t be loaded"
          description={c.list.error}
          onRetry={c.list.reload}
          retrying={c.list.loading}
        />
      );
    }
    if (c.firstLoad) {
      return (
        <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-44 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      );
    }
    if (!c.items.length) {
      return (
        <EmptyState
          icon={Building}
          title="No client logos yet"
          description="Add logos of businesses you’ve powered. Active logos show on the home page."
          action={addButton("sm")}
        />
      );
    }
    return (
      <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {c.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 p-3",
              c.drawerOpen && c.editing?.id === item.id && "border-brand-300 bg-brand-50/40"
            )}
          >
            <LogoPreview src={item.logoUrl} name={item.name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900" title={item.name}>
                {item.name}
              </p>
              {item.website ? (
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  <span className="truncate">{item.website.replace(/^https?:\/\//i, "")}</span>
                  <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-sm text-slate-400">No website</p>
              )}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge type="catalog" status={item.isActive !== false} />
                {item.sample && <SampleBadge />}
              </div>
              {c.canWrite && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${item.name}`}
                    title="Edit"
                    onClick={() => c.openEdit(item)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-red-50 hover:text-red-700"
                    aria-label={`Delete ${item.name}`}
                    title="Delete"
                    onClick={() => c.askDelete(item)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <AdminPage
      module="clients"
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

      <Card as="section" aria-labelledby="client-logos-heading">
        <ListCardHeader
          title={<span id="client-logos-heading">All client logos</span>}
          count={c.firstLoad ? undefined : c.items.length}
          description="Only show logos of businesses that agreed to be listed."
        />
        {renderBody()}
      </Card>

      <EditorDrawer
        open={c.drawerOpen}
        onClose={c.closeDrawer}
        saving={c.saving}
        formId={FORM_ID}
        title={c.editing ? "Edit client logo" : "Add client logo"}
        description={c.editing ? c.editing.name : "Fields marked * are required."}
        submitLabel={c.editing ? "Save changes" : "Add client logo"}
        noun="client logo"
        formError={c.formError}
        sample={c.editing?.sample}
      >
        <ClientForm
          key={c.formKey}
          client={c.editing}
          onSubmit={(input) =>
            c.runSave((clientId) => saveClient(clientId, clientId ? input : { ...input, sortOrder: c.nextSortOrder }))
          }
        />
      </EditorDrawer>

      <DeleteDialog
        open={Boolean(c.pendingDelete)}
        noun="client logo"
        subject={c.pendingDelete ? `the logo for “${c.pendingDelete.name}”` : ""}
        deleting={c.deleting}
        onClose={c.cancelDelete}
        onConfirm={c.confirmDelete}
      />
    </AdminPage>
  );
}

type ClientErrors = Partial<Record<"name" | "logoUrl" | "website", string>>;

function ClientForm({ client, onSubmit }: { client: Client | null; onSubmit: (input: ClientInput) => void }) {
  const [name, setName] = useState(client?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(client?.logoUrl ?? "");
  const [website, setWebsite] = useState(client?.website ?? "");
  const [isActive, setIsActive] = useState(client?.isActive ?? true);
  const [errors, setErrors] = useState<ClientErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      name: lengthError(name, "Name", { min: 1, max: WEBSITE_LIMITS.clientName }),
      logoUrl: imageLocationError(logoUrl, "Logo", { required: true }),
      website: validateUrlField(website, "Website"),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ name: name.trim(), logoUrl: logoUrl.trim(), website: blankToNull(website), isActive });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Client name" required error={errors.name} helper="Used as the logo’s alt text on the website.">
        <Input value={name} maxLength={WEBSITE_LIMITS.clientName} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field
        label="Logo"
        required
        error={errors.logoUrl}
        helper="An https:// link or a site path such as /clients/acme.svg. SVG or a transparent PNG looks best."
      >
        <Input
          type="text"
          inputMode="url"
          value={logoUrl}
          maxLength={LIMITS.url}
          placeholder="/clients/acme.svg"
          onChange={(event) => setLogoUrl(event.target.value)}
        />
      </Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">Preview</p>
        <LogoPreview key={logoUrl} src={logoUrl} name={name} className="h-28" />
      </div>
      <Field label="Website" error={errors.website} helper="Optional. An https:// link.">
        <Input
          type="text"
          inputMode="url"
          value={website}
          maxLength={LIMITS.url}
          placeholder="https://"
          onChange={(event) => setWebsite(event.target.value)}
        />
      </Field>
      <Switch
        label="Show on the website"
        description="Hidden logos stay here but aren’t shown to customers."
        checked={isActive}
        onChange={setIsActive}
      />
    </form>
  );
}
