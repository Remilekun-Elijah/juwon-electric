/**
 * Admin API: session storage, `adminFetch` (token + 401/403 handling) and one typed function per endpoint.
 *
 * - Session keys match the Vite admin (FE_CONVENTIONS §3.5), so a signed-in session carries over.
 * - The token is sent as `Authorization: Bearer` (API_CONTRACT_V3 §12; the contract wins over the conventions doc).
 * - New-module functions call the contract endpoint first and fall back to `lib/admin/mocks.ts` only when the
 *   backend answers `404 "Route not found."`. TODO(contract): remove the fallback after backend integration.
 */
import type { AdminSelf } from "@/lib/admin/capabilities";
import * as mock from "@/lib/admin/mocks";
import { ApiError, apiRequest, toQuery, type Envelope, type Query } from "./client";
import type {
  AdminNotification,
  AdminUser,
  AuditLogEntry,
  Cart,
  Category,
  CategoryInput,
  CustomerSegment,
  Dashboard,
  FulfillmentStatus,
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
  Paged,
  PaymentStatus,
  Product,
  ProductInput,
  Role,
  SessionResponse,
  Settings,
  SettingsInput,
  StaffMember,
  StaffProfile,
  StockAdjustmentInput,
  Vacancy,
  VacancyInput,
  VacancyStatus,
} from "./types";

export { ApiError };

/* ---------- Session storage ---------- */

export const ADMIN_SESSION_KEY = "je/admin-session";
export const ADMIN_USER_KEY = "je/admin-user";
const LEGACY_TOKEN_KEY = "je/admin-token";

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

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** Calls `/admin${path}` with the session token. A 401 for the token that was sent signs the admin out. */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const token = readAdminToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await apiRequest<T>(`/admin${path}`, { ...init, headers, cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError) {
      // Only act when the rejected token is still the stored one, so a late 401 from an earlier
      // session can't sign out a newer one.
      if (error.status === 401 && readAdminToken() === token) unauthorizedHandler?.();
      if (error.status === 403 && token && readAdminToken() === token) forbiddenHandler?.();
    } else if (error instanceof TypeError) {
      throw new ApiError(0, "Couldn’t reach the server. Check your connection and try again.");
    }
    throw error;
  }
}

/** Name used by the screens ported from the Vite admin. */
export const adminRequest = adminFetch;

const post = <T>(path: string, body: unknown = {}) => adminFetch<T>(path, { method: "POST", ...json(body) });
const put = <T>(path: string, body: unknown) => adminFetch<T>(path, { method: "PUT", ...json(body) });
const del = <T>(path: string) => adminFetch<T>(path, { method: "DELETE" });
const id = (value: string) => encodeURIComponent(value);

/** True when the backend doesn't have this route yet (as opposed to a missing record). */
export const isMissingRoute = (error: unknown) =>
  error instanceof ApiError && error.status === 404 && error.message === "Route not found.";

/**
 * TODO(contract): calls the real endpoint; if the route isn't deployed yet, runs the mock and flags `area`
 * so the portal can show that the screen is using preview data.
 */
async function withContractFallback<T>(area: string, real: () => Promise<Envelope<T>>, fallback: () => T): Promise<T> {
  try {
    return (await real()).data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
    mock.markMocked(area);
    return fallback();
  }
}

const selfId = () => readAdminUser()?.id || "";

/* ---------- Auth (public auth routes; no token) ---------- */

export const login = (username: string, password: string) =>
  apiRequest<LoginResponse>("/admin/auth/login", { method: "POST", ...json({ username, password }) });

export const requestPasswordReset = (username: string) =>
  apiRequest<{ resetToken?: string } | null>("/admin/auth/request-password-reset", { method: "POST", ...json({ username }) });

export const resetPassword = (username: string, token: string, password: string) =>
  apiRequest<unknown>("/admin/auth/reset-password", { method: "POST", ...json({ username, token, password }) });

/** Best effort: the session is cleared locally whatever the result. */
export const logout = () => post<unknown>("/auth/logout");

/** Contract §1.5. Falls back to the stored identity on a backend without `/me`. */
export const getSession = async (): Promise<AdminSelf | null> => {
  try {
    return (await adminFetch<SessionResponse>("/auth/me")).data.admin;
  } catch (error) {
    if (isMissingRoute(error)) return readAdminUser();
    throw error;
  }
};

/* ---------- Existing modules ---------- */

export const getDashboard = (params: { from?: string; to?: string } = {}) =>
  adminFetch<Dashboard>(`/dashboard${toQuery(params)}`);

export const getAuditLogs = (params: Query) =>
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

/* ---------- Orders and fulfilment (contract §6) ---------- */

export type OrderFilters = {
  fulfillmentStatus?: FulfillmentStatus | "";
  paymentStatus?: PaymentStatus | "";
  engineerId?: string;
  requiresInstallation?: boolean | "";
  from?: string;
  to?: string;
};

export const getOrders = async (filters: OrderFilters = {}) => {
  const response = await adminFetch<Order[]>(`/orders${toQuery(filters)}`);
  return { ...response, data: (response.data || []).map(mock.applyOrderOverlay) };
};

export const getOrder = async (orderId: string) => {
  const response = await adminFetch<Order>(`/orders/${id(orderId)}`);
  const order = mock.applyOrderOverlay(response.data);
  return { ...response, data: { ...order, jobs: order.jobs ?? mock.mockOrderJobs(order.id) } };
};

export const setFulfillmentStatus = (order: Order, status: FulfillmentStatus, note?: string) =>
  withContractFallback(
    "orders",
    () => post<Order>(`/orders/${id(order.id)}/fulfillment`, { status, ...(note ? { note } : {}) }),
    () => mock.mockFulfilOrder(order, status)
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
      // A pre-contract backend ignores the field; treat that like a missing route.
      if (typeof response.data?.requiresInstallation !== "boolean") throw new ApiError(404, "Route not found.");
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

/** `order` is only used by the preview fallback to copy customer details. */
export const createJob = (input: JobCreateInput, order?: Order) =>
  withContractFallback("jobs", () => post<InstallationJob>("/jobs", input), () => mock.mockCreateJob(input, order));

export const updateJob = (jobId: string, input: JobUpdateInput) =>
  withContractFallback("jobs", () => put<InstallationJob>(`/jobs/${id(jobId)}`, input), () => mock.mockUpdateJob(jobId, input));

export const assignJob = (jobId: string, engineerId: string | null) =>
  withContractFallback(
    "jobs",
    () => post<InstallationJob>(`/jobs/${id(jobId)}/assign`, { engineerId }),
    () => mock.mockAssignJob(jobId, engineerId)
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

/** Uses `kpis` from the dashboard when present; otherwise computes a preview from orders and mock modules. */
export const resolveKpis = (dashboard: Dashboard, orders: Order[] = []) => {
  if (dashboard.kpis) return dashboard.kpis;
  mock.markMocked("dashboard");
  return mock.mockKpis(orders);
};
