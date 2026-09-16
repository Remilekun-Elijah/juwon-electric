/**
 * TODO(contract): in-memory stand-ins for API_CONTRACT_V3 endpoints that aren't on a backend branch yet.
 *
 * `lib/api/admin.ts` only falls back to these when the backend answers `404 "Route not found."`, so each
 * screen switches to the real endpoint as soon as it lands. Shapes, messages and transition rules follow
 * the contract. Data lives in memory for the tab's lifetime and is never sent anywhere.
 * Delete this file (and `withContractFallback`) once agents/be-integration is merged.
 */
import { ApiError } from "@/lib/api/client";
import type {
  AdminNotification,
  AdminUser,
  Category,
  CategoryInput,
  DashboardKpis,
  FulfillmentStatus,
  InstallationJob,
  InventoryItem,
  InventoryMovement,
  JobCreateInput,
  JobStatus,
  JobUpdateInput,
  MyJobUpdateInput,
  NotificationsPage,
  Order,
  Paged,
  PaymentStatus,
  Product,
  ProductInput,
  Role,
  Settings,
  SettingsInput,
  StaffMember,
  StaffProfile,
  StockAdjustmentInput,
  Vacancy,
  VacancyInput,
  VacancyStatus,
} from "@/lib/api/types";
import {
  ENGINEER_JOB_TRANSITIONS,
  FULFILLMENT_TRANSITIONS,
  JOB_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  VACANCY_TRANSITIONS,
  normalizeFulfillmentStatus,
  normalizePaymentStatus,
} from "./transitions";

/** Preview session on a pre-contract backend (seeded super admin / static token = every capability). */
export { CAPABILITIES as PREVIEW_CAPABILITIES } from "./capabilities";

/* ---------- Mock mode signal (drives the "preview data" banner) ---------- */

const mocked = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: string[] = [];

export const markMocked = (area: string) => {
  if (mocked.has(area)) return;
  mocked.add(area);
  snapshot = [...mocked].sort();
  listeners.forEach((listener) => listener());
};

export const subscribeMocked = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getMockedSnapshot = () => snapshot;
export const getMockedServerSnapshot = (): string[] => [];

/* ---------- Helpers ---------- */

const now = () => new Date().toISOString();
const daysFromNow = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniqueSlug = (base: string, taken: string[]) => {
  const root = slugify(base) || "item";
  let slug = root;
  for (let n = 2; taken.includes(slug); n += 1) slug = `${root}-${n}`;
  return slug;
};

export type PageQuery = { page?: number; limit?: number };

const pageOf = <T>(items: T[], { page = 1, limit = 50 }: PageQuery = {}): Paged<T> => {
  const size = Math.min(Math.max(1, limit), 100);
  const current = Math.max(1, page);
  return { items: clone(items.slice((current - 1) * size, current * size)), page: current, limit: size, total: items.length };
};

const matches = (q: string | undefined, ...values: (string | null | undefined)[]) => {
  const needle = (q || "").trim().toLowerCase();
  return !needle || values.some((value) => String(value ?? "").toLowerCase().includes(needle));
};

const notFound = (label: string) => new ApiError(`${label} not found.`, 404);
const conflict = (message: string) => new ApiError(message, 409);
const bad = (message: string) => new ApiError(message, 400);
const actor = { id: "mock-admin", email: "preview@juwonelectric.com" };

/* ---------- Seed data ---------- */

const emptyProfile = (): StaffProfile => ({ areaCoverage: [], certifications: [], bio: null, avatarUrl: null });

const users: AdminUser[] = [
  {
    id: "superadmin-seed",
    name: "Juwon Admin",
    email: "admin@juwonelectric.com",
    role: "superadmin",
    isActive: true,
    phone: "08030000001",
    profile: emptyProfile(),
    lastLoginAt: daysFromNow(0, 8),
    createdAt: daysFromNow(-200),
    updatedAt: daysFromNow(-10),
  },
  {
    id: "u-engineer-1",
    name: "Tunde Bakare",
    email: "tunde@juwonelectric.com",
    role: "engineer",
    isActive: true,
    phone: "08030000002",
    profile: {
      areaCoverage: ["Lekki", "Ajah", "Victoria Island"],
      certifications: ["NABCEP PV Associate"],
      bio: "Lead installer for lithium hybrid systems.",
      avatarUrl: null,
    },
    lastLoginAt: daysFromNow(-1, 7),
    createdAt: daysFromNow(-150),
    updatedAt: daysFromNow(-5),
  },
  {
    id: "u-engineer-2",
    name: "Chiamaka Obi",
    email: "chiamaka@juwonelectric.com",
    role: "engineer",
    isActive: true,
    phone: "08030000003",
    profile: { areaCoverage: ["Ikeja", "Yaba"], certifications: [], bio: null, avatarUrl: null },
    lastLoginAt: null,
    createdAt: daysFromNow(-90),
    updatedAt: daysFromNow(-20),
  },
  {
    id: "u-inventory-1",
    name: "Samuel Ade",
    email: "samuel@juwonelectric.com",
    role: "inventory",
    isActive: true,
    phone: null,
    profile: emptyProfile(),
    lastLoginAt: daysFromNow(-2, 9),
    createdAt: daysFromNow(-120),
    updatedAt: daysFromNow(-30),
  },
  {
    id: "u-hr-1",
    name: "Grace Eze",
    email: "grace@juwonelectric.com",
    role: "hr",
    isActive: false,
    phone: null,
    profile: emptyProfile(),
    lastLoginAt: daysFromNow(-60, 9),
    createdAt: daysFromNow(-180),
    updatedAt: daysFromNow(-40),
  },
];

