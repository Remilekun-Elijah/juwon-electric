/**
 * Admin API: session storage, `adminFetch` (token + 401/403 handling) and one typed function per endpoint.
 *
 * - Session keys match the Vite admin (FE_CONVENTIONS §3.5), so a signed-in session carries over.
 * - The token is sent as `Authorization: Bearer` (API_CONTRACT_V3 §12; the contract wins over the conventions doc).
 * - New-module functions call the contract endpoint. Only when preview is enabled (`NEXT_PUBLIC_ADMIN_PREVIEW=true`,
 *   never in production) AND the backend answers `404 "Route not found."` do they fall back to `lib/admin/mocks.ts`.
 *   With preview off, a missing route is a `FeatureUnavailableError`. TODO(contract): remove the fallback after
 *   backend integration.
 */
import type { AdminSelf } from "@/lib/admin/capabilities";
import { config } from "@/lib/config";
import * as mock from "@/lib/admin/mocks";
import { notifyStorefront } from "@/lib/storefront/notify";
import { ApiError, apiRequest, backendUrl, toQuery, type ApiEnvelope, type ApiRequestInit, type QueryParams } from "./client";
import type {
  AdminNotification,
  AdminPackage,
  AdminUser,
  AuditLogEntry,
  Cart,
  Category,
  CategoryInput,
  Client,
  ClientInput,
  CustomerSegment,
  Dashboard,
  Faq,
  FaqInput,
  FulfillmentStatus,
  InStoreOrderInput,
  InstallationJob,
  InventoryItem,
  InventoryMovement,
  JobCreateInput,
  JobStatus,
  JobUpdateInput,
  LoginResponse,
  MyJobUpdateInput,
  NotificationsPage,
  Order,
  OrderChannel,
  PackageCategoryInput,
  PackageOptionInput,
  Paged,
  PaymentStatus,
  PortfolioItem,
  PortfolioItemInput,
  Product,
  ProductInput,
  Role,
  SessionResponse,
  Settings,
  SettingsInput,
  StaffMember,
  StaffProfile,
  StockAdjustmentInput,
  TeamMember,
  TeamMemberInput,
  Testimonial,
  TestimonialInput,
  Upload,
  UploadConfig,
  UploadPurpose,
  Vacancy,
  VacancyInput,
  VacancyStatus,
} from "./types";

export { ApiError };

/* ---------- Session storage ---------- */

export const ADMIN_SESSION_KEY = "je/admin-session";
export const ADMIN_USER_KEY = "je/admin-user";
const LEGACY_TOKEN_KEY = "je/admin-token";

/** Fired on this window whenever the stored session changes (other tabs get the native `storage` event). */
export const ADMIN_SESSION_EVENT = "je:admin-session";

const notifySessionChange = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
};

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readAdminToken = (): string => {
  try {
    return storage()?.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
};

export const readAdminUser = (): AdminSelf | null => {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(ADMIN_USER_KEY) || "null");
    return parsed && typeof parsed === "object" ? (parsed as AdminSelf) : null;
  } catch {
    return null;
  }
};

export const saveAdminUser = (admin: AdminSelf) => {
  try {
    storage()?.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  } catch {
    // Storage blocked: the session still works for this page load.
  }
  notifySessionChange();
};

export const saveAdminSession = (token: string, admin: AdminSelf) => {
  try {
    const store = storage();
    store?.removeItem(LEGACY_TOKEN_KEY);
    store?.setItem(ADMIN_SESSION_KEY, token);
  } catch {
    // See saveAdminUser.
  }
  saveAdminUser(admin);
};

export const clearAdminSession = () => {
  try {
    const store = storage();
    store?.removeItem(ADMIN_SESSION_KEY);
    store?.removeItem(ADMIN_USER_KEY);
  } catch {
    // Nothing stored.
  }
  notifySessionChange();
};

/* ---------- Transport ---------- */

let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: (() => void) | null = null;

/** Registers the single 401 handler (AdminApp clears the session and routes to sign-in). Returns an unregister function. */
export const setAdminUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
};

