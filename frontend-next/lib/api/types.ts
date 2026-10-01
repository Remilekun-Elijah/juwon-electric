import type { AdminSelf, Role } from "@/lib/admin/capabilities";

// Response types. Each FE agent owns its own section; do not edit the other agent's section.

/* ===================== FE-1 (public site) ===================== */
// Shapes: agents/be-supervisor:docs/agents/API_CONTRACT_V3.md and the live Express responses.

export type PackageType = "tubular" | "lithium" | "hybrid lithium";

/** Commerce v2 §1.2: one product inside a composed option (public shape, no markup fields). */
export type ComposedItem = {
  productId: string;
  quantity: number;
  note: string | null;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  categoryId: string | null;
  attributes: Record<string, string | number | boolean>;
};

/**
 * Commerce v2 §1.2: public package option. Legacy (manual price) options have `composed: false`
 * and `items: []`. `price` is what the customer pays.
 */
export type ComposedOption = {
  name: string;
  composed: boolean;
  price: number;
  available: boolean;
  inStock: boolean;
  kits: string;
  items: ComposedItem[];
};

export type PackageOption = ComposedOption;

/** Contract §4.3: optional product references, added only when a package has items. */
export type PackageItem = {
  productId: string;
  quantity: number;
  note: string | null;
  name: string;
  slug: string;
  sku: string;
};

/** Commerce v3 §4: the category a package references. */
export type PackageCategoryRef = { id: string; slug: string; name: string };

/**
 * `GET /packages` row. `id` is the legacy numeric id for seeded packages (a string for new ones);
 * `slug` is not unique across packages, so routes use `id`.
 */
export type Package = {
  id: number | string;
  _id?: string;
  slug?: string;
  type: PackageType | string;
  category?: string;
  name: string;
  load: string;
  kva: number | string;
  volt: number | string | null;
  options: PackageOption[];
  /** Commerce v3 §4: catalogue category reference. `categoryRef` is null when unset or (publicly) inactive. */
  categoryId?: string | null;
  categoryRef?: PackageCategoryRef | null;
  /** Deprecated (Commerce v2 §1.1): no longer returned publicly; items live on each option. */
  items?: PackageItem[];
};

