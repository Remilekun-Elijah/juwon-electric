import {
  History,
  Images,
  LayoutDashboard,
  Mails,
  MessageSquareText,
  Package,
  ReceiptText,
  Wrench,
} from "lucide-react";

export const loginTokenKey = "je/admin-session";
export const adminUserKey = "je/admin-user";

export const modules = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "overview",
    eyebrow: "Overview",
    title: "Dashboard",
    description: "Sales, orders and customer messages at a glance.",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ReceiptText,
    group: "overview",
    eyebrow: "Sales",
    title: "Orders",
    description: "Review orders, update their status and see delivery details.",
  },
  {
    id: "activity",
    label: "Activity",
    icon: History,
    group: "overview",
    eyebrow: "Overview",
    title: "Activity",
    description: "Sign-ins and changes made in the admin, newest first.",
  },
  {
    id: "packages",
    label: "Packages",
    icon: Package,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Packages",
    description: "Inverter and solar packages shown on the shop.",
  },
  {
    id: "services",
    label: "Services",
    icon: Wrench,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Services",
    description: "What you offer, as shown on the Services page.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Images,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Portfolio",
    description: "Photos of completed installations.",
  },
  {
    id: "contacts",
    label: "Messages",
    icon: MessageSquareText,
    group: "customers",
    eyebrow: "Customers",
    title: "Messages",
    description: "Enquiries sent from the contact form. Reply by email from here.",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: Mails,
    group: "customers",
    eyebrow: "Customers",
    title: "Newsletter",
    description: "People subscribed to email updates.",
  },
];

export const navGroups = [
  { id: "overview", label: "Overview" },
  { id: "catalog", label: "Catalog" },
  { id: "customers", label: "Customers" },
];

export const getModule = (id) => modules.find((module) => module.id === id) || modules[0];

export const packageTypeOptions = [
  { value: "tubular", label: "Tubular" },
  { value: "lithium", label: "Lithium" },
  { value: "hybrid lithium", label: "Hybrid lithium" },
];

export const orderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Allowed values for writes; these mirror the backend enums. Stored legacy values stay readable.
export const ORDER_STATUSES = ["pending", "completed", "cancelled"];
export const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];
export const CONTACT_STATUSES = ["new", "contacted", "completed"];
export const NEWSLETTER_STATUSES = ["new", "active", "inactive"];

export const contactStatusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "completed", label: "Completed" },
];

export const emptyPackage = {
  type: "tubular",
  name: "",
  load: "",
  kva: "",
  volt: "",
  options: [
    { name: "Without solar", price: "", kits: "" },
    { name: "With solar", price: "", kits: "" },
  ],
  isActive: true,
};

export const emptyService = {
  title: "",
  subtitle: "",
  image: "",
  ctaLabel: "Let's go",
  ctaUrl: "/packages",
  isActive: true,
};

export const emptyPortfolio = {
  name: "",
  image: "",
  link: "",
  featured: false,
  mobile: true,
  isActive: true,
};

export const auditEntityOptions = [
  { value: "package", label: "Package" },
  { value: "service", label: "Service" },
  { value: "portfolio", label: "Portfolio item" },
  { value: "customerSegment", label: "Customer segment" },
  { value: "order", label: "Order" },
  { value: "contact", label: "Message" },
  { value: "newsletter", label: "Subscriber" },
];

const auditActionLabels = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "auth.password_reset_requested": "Password reset requested",
  "auth.password_reset": "Password reset",
  "contact.reply": "Replied to message",
  "order.status_change": "Order status changed",
  "newsletter.update": "Subscriber updated",
};

const auditVerbs = { create: "created", update: "updated", delete: "deleted" };

const toSentenceCase = (value = "") => {
  const text = String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

export const getAuditEntityLabel = (entity) =>
  auditEntityOptions.find((option) => option.value === entity)?.label || toSentenceCase(entity);

/** Sentence-case label for an audit action, e.g. "package.update" → "Package updated". */
export const getAuditActionLabel = (action = "") => {
  if (auditActionLabels[action]) return auditActionLabels[action];
  const [entity, verb] = String(action).split(".");
  if (entity && auditVerbs[verb]) return `${getAuditEntityLabel(entity)} ${auditVerbs[verb]}`;
  return toSentenceCase(action) || "Unknown action";
};

export const auditActionOptions = [
  ...Object.keys(auditActionLabels).filter((action) => action.startsWith("auth.")),
  ...["package", "service", "portfolio", "customerSegment"].flatMap((entity) =>
    Object.keys(auditVerbs).map((verb) => `${entity}.${verb}`)
  ),
  "order.status_change",
  "order.update",
  "order.delete",
  "contact.reply",
  "contact.update",
  "contact.delete",
  "newsletter.update",
  "newsletter.delete",
].map((value) => ({ value, label: getAuditActionLabel(value) }));