const categories: Category[] = [
  {
    id: "cat-batteries",
    slug: "batteries",
    name: "Batteries",
    parentId: null,
    description: "Storage for inverter systems.",
    imageUrl: null,
    attributes: [
      { key: "capacityAh", label: "Capacity", type: "number", unit: "Ah" },
      { key: "voltage", label: "Voltage", type: "number", unit: "V" },
    ],
    isActive: true,
    sortOrder: 1,
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-100),
  },
  {
    id: "cat-lithium",
    slug: "lithium-batteries",
    name: "Lithium batteries",
    parentId: "cat-batteries",
    description: null,
    imageUrl: null,
    attributes: [{ key: "cycles", label: "Cycle life", type: "number", unit: null }],
    isActive: true,
    sortOrder: 1,
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-100),
  },
  {
    id: "cat-tubular",
    slug: "tubular-batteries",
    name: "Tubular batteries",
    parentId: "cat-batteries",
    description: null,
    imageUrl: null,
    attributes: [],
    isActive: true,
    sortOrder: 2,
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-100),
  },
  {
    id: "cat-panels",
    slug: "solar-panels",
    name: "Solar panels",
    parentId: null,
    description: "Monocrystalline and polycrystalline panels.",
    imageUrl: "/panel-1.webp",
    attributes: [{ key: "watts", label: "Power", type: "number", unit: "W" }],
    isActive: true,
    sortOrder: 2,
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-100),
  },
  {
    id: "cat-inverters",
    slug: "inverters",
    name: "Inverters",
    parentId: null,
    description: null,
    imageUrl: null,
    attributes: [{ key: "kva", label: "Rating", type: "number", unit: "kVA" }],
    isActive: false,
    sortOrder: 3,
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-100),
  },
];

const product = (partial: Partial<Product> & Pick<Product, "id" | "sku" | "name" | "price">): Product => {
  const stockQuantity = partial.stockQuantity ?? 0;
  const reorderLevel = partial.reorderLevel ?? 0;
  return {
    slug: slugify(partial.name),
    categoryId: null,
    brand: null,
    descriptionHtml: "",
    attributes: {},
    costPrice: null,
    currency: "NGN",
    images: [],
    status: "active",
    tags: [],
    createdAt: daysFromNow(-60),
    updatedAt: daysFromNow(-3),
    ...partial,
    stockQuantity,
    reorderLevel,
    lowStock: stockQuantity <= reorderLevel,
  };
};

const products: Product[] = [
  product({
    id: "p-lith-5kwh",
    sku: "BAT-LI-5KWH",
    name: "5kWh lithium battery",
    categoryId: "cat-lithium",
    brand: "Felicity",
    price: 1850000,
    costPrice: 1500000,
    stockQuantity: 3,
    reorderLevel: 4,
    attributes: { capacityAh: 100, voltage: 48, cycles: 6000 },
    descriptionHtml: "<p>Wall-mounted LiFePO4 battery with built-in BMS.</p>",
    tags: ["lithium", "hybrid"],
  }),
  product({
    id: "p-tub-220",
    sku: "BAT-TUB-220",
    name: "220Ah tubular battery",
    categoryId: "cat-tubular",
    brand: "Luminous",
    price: 320000,
    costPrice: 250000,
    stockQuantity: 24,
    reorderLevel: 8,
    attributes: { capacityAh: 220, voltage: 12 },
  }),
  product({
    id: "p-panel-450",
    sku: "PNL-MONO-450",
    name: "450W mono solar panel",
    categoryId: "cat-panels",
    brand: "Jinko",
    price: 145000,
    stockQuantity: 0,
    reorderLevel: 10,
    images: ["/panel-2.webp"],
    attributes: { watts: 450 },
  }),
  product({
    id: "p-inv-5kva",
    sku: "INV-HYB-5KVA",
    name: "5kVA hybrid inverter",
    categoryId: "cat-inverters",
    brand: "Growatt",
    price: 780000,
    stockQuantity: 7,
    reorderLevel: 2,
    status: "hidden",
    attributes: { kva: 5 },
  }),
];

const movements: InventoryMovement[] = [
  {
    id: "m-1",
    productId: "p-tub-220",
    sku: "BAT-TUB-220",
    productName: "220Ah tubular battery",
    change: 30,
    stockBefore: 0,
    stockAfter: 30,
    reason: "initial",
    referenceType: null,
    referenceId: null,
    note: null,
    createdBy: actor,
    createdAt: daysFromNow(-30),
  },
  {
    id: "m-2",
    productId: "p-tub-220",
    sku: "BAT-TUB-220",
    productName: "220Ah tubular battery",
    change: -6,
    stockBefore: 30,
    stockAfter: 24,
    reason: "sale",
    referenceType: "order",
    referenceId: "order-preview-1",
    note: null,
    createdBy: null,
    createdAt: daysFromNow(-4),
  },
  {
    id: "m-3",
    productId: "p-lith-5kwh",
    sku: "BAT-LI-5KWH",
    productName: "5kWh lithium battery",
    change: -1,
    stockBefore: 4,
    stockAfter: 3,
    reason: "damage",
    referenceType: null,
    referenceId: null,
    note: "Casing cracked in delivery.",
    createdBy: actor,
    createdAt: daysFromNow(-2),
  },
];