/** Registers the 403 handler (AdminApp refetches `/admin/auth/me` so navigation matches the current role). */
export const setAdminForbiddenHandler = (handler: () => void) => {
  forbiddenHandler = handler;
  return () => {
    if (forbiddenHandler === handler) forbiddenHandler = null;
  };
};

/** Calls `/admin${path}` with the session token. A 401 for the token that was sent signs the admin out. */
export async function adminFetch<T>(path: string, init: ApiRequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = readAdminToken();
  try {
    const response = await apiRequest<T>(`/admin${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    // Storefront refresh after a successful write (fe-storefront §2.3); fire-and-forget, GETs are ignored.
    notifyStorefront(init.method, `/admin${path}`, token);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      // Only act when the rejected token is still the stored one, so a late 401 from an earlier
      // session can't sign out a newer one.
      if (error.status === 401 && readAdminToken() === token) unauthorizedHandler?.();
      if (error.status === 403 && token && readAdminToken() === token) forbiddenHandler?.();
      if (error.status === 0) {
        throw new ApiError("Couldn’t reach the server. Check your connection and try again.", 0, error.data);
      }
    }
    throw error;
  }
}

/** Contract `details` from an error envelope (for example, insufficient stock), if any. */
export const errorDetails = <T = unknown>(error: unknown): T | undefined =>
  error instanceof ApiError && error.data && typeof error.data === "object"
    ? ((error.data as { details?: T }).details ?? undefined)
    : undefined;

/** Name used by the screens ported from the Vite admin. */
export const adminRequest = adminFetch;

const post = <T>(path: string, body: unknown = {}) => adminFetch<T>(path, { method: "POST", body });
const put = <T>(path: string, body: unknown) => adminFetch<T>(path, { method: "PUT", body });
const del = <T>(path: string) => adminFetch<T>(path, { method: "DELETE" });
const id = (value: string) => encodeURIComponent(value);

/** True when the backend doesn't have this route yet (as opposed to a missing record). */
export const isMissingRoute = (error: unknown) =>
  error instanceof ApiError && error.status === 404 && error.message === "Route not found.";

/** Preview mode (review FE2-1): opt-in at build time, off by default, never set in production. */
export const adminPreviewEnabled = config.adminPreview;

export const FEATURE_UNAVAILABLE_MESSAGE = "This feature isn’t available on the server yet.";

/** A contract endpoint the connected backend doesn't have yet (and preview is off). */
export class FeatureUnavailableError extends ApiError {
  constructor(data: unknown = null) {
    super(FEATURE_UNAVAILABLE_MESSAGE, 404, data);
    this.name = "FeatureUnavailableError";
  }
}

export const isFeatureUnavailable = (error: unknown) => error instanceof FeatureUnavailableError;

/**
 * TODO(contract): calls the real endpoint. If the route isn't deployed yet it runs the mock and flags `area` (so the
 * screen shows a preview notice) only when preview is enabled; otherwise it throws `FeatureUnavailableError`.
 * Any other error (400/401/403/409/5xx/network) is always rethrown.
 */
async function withContractFallback<T>(area: string, real: () => Promise<ApiEnvelope<T>>, fallback: () => T): Promise<T> {
  try {
    return (await real()).data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
    if (!adminPreviewEnabled) throw new FeatureUnavailableError(error instanceof ApiError ? error.data : null);
    mock.markMocked(area);
    return fallback();
  }
}

const selfId = () => readAdminUser()?.id || "";

/* ---------- Auth (public auth routes; no token) ---------- */

export const login = (username: string, password: string) =>
  apiRequest<LoginResponse>("/admin/auth/login", { method: "POST", body: { username, password } });

export const requestPasswordReset = (username: string) =>
  apiRequest<{ resetToken?: string } | null>("/admin/auth/request-password-reset", { method: "POST", body: { username } });

export const resetPassword = (username: string, token: string, password: string) =>
  apiRequest<unknown>("/admin/auth/reset-password", { method: "POST", body: { username, token, password } });

/** Best effort: the session is cleared locally whatever the result. */
export const logout = () => post<unknown>("/auth/logout");

/**
 * Contract §1.5: the current admin with `capabilities[]`.
 * A backend without `/me` keeps the stored identity. Capabilities are never added: without the array the admin gets
 * an empty shell. TODO(contract): in preview only, a pre-contract backend (whose only accounts are the seeded super
 * admin and the static token, both "every capability" in the contract) grants every capability.
 */
export const getSession = async (): Promise<AdminSelf | null> => {
  try {
    return (await adminFetch<SessionResponse>("/auth/me")).data.admin;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
    const stored = readAdminUser();
    if (!stored) return null;
    if (Array.isArray(stored.capabilities)) return stored;
    if (!adminPreviewEnabled) return { ...stored, capabilities: [] };
    mock.markMocked("session");
    return { ...stored, capabilities: [...mock.PREVIEW_CAPABILITIES] };
  }
};

/* ---------- Image uploads (UPLOADS_V1 §2) ---------- */

/** `GET /admin/uploads/config`: whether uploads are on, the accepted types and the byte and pixel caps per image. */
export const getUploadConfig = async () => (await adminFetch<UploadConfig>("/uploads/config")).data;

export type UploadImageOptions = {
  /** Called with the fraction (0 to 1) of bytes sent. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/** Messages for upload failures whose response carries no message of its own (for example a proxy's 413). */
const UPLOAD_FALLBACK_MESSAGES: Record<number, string> = {
  413: "Image must be 2 MB or smaller.",
  415: "Upload a JPEG, PNG or WebP image.",
  429: "Too many images uploaded in a short time. Wait a few minutes and try again.",
  507: "Image uploads are unavailable right now. Please use an image link or try again later.",
};

/** True for the rejection `uploadImage` gives when its signal aborts. */
export const isUploadAborted = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/**
 * `POST /admin/uploads?purpose=`: sends the raw image bytes with their `Content-Type` and the session token.
 * Uses XMLHttpRequest so progress can be reported. 401 and 403 call the same handlers as `adminFetch`; the server's
 * message is kept for every error (413, 415, 429, 507 fall back to the contract wording when it's missing).
 * No storefront notify: an upload changes no public content until a record that uses it is saved.
 */
export function uploadImage(
  file: Blob,
  purpose: UploadPurpose = "other",
  { onProgress, signal }: UploadImageOptions = {}
): Promise<ApiEnvelope<Upload>> {
  const token = readAdminToken();
  return new Promise((resolve, reject) => {
    const aborted = () => new DOMException("Upload cancelled.", "AbortError");
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    signal?.addEventListener("abort", abort, { once: true });

    xhr.open("POST", `${backendUrl}/admin/uploads${toQuery({ purpose })}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      cleanup();
      let data: ApiEnvelope<Upload> | null = null;
      try {
        data = JSON.parse(xhr.responseText) as ApiEnvelope<Upload>;
      } catch {
        data = null;
      }
      const status = xhr.status;
      if (status >= 200 && status < 300 && data && data.success !== false && data.data?.url) {
        onProgress?.(1);
        resolve(data);
        return;
      }
      if (status === 401 && readAdminToken() === token) unauthorizedHandler?.();
      if (status === 403 && token && readAdminToken() === token) forbiddenHandler?.();
      const message = data?.message || UPLOAD_FALLBACK_MESSAGES[status] || "Couldn’t upload the image. Try again.";
      reject(new ApiError(message, status, data));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError("Couldn’t reach the server. Check your connection and try again.", 0));
    };
    xhr.onabort = () => {
      cleanup();
      reject(aborted());
    };
    xhr.send(file);
  });
}

