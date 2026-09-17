/**
 * Admin modules: route, navigation group, page header copy and the capability that shows them.
 * Capabilities only hide UI (contract §1.5); the server enforces every route.
 */
import {
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  FolderTree,
  HardHat,
  History,
  Images,
  LayoutDashboard,
  Mails,
  MessageSquareText,
  Package,
  PackageSearch,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "./capabilities";

export type ModuleId =
  | "dashboard"
  | "my-jobs"
  | "orders"
  | "new-sale"
  | "installations"
  | "carts"
  | "products"
  | "categories"
  | "inventory"
  | "packages"
  | "services"
  | "portfolio"
  | "contacts"
  | "newsletter"
  | "vacancies"
  | "staff"
  | "activity"
  | "settings";

export type NavGroupId = "overview" | "sales" | "catalog" | "customers" | "team" | "system";

export type AdminModule = {
  id: ModuleId;
  href: string;
  capability: Capability;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
  eyebrow: string;
  title: string;
  description: string;
};

export const modules: AdminModule[] = [
  {
    id: "dashboard",
    href: "/admin",
    capability: "dashboard:read",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "overview",
    eyebrow: "Overview",
    title: "Dashboard",
    description: "Sales, orders, stock and jobs at a glance.",
  },
  {
    id: "my-jobs",
    href: "/admin/my-jobs",
    capability: "jobs:update-own",
    label: "My jobs",
    icon: HardHat,
    group: "overview",
    eyebrow: "Field work",
    title: "My jobs",
    description: "Installations assigned to you. Update the status and checklist on site.",
  },
  {
    id: "orders",
    href: "/admin/orders",
    capability: "orders:read",
    label: "Orders",
    icon: ReceiptText,
    group: "sales",
    eyebrow: "Sales",
    title: "Orders",
    description: "Review orders, record payments, move them through fulfilment and assign engineers.",
  },
  {
    id: "new-sale",
    href: "/admin/orders/new",
    capability: "orders:create",
    label: "New sale",
    icon: Store,
    group: "sales",
    eyebrow: "Sales",
    title: "New in-store sale",
    description: "Record a sale made in the store. Prices come from the products.",
  },
  {
    id: "installations",
    href: "/admin/installations",
    capability: "jobs:read",
    label: "Installations",
    icon: ClipboardList,
    group: "sales",
    eyebrow: "Sales",
    title: "Installation jobs",
    description: "Schedule installations, assign engineers and follow progress.",
  },
  {
    id: "carts",
    href: "/admin/carts",
    capability: "orders:read",
    label: "Carts",
    icon: ShoppingCart,
    group: "sales",
    eyebrow: "Sales",
    title: "Carts",
    description: "Carts customers saved but haven’t ordered yet.",
  },
  {
    id: "products",
    href: "/admin/products",
    capability: "products:read",
    label: "Products",
    icon: PackageSearch,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Products",
    description: "Individual products with prices, images and specifications.",
  },
  {
    id: "categories",
    href: "/admin/categories",
    capability: "products:read",
    label: "Categories",
    icon: FolderTree,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Categories",
    description: "How products are grouped, and the specifications each group records.",
  },
  {
    id: "inventory",
    href: "/admin/inventory",
    capability: "inventory:read",
    label: "Inventory",
    icon: Boxes,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Inventory",
    description: "Stock levels, adjustments and movement history.",
  },
  {
    id: "packages",
    href: "/admin/packages",
    capability: "content:read",
    label: "Packages",
    icon: Package,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Packages",
    description: "Inverter and solar packages shown on the shop.",
  },
  {
    id: "services",
    href: "/admin/services",
    capability: "content:read",
    label: "Services",
    icon: Wrench,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Services",
    description: "What you offer and who you serve, as shown on the Services page.",
  },
  {
    id: "portfolio",
    href: "/admin/portfolio",
    capability: "content:read",
    label: "Portfolio",
    icon: Images,
    group: "catalog",
    eyebrow: "Catalog",
    title: "Portfolio",
    description: "Photos of completed installations.",
  },
  {
    id: "contacts",
    href: "/admin/contacts",
    capability: "leads:read",
    label: "Messages",
    icon: MessageSquareText,
    group: "customers",
    eyebrow: "Customers",
    title: "Messages",
    description: "Enquiries sent from the contact form. Reply by email from here.",
  },
  {
    id: "newsletter",
    href: "/admin/newsletter",
    capability: "leads:read",
    label: "Newsletter",
    icon: Mails,
    group: "customers",
    eyebrow: "Customers",
    title: "Newsletter",
    description: "People subscribed to email updates.",
  },
  {
    id: "vacancies",
    href: "/admin/vacancies",
    capability: "vacancies:read",
    label: "Vacancies",
    icon: BriefcaseBusiness,
    group: "team",
    eyebrow: "Team",
    title: "Vacancies",
    description: "Job openings for the careers page. Only open vacancies are public.",
  },
  {
    id: "staff",
    href: "/admin/staff",
    capability: "staff:read",
    label: "Staff & roles",
    icon: UserCog,
    group: "team",
    eyebrow: "Team",
    title: "Staff & roles",
    description: "Admin accounts, roles, and engineer coverage and certifications.",
  },
  {
    id: "activity",
    href: "/admin/activity",
    capability: "audit:read",
    label: "Activity",
    icon: History,
    group: "system",
    eyebrow: "System",
    title: "Activity",
    description: "Sign-ins and changes made in the admin, newest first.",
  },
  {
    id: "settings",
    href: "/admin/settings",
    capability: "settings:read",
    label: "Settings",
    icon: Settings,
    group: "system",
    eyebrow: "System",
    title: "Settings",
    description: "Business details, notification emails, payments and stock alerts.",
  },
];

export const navGroups: { id: NavGroupId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "catalog", label: "Catalog" },
  { id: "customers", label: "Customers" },
  { id: "team", label: "Team" },
  { id: "system", label: "System" },
];

export const getModule = (id: ModuleId): AdminModule => modules.find((module) => module.id === id) ?? modules[0];

/** Module for a pathname: the longest matching href wins, so /admin/orders beats /admin. */
export const getModuleForPath = (pathname: string): AdminModule | null =>
  [...modules]
    .sort((a, b) => b.href.length - a.href.length)
    .find((module) => pathname === module.href || pathname.startsWith(`${module.href}/`)) ?? null;

/** Where to send an admin after sign-in or when a page is hidden for their role. */
export const firstAllowedHref = (can: (capability: Capability) => boolean) =>
  modules.find((module) => can(module.capability))?.href ?? "/admin";

export const AUTH_PATHS = ["/admin/login", "/admin/reset-password"];