const vacancies: Vacancy[] = [
  {
    id: "v-1",
    slug: "solar-installation-technician",
    title: "Solar installation technician",
    department: "Operations",
    location: "Lagos",
    employmentType: "full-time",
    salaryRange: "₦250,000 – ₦350,000 monthly",
    descriptionHtml:
      "<p>Install and commission residential <strong>solar and inverter</strong> systems across Lagos.</p>",
    requirements: ["2+ years of electrical installation experience", "Comfortable working at height"],
    responsibilities: ["Mount panels and run cabling", "Commission inverters and batteries"],
    status: "open",
    postedAt: daysFromNow(-12),
    closedAt: null,
    createdBy: actor,
    createdAt: daysFromNow(-14),
    updatedAt: daysFromNow(-12),
  },
  {
    id: "v-2",
    slug: "sales-associate",
    title: "Sales associate",
    department: "Sales",
    location: "Lekki, Lagos",
    employmentType: "contract",
    salaryRange: null,
    descriptionHtml: "<p>Help customers choose the right package.</p>",
    requirements: [],
    responsibilities: [],
    status: "draft",
    postedAt: null,
    closedAt: null,
    createdBy: actor,
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-1),
  },
];

const checklist = (labels: string[], doneCount = 0) =>
  labels.map((label, index) => ({
    id: `c-${slugify(label)}`,
    label,
    done: index < doneCount,
    doneAt: index < doneCount ? daysFromNow(0, 9) : null,
    doneBy: index < doneCount ? "u-engineer-1" : null,
  }));

const engineerRef = (id: string | null) => {
  const user = users.find((item) => item.id === id);
  return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null;
};