/* ---------- Existing modules ---------- */

export const getDashboard = (params: { from?: string; to?: string } = {}) =>
  adminFetch<Dashboard>(`/dashboard${toQuery(params)}`);

export const getAuditLogs = (params: QueryParams) =>
  adminFetch<Paged<AuditLogEntry>>(`/audit-logs${toQuery(params)}`);

export const getCarts = () => adminFetch<Cart[]>("/carts");

export const getServicesAdmin = () =>
  adminFetch<{ offerings: unknown[]; customerSegments: CustomerSegment[] }>("/services");

export type CustomerSegmentInput = Pick<CustomerSegment, "title" | "subtitle" | "image" | "isActive"> & {
  slug?: string;
  sortOrder?: number;
};

export const saveCustomerSegment = (segmentId: string | null, input: CustomerSegmentInput) =>
  segmentId
    ? put<CustomerSegment>(`/services/customer-segments/${id(segmentId)}`, input)
    : post<CustomerSegment>("/services/customer-segments", input);

export const deleteCustomerSegment = (segmentId: string) =>
  del<CustomerSegment>(`/services/customer-segments/${id(segmentId)}`);

/* ---------- Packages (Commerce v2 §1) ---------- */

/** Admin package rows, with `productsTotal`, `priceAdjustment` and per-item prices on each option. */
export const getAdminPackages = async () => (await adminFetch<AdminPackage[]>("/packages")).data || [];

