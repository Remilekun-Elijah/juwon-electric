/**
 * Audit log labels (port of the Vite adminConstants audit helpers), extended with the API_CONTRACT_V3 actions and
 * entities (users, vacancies, catalog, inventory, orders, jobs, settings).
 */

export type AuditOption = { value: string; label: string };

export const auditEntityOptions: AuditOption[] = [
  { value: "package", label: "Package" },
  { value: "service", label: "Service" },
  { value: "portfolio", label: "Portfolio item" },
  { value: "customerSegment", label: "Customer segment" },
  { value: "order", label: "Order" },
  { value: "contact", label: "Message" },
  { value: "newsletter", label: "Subscriber" },
  { value: "user", label: "Admin user" },
  { value: "vacancy", label: "Vacancy" },
  { value: "category", label: "Category" },
  { value: "product", label: "Product" },
  { value: "job", label: "Installation job" },
  { value: "settings", label: "Settings" },
];

const auditActionLabels: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "auth.password_reset_requested": "Password reset requested",
  "auth.password_reset": "Password reset",
  "contact.reply": "Replied to message",
  "order.status_change": "Order status changed",
  "order.fulfillment_change": "Fulfilment status changed",
  "order.payment_change": "Payment status changed",
  "order.assign_engineer": "Engineer assigned to order",
  "newsletter.update": "Subscriber updated",
  "user.role_change": "Admin role changed",
  "user.deactivate": "Admin user deactivated",
  "user.reactivate": "Admin user reactivated",
  "vacancy.publish": "Vacancy published",
  "vacancy.unpublish": "Vacancy unpublished",
  "vacancy.close": "Vacancy closed",
  "inventory.adjust": "Stock adjusted",
  "job.assign": "Job assigned",
  "job.status_change": "Job status changed",
  "settings.update": "Settings updated",
};

const auditVerbs: Record<string, string> = { create: "created", update: "updated", delete: "deleted" };

const toSentenceCase = (value: unknown = "") => {
  const text = String(value ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

export const getAuditEntityLabel = (entity?: string | null) =>
  auditEntityOptions.find((option) => option.value === entity)?.label || toSentenceCase(entity);

/** Sentence-case label for an audit action, e.g. "package.update" → "Package updated". */
export const getAuditActionLabel = (action: string | null | undefined = "") => {
  const value = String(action ?? "");
  if (auditActionLabels[value]) return auditActionLabels[value];
  const [entity, verb] = value.split(".");
  if (entity && verb && auditVerbs[verb]) return `${getAuditEntityLabel(entity)} ${auditVerbs[verb]}`;
  return toSentenceCase(value) || "Unknown action";
};

const crud = (entity: string) => Object.keys(auditVerbs).map((verb) => `${entity}.${verb}`);

export const auditActionOptions: AuditOption[] = [
  ...Object.keys(auditActionLabels).filter((action) => action.startsWith("auth.")),
  ...["package", "service", "portfolio", "customerSegment"].flatMap(crud),
  "order.status_change",
  "order.update",
  "order.fulfillment_change",
  "order.payment_change",
  "order.assign_engineer",
  "order.delete",
  "contact.reply",
  "contact.update",
  "contact.delete",
  "newsletter.update",
  "newsletter.delete",
  "user.create",
  "user.update",
  "user.role_change",
  "user.deactivate",
  "user.reactivate",
  "vacancy.create",
  "vacancy.update",
  "vacancy.publish",
  "vacancy.unpublish",
  "vacancy.close",
  "vacancy.delete",
  ...crud("category"),
  ...crud("product"),
  "inventory.adjust",
  "job.create",
  "job.update",
  "job.assign",
  "job.status_change",
  "job.delete",
  "settings.update",
].map((value) => ({ value, label: getAuditActionLabel(value) }));

export type AuditTone = "neutral" | "success" | "danger" | "info";

export const getAuditActionTone = (action = ""): AuditTone => {
  if (action === "auth.login_failed" || action.endsWith(".delete")) return "danger";
  if (action.endsWith(".create")) return "success";
  if (action.startsWith("auth.")) return "info";
  return "neutral";
};