const jobs: InstallationJob[] = [
  {
    id: "j-1",
    orderId: "order-preview-1",
    order: { id: "order-preview-1", name: "Adaeze Nwosu", phoneNumber: "08031234567", deliveryAddress: "12 Admiralty Way, Lekki" },
    engineerId: "u-engineer-1",
    engineer: engineerRef("u-engineer-1"),
    scheduledAt: daysFromNow(1, 9),
    durationEstimateMinutes: 240,
    address: "12 Admiralty Way, Lekki",
    status: "assigned",
    checklist: checklist(["Confirm roof access", "Mount panels", "Wire inverter", "Test changeover", "Walk customer through app"]),
    photos: [],
    notes: "Customer prefers morning. Gate code 4412.",
    completionNotes: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
  {
    id: "j-2",
    orderId: "order-preview-2",
    order: { id: "order-preview-2", name: "Bola Martins", phoneNumber: "08097654321", deliveryAddress: "4 Allen Avenue, Ikeja" },
    engineerId: "u-engineer-1",
    engineer: engineerRef("u-engineer-1"),
    scheduledAt: daysFromNow(0, 13),
    durationEstimateMinutes: 180,
    address: "4 Allen Avenue, Ikeja",
    status: "in_progress",
    checklist: checklist(["Isolate mains", "Install batteries", "Configure inverter"], 1),
    photos: [],
    notes: null,
    completionNotes: null,
    startedAt: daysFromNow(0, 12),
    completedAt: null,
    cancelledAt: null,
    createdAt: daysFromNow(-6),
    updatedAt: daysFromNow(0, 12),
  },
  {
    id: "j-3",
    orderId: "order-preview-3",
    order: { id: "order-preview-3", name: "Kelechi Uzo", phoneNumber: "08120000000", deliveryAddress: "8 Herbert Macaulay Way, Yaba" },
    engineerId: null,
    engineer: null,
    scheduledAt: daysFromNow(4, 11),
    durationEstimateMinutes: null,
    address: "8 Herbert Macaulay Way, Yaba",
    status: "unassigned",
    checklist: [],
    photos: [],
    notes: null,
    completionNotes: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
];

let settings: Settings = {
  business: { name: "Juwon Electric", email: "hello@juwonelectric.com", phone: "08030000000", address: "Lagos, Nigeria", website: null },
  notifications: { orderEmails: ["orders@juwonelectric.com"], lowStockEmails: [], vacancyEmails: [] },
  payments: { gatewayEnabled: false, provider: null },
  inventory: { defaultReorderLevel: 0, lowStockAlertsEnabled: true },
  uploads: { provider: "url" },
  updatedAt: null,
  updatedBy: null,
};

const notifications: AdminNotification[] = [
  {
    id: "n-1",
    type: "low_stock",
    title: "Low stock: 450W mono solar panel",
    message: "Stock is 0 (reorder level 10).",
    entity: "product",
    entityId: "p-panel-450",
    recipientId: null,
    read: false,
    createdAt: daysFromNow(-1, 15),
  },
  {
    id: "n-2",
    type: "job_assigned",
    title: "New installation job",
    message: "Adaeze Nwosu, 12 Admiralty Way, Lekki.",
    entity: "job",
    entityId: "j-1",
    recipientId: "u-engineer-1",
    read: false,
    createdAt: daysFromNow(-3, 11),
  },
];

/** Orders live on the real API; fulfilment changes made while the endpoints are missing are layered on top. */
const orderOverlay = new Map<string, Partial<Order>>();

/* ---------- Catalog ---------- */

export const mockCategories = () => clone(categories);

export const mockSaveCategory = (id: string | null, input: CategoryInput): Category => {
  if (input.parentId && !categories.some((item) => item.id === input.parentId)) throw bad("Parent category not found.");
  if (id) {
    const current = categories.find((item) => item.id === id);
    if (!current) throw notFound("Category");
    let parent = input.parentId;
    while (parent) {
      if (parent === id) throw bad("A category cannot be its own ancestor.");
      parent = categories.find((item) => item.id === parent)?.parentId ?? null;
    }
    Object.assign(current, input, { updatedAt: now() });
    return clone(current);
  }
  if (!input.name?.trim()) throw bad("Name is required.");
  const created: Category = {
    id: uuid(),
    slug: input.slug?.trim() || uniqueSlug(input.name, categories.map((item) => item.slug)),
    name: input.name.trim(),
    parentId: input.parentId ?? null,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    attributes: input.attributes ?? [],
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? categories.length + 1,
    createdAt: now(),
    updatedAt: now(),
  };
  categories.push(created);
  return clone(created);
};

export const mockDeleteCategory = (id: string): Category => {
  const index = categories.findIndex((item) => item.id === id);
  if (index < 0) throw notFound("Category");
  if (categories.some((item) => item.parentId === id) || products.some((item) => item.categoryId === id)) {
    throw conflict("Category has subcategories or products.");
  }
  return clone(categories.splice(index, 1)[0]);
};

export type ProductQuery = PageQuery & { category?: string; status?: string; stock?: "low" | "out" | ""; q?: string };

const descendantIds = (id: string): string[] => [
  id,
  ...categories.filter((item) => item.parentId === id).flatMap((item) => descendantIds(item.id)),
];

export const mockProducts = (query: ProductQuery = {}) => {
  const scope = query.category ? descendantIds(query.category) : null;
  const list = products
    .filter((item) => !scope || (item.categoryId && scope.includes(item.categoryId)))
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.stock || (query.stock === "out" ? item.stockQuantity === 0 : item.lowStock))
    .filter((item) => matches(query.q, item.name, item.sku, item.brand))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return pageOf(list, query);
};

export const mockProduct = (id: string) => {
  const found = products.find((item) => item.id === id || item.slug === id || item.sku.toLowerCase() === id.toLowerCase());
  if (!found) throw notFound("Product");
  return clone(found);
};

export const mockSaveProduct = (id: string | null, input: ProductInput): Product => {
  if (input.sku) {
    const clash = products.find((item) => item.sku.toLowerCase() === input.sku!.toLowerCase() && item.id !== id);
    if (clash) throw conflict(`Another product already uses SKU ${input.sku}.`);
  }
  if (input.categoryId && !categories.some((item) => item.id === input.categoryId)) throw bad("Category not found.");
  if (id) {
    const current = products.find((item) => item.id === id);
    if (!current) throw notFound("Product");
    if (input.stockQuantity !== undefined && input.stockQuantity !== current.stockQuantity) {
      throw bad("Use an inventory adjustment to change stock.");
    }
    Object.assign(current, input, { updatedAt: now() });
    current.lowStock = current.stockQuantity <= current.reorderLevel;
    return clone(current);
  }
  if (!input.name?.trim() || !input.sku?.trim()) throw bad("Name and SKU are required.");
  if (!input.price || input.price <= 0) throw bad("Price must be greater than 0.");
  const created = product({
    ...input,
    id: uuid(),
    sku: input.sku.trim(),
    name: input.name.trim(),
    price: input.price,
    slug: input.slug?.trim() || uniqueSlug(input.name, products.map((item) => item.slug)),
    createdAt: now(),
    updatedAt: now(),
  });
  products.unshift(created);
  if (created.stockQuantity) {
    movements.unshift({
      id: uuid(),
      productId: created.id,
      sku: created.sku,
      productName: created.name,
      change: created.stockQuantity,
      stockBefore: 0,
      stockAfter: created.stockQuantity,
      reason: "initial",
      referenceType: null,
      referenceId: null,
      note: null,
      createdBy: actor,
      createdAt: now(),
    });
  }
  return clone(created);
};

export const mockDeleteProduct = (id: string): Product => {
  const index = products.findIndex((item) => item.id === id);
  if (index < 0) throw notFound("Product");
  return clone(products.splice(index, 1)[0]);
};

/* ---------- Inventory ---------- */

export type InventoryQuery = PageQuery & { stock?: "all" | "low" | "out"; category?: string; q?: string };

export const mockInventory = (query: InventoryQuery = {}): Paged<InventoryItem> => {
  const scope = query.category ? descendantIds(query.category) : null;
  const list = products
    .filter((item) => !scope || (item.categoryId && scope.includes(item.categoryId)))
    .filter((item) =>
      query.stock === "out" ? item.stockQuantity === 0 : query.stock === "low" ? item.lowStock : true
    )
    .filter((item) => matches(query.q, item.name, item.sku))
    .sort((a, b) => Number(b.lowStock) - Number(a.lowStock) || a.name.localeCompare(b.name))
    .map((item) => ({
      productId: item.id,
      sku: item.sku,
      name: item.name,
      categoryId: item.categoryId,
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel,
      lowStock: item.lowStock,
      status: item.status,
      updatedAt: item.updatedAt,
    }));
  return pageOf(list, query);
};

export const mockAdjustStock = ({ productId, change, reason, note }: StockAdjustmentInput) => {
  const target = products.find((item) => item.id === productId);
  if (!target) throw notFound("Product");
  if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 1_000_000) {
    throw bad("Change must be a non-zero whole number.");
  }
  const stockAfter = target.stockQuantity + change;
  if (stockAfter < 0) throw conflict("Stock cannot go below zero.");
  const movement: InventoryMovement = {
    id: uuid(),
    productId,
    sku: target.sku,
    productName: target.name,
    change,
    stockBefore: target.stockQuantity,
    stockAfter,
    reason,
    referenceType: null,
    referenceId: null,
    note: note?.trim() || null,
    createdBy: actor,
    createdAt: now(),
  };
  target.stockQuantity = stockAfter;
  target.lowStock = stockAfter <= target.reorderLevel;
  target.updatedAt = now();
  movements.unshift(movement);
  return { movement: clone(movement), product: clone(target) };
};