/** Package write body. `options` is always sent in the stored shape (Commerce v2 §1.1); top-level `items` is never sent. */
export type PackageInput = {
  name?: string;
  type?: string;
  load?: string;
  kva?: string | number;
  volt?: string | number | null;
  legacyId?: string | number | null;
  isActive?: boolean;
  slug?: string;
  sortOrder?: number;
  options: PackageOptionInput[];
};

export const savePackage = <T = AdminPackage>(packageId: string | null, input: PackageInput & PackageCategoryInput) =>
  packageId ? put<T>(`/packages/${id(packageId)}`, input) : post<T>("/packages", input);

/* ---------- Orders and fulfilment (contract §6) ---------- */

export type OrderFilters = {
  /** Commerce v2 §2.2: `website` or `in_store`. */
  channel?: OrderChannel | "";
  fulfillmentStatus?: FulfillmentStatus | "";
  paymentStatus?: PaymentStatus | "";
  engineerId?: string;
  requiresInstallation?: boolean | "";
  from?: string;
  to?: string;
};

export const getOrders = async (filters: OrderFilters = {}) => {
  const response = await adminFetch<Order[]>(`/orders${toQuery(filters)}`);
  if (!adminPreviewEnabled) return response;
  return { ...response, data: (response.data || []).map(mock.applyOrderOverlay) };
};

export const getOrder = async (orderId: string) => {
  const response = await adminFetch<Order>(`/orders/${id(orderId)}`);
  if (!adminPreviewEnabled || response.data.jobs) return response;
  // Pre-contract order detail has no `jobs`: preview fills it from mock jobs and says so.
  mock.markMocked("orders");
  const order = mock.applyOrderOverlay(response.data);
  return { ...response, data: { ...order, jobs: mock.mockOrderJobs(order.id) } };
};

/**
 * Commerce v2 §2.2: `POST /admin/orders` (cap `orders:create`). A 409 carries `details` per short product.
 * Not mocked: a backend without the route answers with `FeatureUnavailableError`.
 */
export const createInStoreOrder = async (input: InStoreOrderInput) => {
  try {
    return await post<Order>("/orders", input);
  } catch (error) {
    if (isMissingRoute(error)) throw new FeatureUnavailableError(error instanceof ApiError ? error.data : null);
    throw error;
  }
};

export const setFulfillmentStatus = (order: Order, status: FulfillmentStatus, note?: string) =>
  withContractFallback(
    "orders",
    () => post<Order>(`/orders/${id(order.id)}/fulfillment`, { status, ...(note ? { note } : {}) }),
    () => mock.mockFulfilOrder(order, status)
  );

/** Delivered -> installed for an order not yet flagged for installation: one PUT turns the flag on and moves it (contract §6.4). */
export const markOrderInstalled = (order: Order) =>
  withContractFallback(
    "orders",
    () => put<Order>(`/orders/${id(order.id)}`, { requiresInstallation: true, fulfillmentStatus: "installed" }),
    () => mock.mockFulfilOrder(order, "installed")
  );

export const markOrderPaid = (order: Order, note?: string) =>
  withContractFallback(
    "orders",
    () => post<Order>(`/orders/${id(order.id)}/mark-paid`, note ? { note } : {}),
    () => mock.mockSetPaymentStatus(order, "paid")
  );