export type ServiceOffering = {
  id?: string;
  slug?: string;
  title: string;
  subtitle: string;
  image: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type PublicCustomerSegment = {
  id?: string;
  slug?: string;
  title: string;
  subtitle: string;
  image: string;
};

/** `GET /services` */
export type ServicesData = { offerings: ServiceOffering[]; customerSegments: PublicCustomerSegment[] };

/** `GET /portfolio` row (Landing v1 §2 adds the case-study fields; older records return null/false). */
export type PortfolioItem = {
  id?: string;
  slug?: string;
  name: string;
  image: string;
  link?: string;
  featured?: boolean;
  mobile?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  /** Customer-segment slug (`GET /portfolio?category=<slug>` filters by it). */
  category?: string | null;
  summary?: string | null;
  location?: string | null;
  /** e.g. "10kVA inverter, 8 × 200Ah lithium, 12 × 550W panels" */
  system?: string | null;
  sample?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Landing v1 §2: portfolio create/update body. Update is partial; "" or null clears the case-study fields. */
export type PortfolioItemInput = {
  name?: string;
  slug?: string;
  image?: string;
  link?: string;
  featured?: boolean;
  mobile?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  category?: string | null;
  summary?: string | null;
  location?: string | null;
  system?: string | null;
};

/* ---------- Landing v1 §1: website content (FAQs, reviews, client logos) ---------- */

/** Landing v1 §1.1 `GET /faqs?category=` and `/admin/faqs`. */
export type Faq = {
  id: string;
  question: string;
  /** Plain multiline text. */
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqInput = {
  question?: string;
  answer?: string;
  category?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

/** Icons a reason can use; the storefront maps each key to an icon (backend/shared/content.js REASON_ICONS). */
export const REASON_ICONS = [
  "wrench",
  "clipboard",
  "phone",
  "badge",
  "shield",
  "truck",
  "battery",
  "sun",
  "clock",
  "users",
  "spark",
  "thumbs-up",
] as const;

export type ReasonIcon = (typeof REASON_ICONS)[number];

/** "Why customers choose us" card: `GET /reasons` (active only) and `/admin/reasons`. */
export type Reason = {
  id: string;
  title: string;
  /** Plain multiline text. */
  text: string;
  icon: ReasonIcon;
  sortOrder: number;
  isActive: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReasonInput = {
  title?: string;
  text?: string;
  icon?: ReasonIcon;
  sortOrder?: number;
  isActive?: boolean;
};

export type TestimonialSource = "website" | "whatsapp" | "google" | "facebook" | "in_person";

/** Landing v1 §1.2 `GET /testimonials` and `/admin/testimonials` (called "Reviews" in the UI). */
export type Testimonial = {
  id: string;
  name: string;
  /** e.g. "5kVA lithium system, Lekki" */
  context: string | null;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  source: TestimonialSource | null;
  /** http(s) URL or site path "/..." */
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TestimonialInput = {
  name?: string;
  context?: string | null;
  quote?: string;
  rating?: 1 | 2 | 3 | 4 | 5 | null;
  source?: TestimonialSource | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

/** Landing v1 §1.3 `GET /clients` and `/admin/clients`. */
export type Client = {
  id: string;
  name: string;
  /** http(s) URL or site path "/..." */
  logoUrl: string;
  website: string | null;
  sortOrder: number;
  isActive: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = {
  name?: string;
  logoUrl?: string;
  website?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

/* ---------- Team and motion v1 §1: team members ---------- */

/**
 * TEAM_AND_MOTION_V1 §1 `GET /team` (active only, sorted by sortOrder then createdAt) and
 * `/admin/team`. Groups display in the order they first appear in the sorted list.
 */
export type TeamMember = {
  id: string;
  /** 1–100 */
  name: string;
  /** 1–80, e.g. "Lead installation engineer" */
  role: string;
  /** 1–60, e.g. "Leadership", "Engineering & installations" */
  group: string;
  /** Plain text, at most 300 characters. */
  bio: string | null;
  /** http(s) URL or site path "/..." */
  photoUrl: string | null;
  /** https URL */
  linkedinUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamMemberInput = {
  name?: string;
  role?: string;
  group?: string;
  bio?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

/* ---------- Landing v1 §3: website, financing and calculator settings ---------- */

export type WebsiteStat = { label: string; value: string };

export type WebsiteSettings = {
  /** At most 4. */
  stats: WebsiteStat[];
  whatsappNumber: string | null;
  /** Multiline, e.g. "Mon–Fri 8am–6pm\nSat 9am–3pm". */
  businessHours: string | null;
  /** False hides the Products area of the public site (navigation, home sections and pages). Packages are unaffected. */
  productsEnabled: boolean;
  sample: boolean;
};

export type FinancingSettings = {
  enabled: boolean;
  /** Whole number 0–100. */
  depositPercent: number | null;
  /** Up to 6 unique whole months (1–60), ascending. */
  termsMonths: number[];
  /** 0–20, up to 2 decimals. */
  monthlyRatePercent: number | null;
  approvalTime: string | null;
  note: string | null;
  sample: boolean;
};

export type CalculatorAppliance = {
  /** ^[a-z0-9-]{1,40}$, unique */
  key: string;
  label: string;
  watts: number;
  /** 0–24 in 0.5 steps. */
  defaultHours: number;
  defaultQuantity: number;
};

export type CalculatorSettings = {
  enabled: boolean;
  appliances: CalculatorAppliance[];
  inverterHeadroomPercent: number;
  batteryDepthOfDischargePercent: number;
  batteryVoltage: 12 | 24 | 48;
  panelWatts: number;
  peakSunHours: number;
  generator: { fuelPricePerLitre: number; litresPerKvaHour: number; maintenancePerMonth: number };
  sample: boolean;
};

/** Public financing: every field when enabled, otherwise `{ enabled: false }`. */
export type PublicFinancingSettings = (FinancingSettings & { enabled: true }) | { enabled: false };
/** Public calculator: every field when enabled, otherwise `{ enabled: false }`. */
export type PublicCalculatorSettings = (CalculatorSettings & { enabled: true }) | { enabled: false };

/** Contract §3 `PublicVacancy`. `_id` covers the legacy Mongo shape still served by the base backend. */
export type PublicVacancy = {
  id: string;
  _id?: string;
  slug: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  salaryRange: string | null;
  descriptionHtml: string;
  requirements: string[];
  responsibilities: string[];
  status: "open";
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Contract §4.2 `PublicProduct` */
export type PublicProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  descriptionHtml: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  currency: "NGN";
  images: string[];
  status: "active";
  tags: string[];
  inStock: boolean;
  category: { id: string; slug: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** Contract §8.1 `GET /settings/public` */
export type PublicSettings = {
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    website: string | null;
  };
  payments: { gatewayEnabled: boolean };
  /** Landing v1 §3 */
  website: WebsiteSettings;
  financing: PublicFinancingSettings;
  calculator: PublicCalculatorSettings;
};

/** Line item sent to `POST /cart/quote` and `POST /order` (Vite `toOrderItem`). */
export type OrderItem = {
  id: number | string;
  name: string;
  volt: number | string | null;
  withSolar: boolean;
  optionName?: string;
  kva: string;
  price: string;
  package: string;
  type: string;
  quantity: number;
};

/** Commerce v3 §3.1: a catalogue product line sent to `POST /cart/quote`, `POST /cart` and `POST /order`. */
export type ProductOrderItem = { type: "product"; productId: string; quantity: number };

/** Any item accepted by the cart, quote and order endpoints. */
export type CartRequestItem = OrderItem | ProductOrderItem;

/** `POST /cart/quote` data. Prices may be numbers or "₦1,000" strings. */
export type CartQuoteLine = {
  price?: number | string;
  unitPrice?: number | string;
  quantity?: number | string;
  lineTotal?: number | string;
  available?: boolean;
  unavailable?: boolean;
};

export type CartQuote = {
  items: CartQuoteLine[];
  total?: number | string;
  totalAmount?: number | string;
  unavailable?: number[];
};

export type TurnstileFields = { turnstileToken?: string };

export type OrderPayload = TurnstileFields & {
  name: string;
  phoneNumber: string;
  emailAddress: string;
  deliveryAddress: string;
  order: (OrderItem | ProductOrderItem)[];
  total: string;
};

/** `POST /order` data. The server-computed total may be a display string or a number. */
export type PlacedOrder = { total?: string | number; totalAmount?: number } & Record<string, unknown>;

export type ContactPayload = TurnstileFields & {
  name: string;
  phoneNumber: string;
  emailAddress: string;
  message: string;
};

export type SubscribePayload = TurnstileFields & { emailAddress: string };

export type SaveCartPayload = TurnstileFields & {
  sessionId: string;
  items: (OrderItem | ProductOrderItem)[];
  name?: string;
  phoneNumber?: string;
  emailAddress?: string;
};

/* ===================== FE-2 (admin) ===================== */
// FE-2 adds its types below this line.

// ---------------------------------------------------------------------------
// Admin (FE-2). Shapes follow agents/be-supervisor:docs/agents/API_CONTRACT_V3.md
// for new modules and backend/docs/API.md for the existing ones.
// ---------------------------------------------------------------------------


export type { AdminSelf, Role };

/** Contract §0.3: every new admin list endpoint. */
export type Paged<T> = { items: T[]; page: number; limit: number; total: number };

export type ActorRef = { id: string; email: string } | null;

/* ---------- Auth ---------- */

export type LoginResponse = { token: string; admin: AdminSelf };
export type SessionResponse = { admin: AdminSelf };

/* ---------- Existing modules ---------- */

export type LegacyOrderStatus = "pending" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "partial" | "paid" | "failed" | "refunded";
export type FulfillmentStatus = "pending" | "processing" | "out_for_delivery" | "delivered" | "installed" | "cancelled";

/* ---------- Packages (Commerce v2 §1) ---------- */

/** Admin responses add the internal markup fields. */
export type AdminComposedItem = ComposedItem & { unitPrice: number; lineTotal: number };

export type AdminPackageOption = Omit<ComposedOption, "items"> & {
  productsTotal: number | null;
  priceAdjustment: number;
  items: AdminComposedItem[];
};

/** `GET /admin/packages*` row. */
export type AdminPackage = Omit<Package, "options" | "items"> & { options: AdminPackageOption[] };

/**
 * Commerce v3 §4: package write fields added this round. `PackageInput` lives in `lib/api/admin.ts`;
 * intersect it with this type (`PackageInput & PackageCategoryInput`). Unknown ids give 400 "Category not found.".
 */
export type PackageCategoryInput = { categoryId?: string | null };

/** `POST/PUT /admin/packages` option. `price`/`kits` are only used when `items` is empty (legacy). */
export type PackageOptionInput = {
  name: string;
  items?: { productId: string; quantity: number; note?: string | null }[];
  priceAdjustment?: number;
  price?: number | string;
  kits?: string;
};

/* ---------- Orders ---------- */

export type OrderChannel = "website" | "in_store";

export type OrderLineComponent = { productId: string; sku: string; name: string; quantity: number; unitPrice: number };

/**
 * Commerce v2 §1.3. A line is a product line only when `type === "product"`. Lines placed
 * before snapshots have no `type` or a display label there ("Inverter + tubular"); new
 * package lines store the label in `typeLabel`.
 */
export type OrderLineSnapshot = {
  type?: "package" | "product" | (string & {});
  // package lines
  typeLabel?: string;
  packageId?: string;
  optionName?: string;
  kva?: number | string;
  volt?: number | string | null;
  price?: number | string;
  components?: OrderLineComponent[];
  productsTotal?: number | null;
  priceAdjustment?: number;
  // product lines (in-store)
  productId?: string;
  sku?: string;
  // both
  name?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
};

export type OrderLine = OrderLineSnapshot & {
  kits?: string;
  [key: string]: unknown;
};

export type OrderDiscount = { amount: number; reason: string };

/** `POST /admin/orders` (Commerce v2 §2.2). */
export type InStoreOrderInput = {
  /** Commerce v3 §2: optional; a blank name is stored as "Walk-in customer" and a blank phone as null. */
  customer?: { name?: string | null; phoneNumber?: string | null; emailAddress?: string | null; deliveryAddress?: string | null };
  lines: { productId: string; quantity: number }[];
  discount?: OrderDiscount | null;
  fulfilment: "collected" | "later";
  paymentStatus: "pending" | "partial" | "paid";
  requiresInstallation?: boolean;
  note?: string | null;
};

export type InstallationJobSummary = {
  id: string;
  status: JobStatus;
  engineerId: string | null;
  /** Commerce v3 §1: crew ids, lead first. Always sent by v3 backends; optional so older fixtures compile. */
  engineerIds?: string[];
  scheduledAt: string | null;
};

export type Order = {
  id: string;
  name: string;
  phoneNumber?: string;
  emailAddress?: string;
  deliveryAddress?: string;
  order?: OrderLine[];
  total?: number | string;
  totalAmount?: number;
  note?: string;
  isActive?: boolean;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Derived and read-only (contract §6.1). */
  status: LegacyOrderStatus;
  paymentStatus: PaymentStatus | "unpaid";
  fulfillmentStatus: FulfillmentStatus;
  requiresInstallation: boolean;
  assignedEngineerId: string | null;
  paidAt: string | null;
  stockCommittedAt: string | null;
  legacyPaymentStatus?: string | null;
  jobs?: InstallationJobSummary[];
  /** Commerce v2 §2.2: always present; `subtotal` is null for legacy orders, `createdBy` null for website orders. */
  channel: OrderChannel;
  subtotal: number | null;
  discount: OrderDiscount | null;
  createdBy: ActorRef;
};

export type InsufficientStockDetail = { productId: string; sku: string; required: number; available: number };

export type CustomerSegment = {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  image: string;
  isActive: boolean;
  sortOrder?: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  summary?: string;
  adminId?: string;
  adminEmail?: string;
  createdAt: string;
  [key: string]: unknown;
};

/* ---------- Dashboard (contract §9) ---------- */

export type DashboardKpis = {
  period: { from: string; to: string };
  revenue: number;
  openOrders: number;
  lowStockItems: number;
  openVacancies: number;
  upcomingJobs: number;
};

export type Dashboard = {
  stats?: Record<string, number>;
  statusCounts?: Record<string, number>;
  revenueSeries?: { label: string; value: number }[];
  recentOrders?: (Order & { revenue?: number })[];
  kpis?: DashboardKpis;
};

/* ---------- Users and staff (contract §2, §7.4) ---------- */

export type StaffProfile = {
  areaCoverage: string[];
  certifications: string[];
  bio: string | null;
  avatarUrl: string | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  phone: string | null;
  profile: StaffProfile;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffMember = AdminUser & { openJobs?: number };

/* ---------- Vacancies (contract §3) ---------- */

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "temporary";
export type VacancyStatus = "draft" | "open" | "closed";

export type Vacancy = {
  id: string;
  slug: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  salaryRange: string | null;
  descriptionHtml: string;
  requirements: string[];
  responsibilities: string[];
  status: VacancyStatus;
  postedAt: string | null;
  closedAt: string | null;
  createdBy: ActorRef;
  createdAt: string;
  updatedAt: string;
};

export type VacancyInput = Partial<
  Pick<
    Vacancy,
    | "title"
    | "slug"
    | "department"
    | "location"
    | "employmentType"
    | "salaryRange"
    | "descriptionHtml"
    | "requirements"
    | "responsibilities"
    | "status"
  >
>;

/* ---------- Catalog (contract §4) ---------- */

export type CategoryAttribute = { key: string; label: string; type: "text" | "number" | "boolean"; unit: string | null };

export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  description: string | null;
  imageUrl: string | null;
  attributes: CategoryAttribute[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = Partial<
  Pick<Category, "name" | "slug" | "parentId" | "description" | "imageUrl" | "attributes" | "isActive" | "sortOrder">
>;

export type ProductStatus = "active" | "hidden" | "archived";

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  descriptionHtml: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  costPrice: number | null;
  currency: "NGN";
  stockQuantity: number;
  reorderLevel: number;
  lowStock: boolean;
  images: string[];
  status: ProductStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/** `stockQuantity` is only accepted on create (contract §4.2). */
export type ProductInput = Partial<
  Pick<
    Product,
    | "sku"
    | "slug"
    | "name"
    | "categoryId"
    | "brand"
    | "descriptionHtml"
    | "attributes"
    | "price"
    | "costPrice"
    | "reorderLevel"
    | "images"
    | "status"
    | "tags"
    | "stockQuantity"
  >
>;

/* ---------- Inventory (contract §5) ---------- */

export type MovementReason =
  | "initial"
  | "restock"
  | "adjustment"
  | "damage"
  | "return"
  | "correction"
  | "sale"
  | "sale_reversal";

export type ManualMovementReason = "restock" | "adjustment" | "damage" | "return" | "correction";

export type InventoryItem = {
  productId: string;
  sku: string;
  name: string;
  categoryId: string | null;
  stockQuantity: number;
  reorderLevel: number;
  lowStock: boolean;
  status: ProductStatus;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  change: number;
  stockBefore: number;
  stockAfter: number;
  reason: MovementReason;
  referenceType: "order" | null;
  referenceId: string | null;
  note: string | null;
  createdBy: ActorRef;
  createdAt: string;
};

export type StockAdjustmentInput = { productId: string; change: number; reason: ManualMovementReason; note?: string };

/* ---------- Installation jobs (contract §7) ---------- */

export type JobStatus = "unassigned" | "assigned" | "in_progress" | "completed" | "cancelled";

export type ChecklistItem = { id: string; label: string; done: boolean; doneAt: string | null; doneBy: string | null };

/** `avatarUrl` is their staff photo (2026-09-18), so every crew list shows the same picture. */
export type JobEngineer = { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null };

export type InstallationJob = {
  id: string;
  orderId: string;
  order: { id: string; name: string; phoneNumber: string; deliveryAddress: string };
  /** Lead engineer (`engineerIds[0]`), kept for compatibility. */
  engineerId: string | null;
  /** Commerce v3 §1: crew ids (max 10), lead first. Always sent by v3 backends; optional so older fixtures compile. */
  engineerIds?: string[];
  engineer: JobEngineer | null;
  /** Crew in `engineerIds` order; unknown or deleted admins are skipped. Always sent by v3 backends. */
  engineers?: JobEngineer[];
  scheduledAt: string | null;
  durationEstimateMinutes: number | null;
  address: string | null;
  status: JobStatus;
  checklist: ChecklistItem[];
  photos: string[];
  notes: string | null;
  completionNotes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobCreateInput = {
  orderId: string;
  /** Commerce v3 §1: preferred; `engineerId` is used only when this is absent. */
  engineerIds?: string[];
  engineerId?: string | null;
  scheduledAt?: string | null;
  durationEstimateMinutes?: number | null;
  address?: string | null;
  checklist?: string[];
  notes?: string | null;
};

export type JobUpdateInput = {
  /** Commerce v3 §1: replaces the crew (open, not-started jobs only). */
  engineerIds?: string[];
  engineerId?: string | null;
  scheduledAt?: string | null;
  durationEstimateMinutes?: number | null;
  address?: string | null;
  checklist?: (string | { id: string; label: string })[];
  notes?: string | null;
};

export type MyJobUpdateInput = {
  checklist?: { id: string; done: boolean }[];
  photos?: string[];
  completionNotes?: string | null;
};

/* ---------- Settings and notifications (contract §8) ---------- */

export type Settings = {
  business: { name: string; email: string | null; phone: string | null; address: string | null; website: string | null };
  notifications: { orderEmails: string[]; lowStockEmails: string[]; vacancyEmails: string[] };
  payments: { gatewayEnabled: boolean; provider: "paystack" | "flutterwave" | null };
  inventory: { defaultReorderLevel: number; lowStockAlertsEnabled: boolean };
  /** Not shown in the admin (UPLOADS_V1 §7): uploads depend on server configuration only. */
  uploads: { provider: "url" | "r2" };
  /** Landing v1 §3. Saving a section stores its `sample` as false. */
  website: WebsiteSettings;
  financing: FinancingSettings;
  calculator: CalculatorSettings;
  updatedAt: string | null;
  updatedBy: ActorRef;
};

/** Sent sections merge key by key (sent arrays replace). `sample` is ignored: saving a section clears it. */
export type SettingsInput = {
  [K in keyof Pick<Settings, "business" | "notifications" | "payments" | "inventory">]?: Partial<Settings[K]>;
} & {
  website?: Partial<Omit<WebsiteSettings, "sample">>;
  financing?: Partial<Omit<FinancingSettings, "sample">>;
  calculator?: Partial<Omit<CalculatorSettings, "sample" | "generator">> & {
    generator?: Partial<CalculatorSettings["generator"]>;
  };
};

export type NotificationType = "low_stock" | "new_order" | "vacancy_posted" | "job_assigned";

export type AdminNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity: "product" | "order" | "vacancy" | "job";
  entityId: string;
  recipientId: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationsPage = Paged<AdminNotification> & { unreadCount: number };

/* ---------- Image uploads (UPLOADS_V1 §2) ---------- */

export type UploadContentType = "image/jpeg" | "image/png" | "image/webp";

/** `?purpose=` for POST /admin/uploads: the key prefix. Default `other`. */
export type UploadPurpose =
  | "products"
  | "categories"
  | "packages"
  | "services"
  | "portfolio"
  | "segments"
  | "reviews"
  | "clients"
  | "team"
  | "jobs"
  | "staff"
  | "other";

/** GET /admin/uploads/config. Never carries usage or storage limits. */
export type UploadConfig = {
  enabled: boolean;
  maxBytes: number;
  accept: UploadContentType[];
  maxDimension: number;
};

/** 201 "Image uploaded." from POST /admin/uploads (raw image bytes, Content-Type is the image type). */
export type Upload = {
  id: string;
  url: string;
  key: string;
  size: number;
  contentType: UploadContentType;
};