export type MovementQuery = PageQuery & { productId?: string; reason?: string; from?: string; to?: string };

export const mockMovements = (query: MovementQuery = {}) =>
  pageOf(
    movements
      .filter((item) => !query.productId || item.productId === query.productId)
      .filter((item) => !query.reason || item.reason === query.reason)
      .filter((item) => !query.from || item.createdAt >= new Date(query.from).toISOString())
      .filter((item) => !query.to || item.createdAt <= new Date(query.to).toISOString()),
    query
  );

export const mockLowStockCheck = () => ({
  lowStock: products.filter((item) => item.status === "active" && item.lowStock).length,
  emailed: false,
});

/* ---------- Vacancies ---------- */

export type VacancyQuery = PageQuery & { status?: VacancyStatus | ""; q?: string };

export const mockVacancies = (query: VacancyQuery = {}) =>
  pageOf(
    vacancies
      .filter((item) => !query.status || item.status === query.status)
      .filter((item) => matches(query.q, item.title, item.department, item.location))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    query
  );

export const mockVacancy = (id: string) => {
  const found = vacancies.find((item) => item.id === id || item.slug === id);
  if (!found) throw notFound("Vacancy");
  return clone(found);
};

const applyVacancyStatus = (vacancy: Vacancy, status: VacancyStatus) => {
  if (vacancy.status === status) return;
  if (!VACANCY_TRANSITIONS[vacancy.status].includes(status)) {
    throw conflict(`Cannot change vacancy status from ${vacancy.status} to ${status}.`);
  }
  if (status === "open") {
    vacancy.postedAt = vacancy.postedAt ?? now();
    vacancy.closedAt = null;
  }
  if (status === "closed") vacancy.closedAt = now();
  vacancy.status = status;
};

export const mockSaveVacancy = (id: string | null, input: VacancyInput): Vacancy => {
  const takenSlugs = vacancies.filter((item) => item.id !== id).map((item) => item.slug);
  if (input.slug && takenSlugs.includes(input.slug)) throw conflict("Slug is already in use.");
  if (id) {
    const current = vacancies.find((item) => item.id === id);
    if (!current) throw notFound("Vacancy");
    const { status, ...rest } = input;
    Object.assign(current, rest);
    if (status) applyVacancyStatus(current, status);
    current.updatedAt = now();
    return clone(current);
  }
  if (!input.title?.trim()) throw bad("Title is required.");
  const created: Vacancy = {
    id: uuid(),
    slug: input.slug?.trim() || uniqueSlug(input.title, takenSlugs),
    title: input.title.trim(),
    department: input.department ?? null,
    location: input.location ?? null,
    employmentType: input.employmentType ?? null,
    salaryRange: input.salaryRange ?? null,
    descriptionHtml: input.descriptionHtml ?? "",
    requirements: input.requirements ?? [],
    responsibilities: input.responsibilities ?? [],
    status: input.status ?? "draft",
    postedAt: input.status === "open" ? now() : null,
    closedAt: null,
    createdBy: actor,
    createdAt: now(),
    updatedAt: now(),
  };
  vacancies.unshift(created);
  return clone(created);
};

export const mockSetVacancyStatus = (id: string, status: VacancyStatus) => {
  const current = vacancies.find((item) => item.id === id);
  if (!current) throw notFound("Vacancy");
  applyVacancyStatus(current, status);
  current.updatedAt = now();
  return clone(current);
};

export const mockDeleteVacancy = (id: string) => {
  const index = vacancies.findIndex((item) => item.id === id);
  if (index < 0) throw notFound("Vacancy");
  return clone(vacancies.splice(index, 1)[0]);
};

/* ---------- Orders fulfilment ---------- */

export const applyOrderOverlay = (order: Order): Order => ({ ...order, ...(orderOverlay.get(order.id) || {}) });