/**
 * `paymentStatus` and `requiresInstallation` go through PUT (contract §6.4). An older backend rejects the new
 * values with 400; that isn't a missing route, so it's shown as an error rather than mocked.
 */
export const updateOrder = (order: Order, patch: { paymentStatus?: PaymentStatus; requiresInstallation?: boolean; note?: string }) =>
  put<Order>(`/orders/${id(order.id)}`, patch).then((response) => response.data);

export const setOrderPaymentStatus = (order: Order, paymentStatus: PaymentStatus) =>
  withContractFallback(
    "orders",
    () => put<Order>(`/orders/${id(order.id)}`, { paymentStatus }),
    () => mock.mockSetPaymentStatus(order, paymentStatus)
  );

export const setRequiresInstallation = (order: Order, requiresInstallation: boolean) =>
  withContractFallback(
    "orders",
    async () => {
      const response = await put<Order>(`/orders/${id(order.id)}`, { requiresInstallation });
      // A pre-contract backend ignores the field. In preview, treat that like a missing route; otherwise say so.
      if (typeof response.data?.requiresInstallation !== "boolean") {
        if (adminPreviewEnabled) throw new ApiError("Route not found.", 404);
        throw new FeatureUnavailableError();
      }
      return response;
    },
    () => mock.mockSetRequiresInstallation(order, requiresInstallation)
  );

export const assignOrderEngineer = (order: Order, engineerId: string | null) =>
  withContractFallback(
    "orders",
    () => post<Order>(`/orders/${id(order.id)}/assign-engineer`, { engineerId }),
    () => mock.mockAssignOrderEngineer(order, engineerId)
  );

/* ---------- Vacancies (contract §3) ---------- */

export const getVacancies = (query: mock.VacancyQuery = {}) =>
  withContractFallback(
    "vacancies",
    () => adminFetch<Paged<Vacancy>>(`/vacancies${toQuery(query)}`),
    () => mock.mockVacancies(query)
  );

export const getVacancy = (vacancyId: string) =>
  withContractFallback("vacancies", () => adminFetch<Vacancy>(`/vacancies/${id(vacancyId)}`), () => mock.mockVacancy(vacancyId));

export const saveVacancy = (vacancyId: string | null, input: VacancyInput) =>
  withContractFallback(
    "vacancies",
    () => (vacancyId ? put<Vacancy>(`/vacancies/${id(vacancyId)}`, input) : post<Vacancy>("/vacancies", input)),
    () => mock.mockSaveVacancy(vacancyId, input)
  );

export const publishVacancy = (vacancyId: string) =>
  withContractFallback(
    "vacancies",
    () => post<Vacancy>(`/vacancies/${id(vacancyId)}/publish`),
    () => mock.mockSetVacancyStatus(vacancyId, "open")
  );

export const unpublishVacancy = (vacancyId: string) =>
  withContractFallback(
    "vacancies",
    () => post<Vacancy>(`/vacancies/${id(vacancyId)}/unpublish`),
    () => mock.mockSetVacancyStatus(vacancyId, "draft")
  );

export const setVacancyStatus = (vacancyId: string, status: VacancyStatus) =>
  withContractFallback(
    "vacancies",
    () => put<Vacancy>(`/vacancies/${id(vacancyId)}`, { status }),
    () => mock.mockSetVacancyStatus(vacancyId, status)
  );

export const deleteVacancy = (vacancyId: string) =>
  withContractFallback("vacancies", () => del<Vacancy>(`/vacancies/${id(vacancyId)}`), () => mock.mockDeleteVacancy(vacancyId));

/* ---------- Catalog (contract §4) ---------- */

export const getCategories = () =>
  withContractFallback("catalog", () => adminFetch<Category[]>("/categories"), () => mock.mockCategories());

export const saveCategory = (categoryId: string | null, input: CategoryInput) =>
  withContractFallback(
    "catalog",
    () => (categoryId ? put<Category>(`/categories/${id(categoryId)}`, input) : post<Category>("/categories", input)),
    () => mock.mockSaveCategory(categoryId, input)
  );

