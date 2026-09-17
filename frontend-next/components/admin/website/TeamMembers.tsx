"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, SearchX, Trash2, UsersRound } from "lucide-react";
import {
  Alert,
  Avatar,
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
import {
  WEBSITE_LIMITS,
  blankToNull,
  compactErrors,
  httpsUrlError,
  imageLocationError,
  lengthError,
  reorderUpdates,
} from "@/lib/admin/website";
import { LIMITS } from "@/lib/validation";
import { deleteTeamMember, getTeamMembers, saveTeamMember } from "@/lib/api/admin";
import type { TeamMember, TeamMemberInput } from "@/lib/api/types";
import { DeleteDialog, EditorDrawer, SampleBadge, SampleBanner, useCollection } from "./shared";

const ALL = "__all";
const FORM_ID = "team-member-form";
const GROUP_LIST_ID = "team-group-suggestions";

/** Suggested groups for a new team (TEAM_AND_MOTION_V1 §1); existing groups are suggested first. */
const DEFAULT_GROUPS = ["Leadership", "Engineering & installations", "Sales & customer care", "Operations"];

/** The bio is one line of plain text on the server: line breaks become spaces as the admin types. */
const oneLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, " ");

/**
 * Team members (TEAM_AND_MOTION_V1 §2): list with avatars, a group filter and ▲▼ order, create/edit drawer with a
 * photo preview, and delete confirmation.
 */