const derivedStatus = (fulfillment: FulfillmentStatus) =>
  fulfillment === "cancelled" ? "cancelled" : fulfillment === "delivered" || fulfillment === "installed" ? "completed" : "pending";

export const mockFulfilOrder = (order: Order, status: FulfillmentStatus): Order => {
  const current = applyOrderOverlay(order);
  const from = normalizeFulfillmentStatus(current);
  if (from !== status) {
    if (!FULFILLMENT_TRANSITIONS[from].includes(status)) {
      throw conflict(`Cannot change fulfilment status from ${from} to ${status}.`);
    }
    if (status === "installed" && !current.requiresInstallation) throw conflict("Order does not require installation.");
  }
  const patch: Partial<Order> = {
    ...orderOverlay.get(order.id),
    fulfillmentStatus: status,
    status: derivedStatus(status),
    stockCommittedAt: status === "processing" ? now() : status === "cancelled" ? null : current.stockCommittedAt ?? null,
  };
  orderOverlay.set(order.id, patch);
  return { ...current, ...patch };
};

export const mockSetPaymentStatus = (order: Order, status: PaymentStatus): Order => {
  const current = applyOrderOverlay(order);
  const from = normalizePaymentStatus(current.paymentStatus);
  if (from !== status && !PAYMENT_TRANSITIONS[from].includes(status)) {
    throw conflict(`Cannot change payment status from ${from} to ${status}.`);
  }
  const patch: Partial<Order> = {
    ...orderOverlay.get(order.id),
    paymentStatus: status,
    paidAt: status === "paid" ? current.paidAt ?? now() : current.paidAt ?? null,
  };
  orderOverlay.set(order.id, patch);
  return { ...current, ...patch };
};

export const mockSetRequiresInstallation = (order: Order, requiresInstallation: boolean): Order => {
  const current = applyOrderOverlay(order);
  if (!requiresInstallation && jobs.some((job) => job.orderId === order.id && job.status !== "cancelled")) {
    throw conflict("Order has installation jobs.");
  }
  const patch = { ...orderOverlay.get(order.id), requiresInstallation };
  orderOverlay.set(order.id, patch);
  return { ...current, ...patch };
};

const activeEngineer = (engineerId: string) => {
  const engineer = users.find((user) => user.id === engineerId && user.role === "engineer" && user.isActive);
  if (!engineer) throw bad("Assignee must be an active engineer.");
  return engineer;
};

export const mockAssignOrderEngineer = (order: Order, engineerId: string | null): Order => {
  const current = applyOrderOverlay(order);
  if (!current.requiresInstallation) throw conflict("Order does not require installation.");
  if (engineerId) activeEngineer(engineerId);
  const patch = { ...orderOverlay.get(order.id), assignedEngineerId: engineerId };
  orderOverlay.set(order.id, patch);
  return { ...current, ...patch };
};

export const mockOrderJobs = (orderId: string) =>
  jobs
    .filter((job) => job.orderId === orderId)
    .map(({ id, status, engineerId, scheduledAt }) => ({ id, status, engineerId, scheduledAt }));

/* ---------- Installation jobs ---------- */

export type JobQuery = PageQuery & { status?: JobStatus | ""; engineerId?: string; orderId?: string; from?: string; to?: string };

const byScheduleThenCreated = (a: InstallationJob, b: InstallationJob) => {
  if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
  if (a.scheduledAt) return -1;
  if (b.scheduledAt) return 1;
  return b.createdAt.localeCompare(a.createdAt);
};

export const mockJobs = (query: JobQuery = {}) =>
  pageOf(
    jobs
      .filter((job) => !query.status || job.status === query.status)
      .filter((job) => !query.engineerId || job.engineerId === query.engineerId)
      .filter((job) => !query.orderId || job.orderId === query.orderId)
      .filter((job) => !query.from || (job.scheduledAt && job.scheduledAt >= new Date(query.from).toISOString()))
      .filter((job) => !query.to || (job.scheduledAt && job.scheduledAt <= new Date(query.to).toISOString()))
      .sort(byScheduleThenCreated),
    query
  );

const findJob = (id: string) => {
  const job = jobs.find((item) => item.id === id);
  if (!job) throw notFound("Job");
  return job;
};

export const mockJob = (id: string) => clone(findJob(id));