export const deleteCategory = (categoryId: string) =>
  withContractFallback("catalog", () => del<Category>(`/categories/${id(categoryId)}`), () => mock.mockDeleteCategory(categoryId));

export const getProducts = (query: mock.ProductQuery = {}) =>
  withContractFallback(
    "catalog",
    () => adminFetch<Paged<Product>>(`/products${toQuery(query)}`),
    () => mock.mockProducts(query)
  );

export const getProduct = (productId: string) =>
  withContractFallback("catalog", () => adminFetch<Product>(`/products/${id(productId)}`), () => mock.mockProduct(productId));

export const saveProduct = (productId: string | null, input: ProductInput) =>
  withContractFallback(
    "catalog",
    () => (productId ? put<Product>(`/products/${id(productId)}`, input) : post<Product>("/products", input)),
    () => mock.mockSaveProduct(productId, input)
  );

export const deleteProduct = (productId: string) =>
  withContractFallback("catalog", () => del<Product>(`/products/${id(productId)}`), () => mock.mockDeleteProduct(productId));

/* ---------- Inventory (contract §5) ---------- */

export const getInventory = (query: mock.InventoryQuery = {}) =>
  withContractFallback(
    "inventory",
    () => adminFetch<Paged<InventoryItem>>(`/inventory${toQuery(query)}`),
    () => mock.mockInventory(query)
  );

export const adjustStock = (input: StockAdjustmentInput) =>
  withContractFallback(
    "inventory",
    () => post<{ movement: InventoryMovement; product: Product }>("/inventory/adjustments", input),
    () => mock.mockAdjustStock(input)
  );

export const getMovements = (query: mock.MovementQuery = {}) =>
  withContractFallback(
    "inventory",
    () => adminFetch<Paged<InventoryMovement>>(`/inventory/movements${toQuery(query)}`),
    () => mock.mockMovements(query)
  );

export const runLowStockCheck = () =>
  withContractFallback(
    "inventory",
    () => post<{ lowStock: number; emailed: boolean }>("/inventory/low-stock-check"),
    () => mock.mockLowStockCheck()
  );

/* ---------- Installation jobs (contract §7.2) ---------- */

export const getJobs = (query: mock.JobQuery = {}) =>
  withContractFallback("jobs", () => adminFetch<Paged<InstallationJob>>(`/jobs${toQuery(query)}`), () => mock.mockJobs(query));

export const getJob = (jobId: string) =>
  withContractFallback("jobs", () => adminFetch<InstallationJob>(`/jobs/${id(jobId)}`), () => mock.mockJob(jobId));

/**
 * Commerce v3 §1.2: send `engineerIds` (lead first). A second open job for the same order is refused with
 * 409 "This order already has an installation job.". `order` is only used by the preview fallback.
 */
export const createJob = (input: JobCreateInput, order?: Order) =>
  withContractFallback("jobs", () => post<InstallationJob>("/jobs", input), () => mock.mockCreateJob(input, order));

export const updateJob = (jobId: string, input: JobUpdateInput) =>
  withContractFallback("jobs", () => put<InstallationJob>(`/jobs/${id(jobId)}`, input), () => mock.mockUpdateJob(jobId, input));

/** Commerce v3 §1.2: replaces the crew (lead first); an empty array unassigns. */
export const assignJob = (jobId: string, engineerIds: string[]) =>
  withContractFallback(
    "jobs",
    () => post<InstallationJob>(`/jobs/${id(jobId)}/assign`, { engineerIds }),
    () => mock.mockAssignJob(jobId, engineerIds)
  );

export const setJobStatus = (jobId: string, status: JobStatus, note?: string) =>
  withContractFallback(
    "jobs",
    () => post<InstallationJob>(`/jobs/${id(jobId)}/status`, { status, ...(note ? { note } : {}) }),
    () => mock.mockSetJobStatus(jobId, status)
  );