export function TeamMembers() {
  const c = useCollection<TeamMember>({
    key: "website:team",
    load: getTeamMembers,
    remove: deleteTeamMember,
    save: (memberId, sortOrder) => saveTeamMember(memberId, { sortOrder }),
    noun: "team member",
  });
  const [group, setGroup] = useState(ALL);

  // Groups in website order: the order in which each group first appears in the sorted list.
  const groups = useMemo(
    () => [...new Set(c.items.map((item) => item.group.trim()).filter(Boolean))],
    [c.items]
  );
  const suggestions = useMemo(() => [...new Set([...groups, ...DEFAULT_GROUPS])], [groups]);
  const activeGroup = group === ALL || groups.includes(group) ? group : ALL;
  const visible = c.items.filter((item) => activeGroup === ALL || item.group.trim() === activeGroup);
  const visibleIds = visible.map((item) => item.id);
  const filterOptions = [{ value: ALL, label: "All groups" }, ...groups.map((value) => ({ value, label: value }))];
  const colSpan = 5;

  const move = (item: TeamMember, direction: -1 | 1) =>
    c.applyOrder(item.id, reorderUpdates(c.items, visibleIds, item.id, direction));

  const addButton = (size?: "sm") =>
    c.canWrite ? (
      <Button size={size} onClick={c.openCreate} icon={<Plus aria-hidden="true" />}>
        Add team member
      </Button>
    ) : undefined;

  const renderRows = () => {
    if (c.firstLoad && c.list.error) {
      return (
        <TableEmpty colSpan={colSpan}>
          <ErrorState
            title="The team couldn’t be loaded"
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
            <Skeleton className="h-11 w-full" />
          </TD>
        </TR>
      ));
    }
    if (!c.items.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={UsersRound}
          title="No team members yet"
          description="Add the people behind your installations. Active team members show on the Meet the team page."
          action={addButton("sm")}
        />
      );
    }
    if (!visible.length) {
      return (
        <TableEmpty
          colSpan={colSpan}
          icon={SearchX}
          title="No team members in this group"
          description="Choose another group or show all."
          action={
            <Button size="sm" variant="outline" onClick={() => setGroup(ALL)}>
              Show all
            </Button>
          }
        />
      );
    }
    return visible.map((item, index) => (
      <TR key={item.id} selected={c.drawerOpen && c.editing?.id === item.id}>
        <TD className="max-w-[360px]">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={item.name} src={item.photoUrl} size="md" decorative className="shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="truncate font-medium text-slate-900">{item.name}</p>
                {item.sample && <SampleBadge />}
              </div>
              <p className="truncate text-sm text-slate-500">{item.role}</p>
              <p className="truncate text-xs text-slate-500 md:hidden">{item.group}</p>
            </div>
          </div>
        </TD>
        <TD className="hidden max-w-[200px] md:table-cell">
          <span className="block truncate text-slate-700">{item.group}</span>
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
                aria-label={`Move ${item.name} up`}
                title="Move up"
                disabled={index === 0 || Boolean(c.moving)}
                onClick={() => move(item, -1)}
              >
                <ChevronUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${item.name} down`}
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
        </TD>
      </TR>
    ));
  };

  return (
    <AdminPage
      module="team"
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
        aria-label="All team members"
        header={
          <ListCardHeader
            title="All team members"
            count={c.firstLoad ? undefined : c.items.length}
            description="The website shows active team members in this order, grouped in the order the groups first appear."
          >
            <Select
              aria-label="Filter by group"
              className="sm:w-[240px]"
              value={activeGroup}
              options={filterOptions}
              onChange={(event) => setGroup(event.target.value)}
            />
          </ListCardHeader>
        }
      >
        <THead>
          <TH>Team member</TH>
          <TH className="hidden md:table-cell">Group</TH>
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
        title={c.editing ? "Edit team member" : "Add team member"}
        description={c.editing ? c.editing.name : "Fields marked * are required."}
        submitLabel={c.editing ? "Save changes" : "Add team member"}
        noun="team member"
        formError={c.formError}
        sample={c.editing?.sample}
      >
        <TeamMemberForm
          key={c.formKey}
          member={c.editing}
          groups={suggestions}
          defaultGroup={activeGroup === ALL ? "" : activeGroup}
          onSubmit={(input) =>
            c.runSave((memberId) =>
              saveTeamMember(memberId, memberId ? input : { ...input, sortOrder: c.nextSortOrder })
            )
          }
        />
      </EditorDrawer>

      <DeleteDialog
        open={Boolean(c.pendingDelete)}
        noun="team member"
        subject={c.pendingDelete ? c.pendingDelete.name : ""}
        deleting={c.deleting}
        onClose={c.cancelDelete}
        onConfirm={c.confirmDelete}
      />
    </AdminPage>
  );
}

type TeamErrors = Partial<Record<"name" | "role" | "group" | "bio" | "photoUrl" | "linkedinUrl", string>>;

function TeamMemberForm({
  member,
  groups,
  defaultGroup,
  onSubmit,
}: {
  member: TeamMember | null;
  groups: string[];
  defaultGroup: string;
  onSubmit: (input: TeamMemberInput) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "");
  const [group, setGroup] = useState(member?.group ?? defaultGroup);
  const [bio, setBio] = useState(member?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(member?.photoUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(member?.linkedinUrl ?? "");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [errors, setErrors] = useState<TeamErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = compactErrors({
      name: lengthError(name, "Name", { min: 1, max: WEBSITE_LIMITS.teamName }),
      role: lengthError(role, "Role", { min: 1, max: WEBSITE_LIMITS.teamRole }),
      group: lengthError(group, "Group", { min: 1, max: WEBSITE_LIMITS.teamGroup }),
      bio: lengthError(bio, "Bio", { max: WEBSITE_LIMITS.teamBio }),
      photoUrl: imageLocationError(photoUrl, "Photo"),
      linkedinUrl: httpsUrlError(linkedinUrl, "LinkedIn URL"),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      group: group.trim(),
      bio: blankToNull(oneLine(bio)),
      photoUrl: blankToNull(photoUrl),
      linkedinUrl: blankToNull(linkedinUrl),
      isActive,
    });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name}>
          <Input
            value={name}
            maxLength={WEBSITE_LIMITS.teamName}
            placeholder="Full name"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Input
            value={role}
            maxLength={WEBSITE_LIMITS.teamRole}
            placeholder="Lead installation engineer"
            onChange={(event) => setRole(event.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Group"
        required
        error={errors.group}
        helper="Team members are grouped under this heading on the website. Pick an existing group or type a new one."
      >
        <Input
          value={group}
          list={GROUP_LIST_ID}
          maxLength={WEBSITE_LIMITS.teamGroup}
          placeholder="Engineering & installations"
          autoComplete="off"
          onChange={(event) => setGroup(event.target.value)}
        />
      </Field>
      <datalist id={GROUP_LIST_ID}>
        {groups.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <Field
        label="Bio"
        error={errors.bio}
        helper={`Optional. One or two sentences about their work. ${oneLine(bio).trim().length}/${WEBSITE_LIMITS.teamBio}`}
      >
        <Textarea
          rows={3}
          value={bio}
          maxLength={WEBSITE_LIMITS.teamBio}
          placeholder="Sizes systems and leads installations across Nigeria."
          onChange={(event) => setBio(oneLine(event.target.value))}
        />
      </Field>
      <ImageUpload
        label="Photo"
        value={photoUrl}
        onChange={setPhotoUrl}
        purpose="team"
        error={errors.photoUrl}
        helper="Optional. Square photos look best. Without one, the website shows their initials."
        linkHelper="An https:// link or a site path such as /team/ada.jpg."
        previewAlt={name.trim() ? `Photo of ${name.trim()}` : "Photo preview"}
      />
      <Field label="LinkedIn URL" error={errors.linkedinUrl} helper="Optional. Their public LinkedIn profile link.">
        <Input
          type="url"
          inputMode="url"
          value={linkedinUrl}
          maxLength={LIMITS.url}
          placeholder="https://www.linkedin.com/in/"
          onChange={(event) => setLinkedinUrl(event.target.value)}
        />
      </Field>
      <Switch
        label="Show on the website"
        description="Hidden team members stay here but aren’t shown on the team page."
        checked={isActive}
        onChange={setIsActive}
      />
    </form>
  );
}