export const mockCreateJob = (input: JobCreateInput, order?: Order): InstallationJob => {
  if (order) {
    const current = applyOrderOverlay(order);
    if (!current.requiresInstallation) throw conflict("Order does not require installation.");
    if (normalizeFulfillmentStatus(current) === "cancelled") throw conflict("Order is cancelled.");
  }
  if (input.engineerId) activeEngineer(input.engineerId);
  const created: InstallationJob = {
    id: uuid(),
    orderId: input.orderId,
    order: {
      id: input.orderId,
      name: order?.name || "Customer",
      phoneNumber: order?.phoneNumber || "",
      deliveryAddress: order?.deliveryAddress || "",
    },
    engineerId: input.engineerId ?? null,
    engineer: engineerRef(input.engineerId ?? null),
    scheduledAt: input.scheduledAt ?? null,
    durationEstimateMinutes: input.durationEstimateMinutes ?? null,
    address: input.address ?? order?.deliveryAddress ?? null,
    status: input.engineerId ? "assigned" : "unassigned",
    checklist: (input.checklist || []).map((label) => ({ id: uuid(), label, done: false, doneAt: null, doneBy: null })),
    photos: [],
    notes: input.notes ?? null,
    completionNotes: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  jobs.unshift(created);
  return clone(created);
};

const isClosed = (job: InstallationJob) => job.status === "completed" || job.status === "cancelled";

export const mockUpdateJob = (id: string, input: JobUpdateInput) => {
  const job = findJob(id);
  if (isClosed(job)) throw conflict("Job is closed.");
  const { checklist: nextChecklist, ...rest } = input;
  Object.assign(job, rest);
  if (nextChecklist) {
    job.checklist = nextChecklist.map((entry) => {
      if (typeof entry === "string") return { id: uuid(), label: entry, done: false, doneAt: null, doneBy: null };
      const existing = job.checklist.find((item) => item.id === entry.id);
      return existing
        ? { ...existing, label: entry.label }
        : { id: entry.id || uuid(), label: entry.label, done: false, doneAt: null, doneBy: null };
    });
  }
  job.updatedAt = now();
  return clone(job);
};

export const mockAssignJob = (id: string, engineerId: string | null) => {
  const job = findJob(id);
  if (isClosed(job) || job.status === "in_progress") {
    throw conflict(`Cannot change job status from ${job.status} to ${engineerId ? "assigned" : "unassigned"}.`);
  }
  if (engineerId) activeEngineer(engineerId);
  job.engineerId = engineerId;
  job.engineer = engineerRef(engineerId);
  job.status = engineerId ? "assigned" : "unassigned";
  job.updatedAt = now();
  return clone(job);
};

const applyJobStatus = (job: InstallationJob, status: JobStatus) => {
  if (job.status === status) return;
  const allowed: readonly JobStatus[] = JOB_TRANSITIONS[job.status].filter(
    (next) => next !== "assigned" && next !== "unassigned"
  );
  if (!allowed.includes(status)) throw conflict(`Cannot change job status from ${job.status} to ${status}.`);
  job.status = status;
  if (status === "in_progress") job.startedAt = now();
  if (status === "completed") job.completedAt = now();
  if (status === "cancelled") job.cancelledAt = now();
  job.updatedAt = now();
};

export const mockSetJobStatus = (id: string, status: JobStatus) => {
  const job = findJob(id);
  applyJobStatus(job, status);
  return clone(job);
};

export const mockDeleteJob = (id: string) => {
  const job = findJob(id);
  if (!["unassigned", "assigned", "cancelled"].includes(job.status)) throw conflict("Job cannot be deleted once started.");
  jobs.splice(jobs.indexOf(job), 1);
  return clone(job);
};

/* ---------- Engineer (me) jobs ---------- */

const ownJob = (engineerId: string, id: string) => {
  const job = jobs.find((item) => item.id === id && item.engineerId === engineerId);
  if (!job) throw notFound("Job");
  return job;
};

/** Preview jobs belong to the first seeded engineer unless the signed-in admin has jobs of their own. */
const previewEngineerId = (engineerId: string) =>
  jobs.some((job) => job.engineerId === engineerId) ? engineerId : "u-engineer-1";

export const mockMyJobs = (engineerId: string, query: PageQuery & { status?: JobStatus | "" } = {}) => {
  const owner = previewEngineerId(engineerId);
  return pageOf(
    jobs
      .filter((job) => job.engineerId === owner)
      .filter((job) => (query.status ? job.status === query.status : !isClosed(job)))
      .sort(byScheduleThenCreated),
    query
  );
};

export const mockMyJob = (engineerId: string, id: string) => clone(ownJob(previewEngineerId(engineerId), id));

export const mockSetMyJobStatus = (engineerId: string, id: string, status: "in_progress" | "completed") => {
  const job = ownJob(previewEngineerId(engineerId), id);
  if (job.status !== status && ENGINEER_JOB_TRANSITIONS[job.status] !== status) {
    throw conflict(`Cannot change job status from ${job.status} to ${status}.`);
  }
  if (status === "completed" && job.checklist.some((item) => !item.done)) throw conflict("Complete the checklist first.");
  applyJobStatus(job, status);
  return clone(job);
};

export const mockUpdateMyJob = (engineerId: string, id: string, input: MyJobUpdateInput) => {
  const owner = previewEngineerId(engineerId);
  const job = ownJob(owner, id);
  if (isClosed(job) || job.status === "unassigned") throw conflict("Job is closed.");
  input.checklist?.forEach(({ id: itemId, done }) => {
    const item = job.checklist.find((entry) => entry.id === itemId);
    if (!item) throw bad("Checklist item not found.");
    if (item.done !== done) {
      item.done = done;
      item.doneAt = done ? now() : null;
      item.doneBy = done ? owner : null;
    }
  });
  if (input.photos) job.photos = input.photos;
  if (input.completionNotes !== undefined) job.completionNotes = input.completionNotes;
  job.updatedAt = now();
  return clone(job);
};

/* ---------- Users and staff ---------- */

export type UserQuery = PageQuery & { role?: Role | ""; isActive?: boolean | ""; q?: string; area?: string };

export const mockUsers = (query: UserQuery = {}) =>
  pageOf(
    users
      .filter((user) => !query.role || user.role === query.role)
      .filter((user) => query.isActive === undefined || query.isActive === "" || user.isActive === query.isActive)
      .filter((user) => matches(query.q, user.name, user.email))
      .filter(
        (user) =>
          !query.area ||
          user.profile.areaCoverage.some((area) => area.toLowerCase() === String(query.area).toLowerCase())
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    query
  );

const findUser = (id: string) => {
  const user = users.find((item) => item.id === id);
  if (!user) throw notFound("User");
  return user;
};

export const mockStaffMember = (id: string): StaffMember => ({
  ...clone(findUser(id)),
  openJobs: jobs.filter((job) => job.engineerId === id && !isClosed(job)).length,
});

export const mockCreateUser = (input: { name: string; email: string; role: Role; phone?: string | null }) => {
  if (users.some((user) => user.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw conflict("An account with this email already exists.");
  }
  const created: AdminUser = {
    id: uuid(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    isActive: true,
    phone: input.phone || null,
    profile: emptyProfile(),
    lastLoginAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  users.unshift(created);
  return clone(created);
};

export const mockUpdateUser = (id: string, input: { name?: string; phone?: string | null }) => {
  const user = findUser(id);
  Object.assign(user, input, { updatedAt: now() });
  return clone(user);
};

const activeSuperadmins = () => users.filter((user) => user.role === "superadmin" && user.isActive);

export const mockSetUserRole = (selfId: string, id: string, role: Role) => {
  const user = findUser(id);
  if (user.id === selfId) throw conflict("You cannot change your own role or status.");
  if (user.role === "superadmin" && role !== "superadmin" && activeSuperadmins().length <= 1) {
    throw conflict("At least one active superadmin is required.");
  }
  user.role = role;
  user.updatedAt = now();
  return clone(user);
};

export const mockSetUserActive = (selfId: string, id: string, isActive: boolean) => {
  const user = findUser(id);
  if (user.id === selfId) throw conflict("You cannot change your own role or status.");
  if (!isActive && user.role === "superadmin" && user.isActive && activeSuperadmins().length <= 1) {
    throw conflict("At least one active superadmin is required.");
  }
  user.isActive = isActive;
  user.updatedAt = now();
  return clone(user);
};

export const mockUpdateStaff = (id: string, input: { phone?: string | null; profile?: Partial<StaffProfile> }) => {
  const user = users.find((item) => item.id === id);
  if (!user) throw notFound("Staff member");
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.profile) user.profile = { ...user.profile, ...input.profile };
  user.updatedAt = now();
  return mockStaffMember(id);
};

/* ---------- Settings and notifications ---------- */

export const mockSettings = () => clone(settings);

export const mockSaveSettings = (input: SettingsInput) => {
  settings = {
    ...settings,
    business: { ...settings.business, ...input.business },
    notifications: { ...settings.notifications, ...input.notifications },
    payments: { ...settings.payments, ...input.payments },
    inventory: { ...settings.inventory, ...input.inventory },
    updatedAt: now(),
    updatedBy: actor,
  };
  return clone(settings);
};

export const mockNotifications = (query: PageQuery & { unread?: boolean } = {}): NotificationsPage => ({
  ...pageOf(
    notifications.filter((item) => !query.unread || !item.read).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    query
  ),
  unreadCount: notifications.filter((item) => !item.read).length,
});

export const mockReadNotification = (id: string) => {
  const item = notifications.find((entry) => entry.id === id);
  if (!item) throw notFound("Notification");
  item.read = true;
  return clone(item);
};

export const mockReadAllNotifications = () => {
  notifications.forEach((item) => {
    item.read = true;
  });
  return { unreadCount: 0 };
};

/* ---------- Dashboard KPIs ---------- */

export const mockKpis = (orders: Order[] = []): DashboardKpis => {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const inPeriod = orders.map(applyOrderOverlay).filter((order) => {
    const created = new Date(order.receivedAt || order.createdAt || 0);
    return created >= from && created <= to;
  });
  const weekAhead = to.getTime() + 7 * 24 * 60 * 60 * 1000;
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    revenue: inPeriod
      .filter((order) => normalizeFulfillmentStatus(order) !== "cancelled")
      .filter((order) => ["paid", "partial"].includes(normalizePaymentStatus(order.paymentStatus)))
      .reduce((sum, order) => sum + (Number(order.totalAmount) || Number(String(order.total ?? "").replace(/[^\d.-]/g, "")) || 0), 0),
    openOrders: orders
      .map(applyOrderOverlay)
      .filter((order) => ["pending", "processing", "out_for_delivery"].includes(normalizeFulfillmentStatus(order))).length,
    lowStockItems: products.filter((item) => item.status === "active" && item.lowStock).length,
    openVacancies: vacancies.filter((item) => item.status === "open").length,
    upcomingJobs: jobs.filter(
      (job) =>
        (job.status === "unassigned" || job.status === "assigned") &&
        job.scheduledAt &&
        new Date(job.scheduledAt).getTime() >= to.getTime() &&
        new Date(job.scheduledAt).getTime() <= weekAhead
    ).length,
  };
};
