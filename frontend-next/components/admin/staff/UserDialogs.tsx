"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Alert, Button, Dialog, Field, Input, Select } from "@/components/ui";
import { normalizeRole, roleOptions } from "@/lib/admin/capabilities";
import { errorMessage } from "@/lib/admin/format";
import { ApiError, createUser, setUserRole, updateUser } from "@/lib/api/admin";
import type { AdminUser, Role } from "@/lib/api/types";
import { LIMITS, PHONE_MESSAGE, isValidEmail, isValidPhone } from "@/lib/validation";

type Errors = Partial<Record<"name" | "email" | "role" | "phone", string>>;

const isValidation = (error: unknown) => error instanceof ApiError && error.status === 400;

const validateName = (name: string) => {
  const value = name.trim();
  if (!value) return "Enter a name.";
  if (value.length > LIMITS.personName) return `Name must be ${LIMITS.personName} characters or fewer.`;
  return "";
};

const validatePhone = (phone: string) => (phone.trim() && !isValidPhone(phone) ? PHONE_MESSAGE : "");

const clean = (errors: Errors): Errors =>
  Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as Errors;

/** Dialog shell with a submit button wired to the inner form by id. */
function FormDialog({
  open,
  onClose,
  title,
  description,
  submitLabel,
  saving,
  children,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  saving: boolean;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = `user-form-${useId().replace(/:/g, "")}`;
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        {children}
      </form>
    </Dialog>
  );
}

/* ---------- Invite ---------- */

export function InviteUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: AdminUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("");
    setPhone("");
    setErrors({});
    setFormError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const found = clean({
      name: validateName(name),
      email: isValidEmail(email) ? "" : "Enter a valid email address.",
      role: role ? "" : "Choose a role.",
      phone: validatePhone(phone),
    });
    setErrors(found);
    if (Object.keys(found).length || !role) return;

    setSaving(true);
    try {
      const created = await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || null,
      });
      toast.success(`Account created. We’ve emailed ${created.email} a reset token to set their password.`, {
        description:
          "The token expires after 30 minutes. If it has expired, they can use “Forgot password?” on the sign-in page to get a new one.",
        duration: 10000,
      });
      onCreated(created);
      close();
    } catch (error) {
      if (isValidation(error)) setFormError(errorMessage(error));
      else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Invite user"
      description="They’ll get an email with a link to set their password before they can sign in."
      submitLabel="Send invite"
      saving={saving}
      onSubmit={submit}
    >
      {formError && (
        <Alert tone="danger" onDismiss={() => setFormError("")}>
          {formError}
        </Alert>
      )}
      <Field label="Name" required error={errors.name}>
        <Input value={name} maxLength={LIMITS.personName} autoComplete="off" onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Email address" required error={errors.email}>
        <Input
          type="email"
          value={email}
          maxLength={LIMITS.email}
          autoComplete="off"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label="Role" required error={errors.role} helper="The role decides which parts of the admin they can use.">
        <Select
          value={role}
          placeholder="Choose a role"
          options={roleOptions}
          onChange={(event) => setRole(event.target.value as Role)}
        />
      </Field>
      <Field label="Phone" error={errors.phone} helper="Optional.">
        <Input
          type="tel"
          value={phone}
          maxLength={LIMITS.phoneNumber}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

/* ---------- Edit name and phone ---------- */

export function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}) {
  return user ? <EditUserForm key={user.id} user={user} onClose={onClose} onSaved={onSaved} /> : null;
}

function EditUserForm({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (user: AdminUser) => void }) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const found = clean({ name: validateName(name), phone: validatePhone(phone) });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const updated = await updateUser(user.id, { name: name.trim(), phone: phone.trim() || null });
      toast.success("User updated.");
      onSaved(updated);
      onClose();
    } catch (error) {
      if (isValidation(error)) setFormError(errorMessage(error));
      else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Edit user"
      description={user.email}
      submitLabel="Save changes"
      saving={saving}
      onSubmit={submit}
    >
      {formError && (
        <Alert tone="danger" onDismiss={() => setFormError("")}>
          {formError}
        </Alert>
      )}
      <Field label="Name" required error={errors.name}>
        <Input value={name} maxLength={LIMITS.personName} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Phone" error={errors.phone} helper="Leave empty to remove.">
        <Input type="tel" value={phone} maxLength={LIMITS.phoneNumber} onChange={(event) => setPhone(event.target.value)} />
      </Field>
    </FormDialog>
  );
}

/* ---------- Change role ---------- */

export function RoleDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}) {
  return user ? <RoleForm key={user.id} user={user} onClose={onClose} onSaved={onSaved} /> : null;
}

function RoleForm({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (user: AdminUser) => void }) {
  const current = normalizeRole(user.role);
  const [role, setRole] = useState<Role | "">(current ?? "");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (!role) {
      setFormError("Choose a role.");
      return;
    }
    if (role === current) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const updated = await setUserRole(user.id, role);
      toast.success("Role updated.");
      onSaved(updated);
      onClose();
    } catch (error) {
      if (isValidation(error)) setFormError(errorMessage(error));
      else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Change role"
      description={`${user.name || user.email} gets the new role’s access on their next request.`}
      submitLabel="Update role"
      saving={saving}
      onSubmit={submit}
    >
      {formError && (
        <Alert tone="danger" onDismiss={() => setFormError("")}>
          {formError}
        </Alert>
      )}
      <Field label="Role" required>
        <Select
          value={role}
          placeholder="Choose a role"
          options={roleOptions}
          onChange={(event) => setRole(event.target.value as Role)}
        />
      </Field>
      <p className="text-sm text-slate-500">Only a super admin can give or change the Super admin and Admin roles.</p>
    </FormDialog>
  );
}
