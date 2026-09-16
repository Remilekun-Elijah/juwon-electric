"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import { Alert, Avatar, Badge, Button, Drawer, ErrorState, Field, Input, Skeleton, Textarea } from "@/components/admin/kit";
import { normalizeRole, roleLabels } from "@/lib/admin/capabilities";
import { errorMessage, formatDateTime } from "@/lib/admin/format";
import { ApiError, getStaffMember, updateStaff } from "@/lib/api/admin";
import type { AdminUser, StaffMember } from "@/lib/api/types";
import { LIMITS, PHONE_MESSAGE, isValidPhone, linesOf, validateUrlField } from "@/lib/validation";

type StaffProfileDrawerProps = {
  staffId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
};

/** Team member profile (GET /admin/staff/:id) with the profile editor for `staff:write`. */
export function StaffProfileDrawer({ staffId, open, onClose, onSaved }: StaffProfileDrawerProps) {
  const member = useAdminQuery(`staff-member|${staffId}`, () => getStaffMember(staffId ?? ""), {
    enabled: Boolean(staffId),
  });
  const data = member.data?.id === staffId ? member.data : undefined;

  return (
    <Drawer
      open={open && Boolean(staffId)}
      onClose={onClose}
      size="lg"
      title={data?.name || "Staff profile"}
      description={data?.email}
    >
      {!data && member.error ? (
        <ErrorState title="Profile couldn’t be loaded" description={member.error} onRetry={member.reload} retrying={member.loading} />
      ) : !data ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <ProfileBody
          key={`${data.id}-${data.updatedAt}`}
          member={data}
          onSaved={(updated) => {
            member.setData((current) => (current ? { ...current, ...updated } : current));
            onSaved(updated);
          }}
        />
      )}
    </Drawer>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <span className="text-slate-400">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <Badge key={`${item}-${index}`} tone="neutral">
          {item}
        </Badge>
      ))}
    </span>
  );
}

function ProfileBody({ member, onSaved }: { member: StaffMember; onSaved: (user: StaffMember) => void }) {
  const { can } = useAdmin();
  const [editing, setEditing] = useState(false);
  const role = normalizeRole(member.role);
  const profile = member.profile ?? { areaCoverage: [], certifications: [], bio: null, avatarUrl: null };

  if (editing) {
    return (
      <ProfileForm
        member={member}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          onSaved(updated);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={member.name || member.email} src={profile.avatarUrl} size="xl" decorative />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone={role ? "brand" : "neutral"}>{role ? roleLabels[role] : "No role"}</Badge>
            <Badge tone={member.isActive ? "success" : "neutral"} dot>
              {member.isActive ? "Active" : "Deactivated"}
            </Badge>
          </div>
          {typeof member.openJobs === "number" && (
            <p className="text-sm text-slate-600">
              {member.openJobs === 1 ? "1 open job" : `${member.openJobs} open jobs`}
            </p>
          )}
        </div>
      </div>

      <DetailList
        items={[
          { label: "Email", value: <a href={`mailto:${member.email}`} className="text-brand-700 hover:underline">{member.email}</a> },
          { label: "Phone", value: member.phone || "—" },
          { label: "Areas covered", full: true, value: <Chips items={profile.areaCoverage} empty="No areas yet" /> },
          { label: "Certifications", full: true, value: <Chips items={profile.certifications} empty="None listed" /> },
          { label: "Bio", full: true, value: <span className="whitespace-pre-line">{profile.bio || "—"}</span> },
          { label: "Last sign-in", value: member.lastLoginAt ? formatDateTime(member.lastLoginAt) : "Never" },
          { label: "Joined", value: formatDateTime(member.createdAt) },
        ]}
      />

      {can("staff:write") && (
        <Button variant="outline" icon={<Pencil aria-hidden="true" />} onClick={() => setEditing(true)}>
          Edit profile
        </Button>
      )}
      <p className="text-xs text-slate-500">Roles and account status are managed on the Accounts tab.</p>
    </>
  );
}

type Errors = Partial<Record<"phone" | "areas" | "certifications" | "bio" | "avatarUrl", string>>;

const listError = (items: string[], label: string, maxItems: number, maxLength: number) => {
  if (items.length > maxItems) return `${label} can have up to ${maxItems} entries.`;
  if (items.some((item) => item.length > maxLength)) return `Each entry must be ${maxLength} characters or fewer.`;
  return "";
};

function ProfileForm({
  member,
  onCancel,
  onSaved,
}: {
  member: StaffMember;
  onCancel: () => void;
  onSaved: (user: StaffMember) => void;
}) {
  const profile = member.profile ?? { areaCoverage: [], certifications: [], bio: null, avatarUrl: null };
  const [phone, setPhone] = useState(member.phone ?? "");
  const [areas, setAreas] = useState(profile.areaCoverage.join("\n"));
  const [certifications, setCertifications] = useState(profile.certifications.join("\n"));
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const areaList = linesOf(areas);
  const certificationList = linesOf(certifications);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const found = Object.fromEntries(
      Object.entries({
        phone: phone.trim() && !isValidPhone(phone) ? PHONE_MESSAGE : "",
        areas: listError(areaList, "Areas covered", LIMITS.staffAreas, LIMITS.staffArea),
        certifications: listError(certificationList, "Certifications", LIMITS.staffCertifications, LIMITS.staffCertification),
        bio: bio.trim().length > LIMITS.staffBio ? `Bio must be ${LIMITS.staffBio} characters or fewer.` : "",
        avatarUrl: validateUrlField(avatarUrl, "Photo URL"),
      }).filter(([, value]) => value)
    ) as Errors;
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const updated = await updateStaff(member.id, {
        phone: phone.trim() || null,
        profile: {
          areaCoverage: areaList,
          certifications: certificationList,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        },
      });
      toast.success("Staff member updated.");
      onSaved(updated);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) setFormError(errorMessage(error));
      else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && (
        <Alert tone="danger" onDismiss={() => setFormError("")}>
          {formError}
        </Alert>
      )}
      <Field label="Phone" error={errors.phone}>
        <Input type="tel" value={phone} maxLength={LIMITS.phoneNumber} onChange={(event) => setPhone(event.target.value)} />
      </Field>
      <Field
        label="Areas covered"
        error={errors.areas}
        helper={`One area per line, up to ${LIMITS.staffAreas}. ${areaList.length}/${LIMITS.staffAreas}`}
      >
        <Textarea rows={4} value={areas} onChange={(event) => setAreas(event.target.value)} placeholder={"Lekki\nIkeja"} />
      </Field>
      <Field
        label="Certifications"
        error={errors.certifications}
        helper={`One per line, up to ${LIMITS.staffCertifications}. ${certificationList.length}/${LIMITS.staffCertifications}`}
      >
        <Textarea rows={3} value={certifications} onChange={(event) => setCertifications(event.target.value)} />
      </Field>
      <Field label="Bio" error={errors.bio} helper={`${bio.length}/${LIMITS.staffBio}`}>
        <Textarea value={bio} maxLength={LIMITS.staffBio} onChange={(event) => setBio(event.target.value)} />
      </Field>
      <Field label="Photo URL" error={errors.avatarUrl} helper="An https:// link or a path starting with /.">
        <Input type="url" value={avatarUrl} maxLength={LIMITS.url} onChange={(event) => setAvatarUrl(event.target.value)} />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} loadingText="Saving…">
          Save profile
        </Button>
      </div>
    </form>
  );
}
