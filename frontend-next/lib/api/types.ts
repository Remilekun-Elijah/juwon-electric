// Response types. Each FE agent owns its own section; do not edit the other agent's section.

/* ===================== FE-1 (public site) ===================== */
// Shapes: agents/be-supervisor:docs/agents/API_CONTRACT_V3.md and the live Express responses.

/** New public list endpoints marked "(paged)" in the contract (§0.3). */
export type Paged<T> = { items: T[]; page: number; limit: number; total: number };

export type PackageType = "tubular" | "lithium" | "hybrid lithium";

export type PackageOption = { name: string; price: number; kits: string };

/** Contract §4.3: optional product references, added only when a package has items. */
export type PackageItem = {
  productId: string;
  quantity: number;
  note: string | null;
  name: string;
  slug: string;
  sku: string;
};

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

export type CustomerSegment = {
  id?: string;
  slug?: string;
  title: string;
  subtitle: string;
  image: string;
};

/** `GET /services` */
export type ServicesData = { offerings: ServiceOffering[]; customerSegments: CustomerSegment[] };

/** `GET /portfolio` row. */
export type PortfolioItem = {
  id?: string;
  slug?: string;
  name: string;
  image: string;
  link?: string;
  featured?: boolean;
};

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "temporary";

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

/** Contract §4.1 */
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
  order: OrderItem[];
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

/* ===================== FE-2 (admin) ===================== */
// FE-2 adds its types below this line.