export const deleteJob = (jobId: string) =>
  withContractFallback("jobs", () => del<InstallationJob>(`/jobs/${id(jobId)}`), () => mock.mockDeleteJob(jobId));

/* ---------- Engineer's own jobs (contract §7.3) ---------- */

export const getMyJobs = (query: mock.PageQuery & { status?: JobStatus | "" } = {}) =>
  withContractFallback(
    "my-jobs",
    () => adminFetch<Paged<InstallationJob>>(`/me/jobs${toQuery(query)}`),
    () => mock.mockMyJobs(selfId(), query)
  );

export const getMyJob = (jobId: string) =>
  withContractFallback("my-jobs", () => adminFetch<InstallationJob>(`/me/jobs/${id(jobId)}`), () => mock.mockMyJob(selfId(), jobId));

export const setMyJobStatus = (jobId: string, status: "in_progress" | "completed") =>
  withContractFallback(
    "my-jobs",
    () => post<InstallationJob>(`/me/jobs/${id(jobId)}/status`, { status }),
    () => mock.mockSetMyJobStatus(selfId(), jobId, status)
  );

export const updateMyJob = (jobId: string, input: MyJobUpdateInput) =>
  withContractFallback(
    "my-jobs",
    () => put<InstallationJob>(`/me/jobs/${id(jobId)}`, input),
    () => mock.mockUpdateMyJob(selfId(), jobId, input)
  );

/* ---------- Users (contract §2) and staff (§7.4) ---------- */

export const getUsers = (query: mock.UserQuery = {}) =>
  withContractFallback("users", () => adminFetch<Paged<AdminUser>>(`/users${toQuery(query)}`), () => mock.mockUsers(query));

export const createUser = (input: { name: string; email: string; role: Role; phone?: string | null }) =>
  withContractFallback("users", () => post<AdminUser>("/users", input), () => mock.mockCreateUser(input));

export const updateUser = (userId: string, input: { name?: string; phone?: string | null }) =>
  withContractFallback("users", () => put<AdminUser>(`/users/${id(userId)}`, input), () => mock.mockUpdateUser(userId, input));

export const setUserRole = (userId: string, role: Role) =>
  withContractFallback(
    "users",
    () => post<AdminUser>(`/users/${id(userId)}/role`, { role }),
    () => mock.mockSetUserRole(selfId(), userId, role)
  );

export const setUserActive = (userId: string, isActive: boolean) =>
  withContractFallback(
    "users",
    () => post<AdminUser>(`/users/${id(userId)}/${isActive ? "reactivate" : "deactivate"}`),
    () => mock.mockSetUserActive(selfId(), userId, isActive)
  );

export const getStaff = (query: mock.UserQuery = {}) =>
  withContractFallback("staff", () => adminFetch<Paged<AdminUser>>(`/staff${toQuery(query)}`), () => mock.mockUsers(query));

/** Engineer picker (contract §12): active engineers only. */
export const getEngineers = () => getStaff({ role: "engineer", isActive: true, limit: 100 }).then((page) => page.items);

export const getStaffMember = (staffId: string) =>
  withContractFallback("staff", () => adminFetch<StaffMember>(`/staff/${id(staffId)}`), () => mock.mockStaffMember(staffId));

export const updateStaff = (staffId: string, input: { phone?: string | null; profile?: Partial<StaffProfile> }) =>
  withContractFallback("staff", () => put<StaffMember>(`/staff/${id(staffId)}`, input), () => mock.mockUpdateStaff(staffId, input));

/* ---------- Website content (LANDING_V1 §1–§2) ---------- */

/**
 * No mock: a backend without the route answers with `FeatureUnavailableError`, like `createInStoreOrder`.
 * Every other error (400/401/403/404 record/409/5xx) is rethrown as is.
 */
async function withoutFallback<T>(request: () => Promise<ApiEnvelope<T>>): Promise<ApiEnvelope<T>> {
  try {
    return await request();
  } catch (error) {
    if (isMissingRoute(error)) throw new FeatureUnavailableError(error instanceof ApiError ? error.data : null);
    throw error;
  }
}

export const getFaqs = async () => (await withoutFallback(() => adminFetch<Faq[]>("/faqs"))).data || [];

export const saveFaq = (faqId: string | null, input: FaqInput) =>
  withoutFallback(() => (faqId ? put<Faq>(`/faqs/${id(faqId)}`, input) : post<Faq>("/faqs", input)));

export const deleteFaq = (faqId: string) => withoutFallback(() => del<Faq>(`/faqs/${id(faqId)}`));

export const getTestimonials = async () =>
  (await withoutFallback(() => adminFetch<Testimonial[]>("/testimonials"))).data || [];

export const saveTestimonial = (testimonialId: string | null, input: TestimonialInput) =>
  withoutFallback(() =>
    testimonialId
      ? put<Testimonial>(`/testimonials/${id(testimonialId)}`, input)
      : post<Testimonial>("/testimonials", input)
  );

export const deleteTestimonial = (testimonialId: string) =>
  withoutFallback(() => del<Testimonial>(`/testimonials/${id(testimonialId)}`));

export const getClients = async () => (await withoutFallback(() => adminFetch<Client[]>("/clients"))).data || [];

export const saveClient = (clientId: string | null, input: ClientInput) =>
  withoutFallback(() => (clientId ? put<Client>(`/clients/${id(clientId)}`, input) : post<Client>("/clients", input)));

export const deleteClient = (clientId: string) => withoutFallback(() => del<Client>(`/clients/${id(clientId)}`));

/* ---------- Team members (TEAM_AND_MOTION_V1 §1) ---------- */

export const getTeamMembers = async () =>
  (await withoutFallback(() => adminFetch<TeamMember[]>("/team"))).data || [];

export const saveTeamMember = (memberId: string | null, input: TeamMemberInput) =>
  withoutFallback(() =>
    memberId ? put<TeamMember>(`/team/${id(memberId)}`, input) : post<TeamMember>("/team", input)
  );

export const deleteTeamMember = (memberId: string) =>
  withoutFallback(() => del<TeamMember>(`/team/${id(memberId)}`));

/** Portfolio create/update, including the case-study fields (LANDING_V1 §2). `sample` is server-owned. */
export const savePortfolioItem = (itemId: string | null, input: PortfolioItemInput) =>
  itemId ? put<PortfolioItem>(`/portfolio/${id(itemId)}`, input) : post<PortfolioItem>("/portfolio", input);

/* ---------- Settings and notifications (contract §8) ---------- */

export const getSettings = () =>
  withContractFallback("settings", () => adminFetch<Settings>("/settings"), () => mock.mockSettings());

export const saveSettings = (input: SettingsInput) =>
  withContractFallback("settings", () => put<Settings>("/settings", input), () => mock.mockSaveSettings(input));

export const getNotifications = (query: mock.PageQuery & { unread?: boolean; type?: string } = {}) =>
  withContractFallback(
    "notifications",
    () => adminFetch<NotificationsPage>(`/notifications${toQuery(query)}`),
    () => mock.mockNotifications(query)
  );

export const markNotificationRead = (notificationId: string) =>
  withContractFallback(
    "notifications",
    () => post<AdminNotification>(`/notifications/${id(notificationId)}/read`),
    () => mock.mockReadNotification(notificationId)
  );

export const markAllNotificationsRead = () =>
  withContractFallback(
    "notifications",
    () => post<{ unreadCount: number }>("/notifications/read-all"),
    () => mock.mockReadAllNotifications()
  );

/* ---------- Dashboard KPIs (contract §9) ---------- */

/**
 * Uses `kpis` from the dashboard when present; otherwise computes a preview from orders and mock modules.
 * Pure (safe during render); call `markDashboardPreview()` from an effect when `preview` is true.
 */
export const resolveKpis = (dashboard: Dashboard, orders: Order[] = []) => {
  if (dashboard.kpis) return { kpis: dashboard.kpis, preview: false, available: true };
  if (!adminPreviewEnabled) return { kpis: undefined, preview: false, available: false };
  return { kpis: mock.mockKpis(orders), preview: true, available: true };
};

export const markDashboardPreview = () => mock.markMocked("dashboard");
