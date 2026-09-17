// Installation jobs, engineer-scoped job updates and staff profiles (API_CONTRACT_V3 §7).
// Pure: storage lives in each runtime. Ids for new checklist items come from the caller
// (`newId`), because shared modules have no crypto global.
import { adminUser, isValidRole } from "./capabilities.js";
import { badRequest, conflict, notFound } from "./errors.js";
import {
  OPS_LIMITS,
  dateTime,
  integer,
  isPlainObject,
  list,
  paginate,
  phone,
  queryText,
  text,
  textList,
  url,
  urlList,
} from "./fields.js";

export const JOB_STATUSES = ["unassigned", "assigned", "in_progress", "completed", "cancelled"];
export const CLOSED_JOB_STATUSES = ["completed", "cancelled"];

// Moves through POST /admin/jobs/:id/status. assigned/unassigned only change through assign.
const STATUS_TRANSITIONS = {
  unassigned: ["cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const ENGINEER_TRANSITIONS = { assigned: ["in_progress"], in_progress: ["completed"] };

export const JOB_NOT_FOUND = "Job not found.";
const jobNotFound = () => notFound(JOB_NOT_FOUND);

const transitionError = (from, to) => conflict(`Cannot change job status from ${from} to ${to}.`);

// ---- fields ------------------------------------------------------------------------------------

const scheduledAtField = (body) => {
  try {
    return dateTime(body, "scheduledAt", { label: "Scheduled time" });
  } catch {
    throw badRequest("Scheduled time must be a valid date.");
  }
};

const durationField = (body) => {
  if (body.durationEstimateMinutes === null) return null;
  return integer(body, "durationEstimateMinutes", { label: "Duration estimate", min: 15, max: OPS_LIMITS.durationMinutesMax });
};

const nullableText = (body, key, label, max) => text(body, key, { label, max, multiline: true }) || null;

const newChecklistItem = (label, newId) => ({ id: newId(), label, done: false, doneAt: null, doneBy: null });

const checklistLabel = (value) => text({ value }, "value", { label: "Checklist item", required: true, max: 200 });

/** Admin checklist: string entries are new items; { id, label } keeps `done` for known ids. */
const adminChecklist = (body, existing, newId) =>
  list(body, "checklist", {
    label: "Checklist",
    max: 50,
    each: (entry) => {
      if (typeof entry === "string") return newChecklistItem(checklistLabel(entry), newId);
      if (!isPlainObject(entry)) throw badRequest("Invalid checklist item.");
      const label = checklistLabel(entry.label);
      const known = typeof entry.id === "string" ? existing.find((item) => item.id === entry.id) : null;
      return known ? { ...known, label } : newChecklistItem(label, newId);
    },
  });

/** POST /admin/jobs body. */
export const jobCreatePayload = (body, newId) => {
  const input = isPlainObject(body) ? body : {};
  const orderId = text(input, "orderId", { label: "Order", required: true, max: OPS_LIMITS.id });
  const rawEngineer = input.engineerId;
  const engineerId =
    rawEngineer === undefined || rawEngineer === null || rawEngineer === ""
      ? null
      : text(input, "engineerId", { label: "Engineer", max: OPS_LIMITS.id });
  return {
    orderId,
    engineerId,
    scheduledAt: scheduledAtField(input) ?? null,
    durationEstimateMinutes: durationField(input) ?? null,
    address: nullableText(input, "address", "Address", 500),
    checklist: adminChecklist(input, [], newId) ?? [],
    notes: nullableText(input, "notes", "Notes", 2000),
  };
};

/** PUT /admin/jobs/:id body (partial). */
export const jobUpdatePayload = (body, job, newId) => {
  const input = isPlainObject(body) ? body : {};
  const patch = {};
  if (input.scheduledAt !== undefined) patch.scheduledAt = scheduledAtField(input) ?? null;
  if (input.durationEstimateMinutes !== undefined) patch.durationEstimateMinutes = durationField(input) ?? null;
  if (input.address !== undefined) patch.address = nullableText(input, "address", "Address", 500);
  if (input.notes !== undefined) patch.notes = nullableText(input, "notes", "Notes", 2000);
  if (input.checklist !== undefined) patch.checklist = adminChecklist(input, job.checklist || [], newId);
  if (CLOSED_JOB_STATUSES.includes(job.status)) throw conflict("Job is closed.");
  return patch;
};

/** { status, note } for the admin (any job status) or engineer status endpoint. */
export const jobStatusPayload = (body, { engineer = false } = {}) => {
  const input = isPlainObject(body) ? body : {};
  const allowed = engineer ? ["in_progress", "completed"] : JOB_STATUSES;
  if (typeof input.status !== "string" || !allowed.includes(input.status.trim())) throw badRequest("Status is not valid.");
  return { status: input.status.trim(), note: engineer ? "" : text(input, "note", { label: "Note", max: 2000, multiline: true }) };
};

/** Status move with its timestamps. Engineers must finish the checklist before completing. */
export const planJobStatus = (job, to, { timestamp, engineer = false }) => {
  if (job.status === to) return {};
  const allowed = (engineer ? ENGINEER_TRANSITIONS : STATUS_TRANSITIONS)[job.status] || [];
  if (!allowed.includes(to)) throw transitionError(job.status, to);
  if (engineer && to === "completed" && (job.checklist || []).some((item) => !item.done)) {
    throw conflict("Complete the checklist first.");
  }
  const patch = { status: to };
  if (to === "in_progress" && !job.startedAt) patch.startedAt = timestamp;
  if (to === "completed") patch.completedAt = timestamp;
  if (to === "cancelled") patch.cancelledAt = timestamp;
  return patch;
};

/** Assignment move: engineerId null unassigns. Only open, not-started jobs can be (re)assigned. */
export const planJobAssignment = (job, engineerId) => {
  const to = engineerId ? "assigned" : "unassigned";
  if (!["unassigned", "assigned"].includes(job.status)) throw transitionError(job.status, to);
  return { engineerId: engineerId || null, status: to };
};

/** PUT /admin/me/jobs/:id body: { checklist?: [{ id, done }], photos?, completionNotes? }. */
export const engineerJobPayload = (body, job, { actorId, timestamp }) => {
  const input = isPlainObject(body) ? body : {};
  const patch = {};
  if (input.checklist !== undefined) {
    const updates = list(input, "checklist", {
      label: "Checklist",
      max: 50,
      each: (entry) => {
        if (!isPlainObject(entry) || typeof entry.id !== "string") throw badRequest("Checklist item not found.");
        if (typeof entry.done !== "boolean") throw badRequest("done must be true or false.");
        return entry;
      },
    });
    const checklist = (job.checklist || []).map((item) => ({ ...item }));
    for (const update of updates) {
      const item = checklist.find((entry) => entry.id === update.id);
      if (!item) throw badRequest("Checklist item not found.");
      if (item.done !== update.done) {
        item.done = update.done;
        item.doneAt = update.done ? timestamp : null;
        item.doneBy = update.done ? actorId : null;
      }
    }
    patch.checklist = checklist;
  }
  if (input.photos !== undefined) patch.photos = urlList(input, "photos", { label: "Photos", max: 20 });
  if (input.completionNotes !== undefined) patch.completionNotes = nullableText(input, "completionNotes", "Completion notes", 5000);
  if (!["assigned", "in_progress"].includes(job.status)) throw conflict("Job is closed.");
  return patch;
};

export const assertJobDeletable = (job) => {
  if (!["unassigned", "assigned", "cancelled"].includes(job.status)) throw conflict("Job cannot be deleted once started.");
};

/** Order rules for creating a job. */
export const assertOrderAcceptsJobs = (order) => {
  if (order.requiresInstallation !== true) throw conflict("Order does not require installation.");
  if (order.fulfillmentStatus === "cancelled") throw conflict("Order is cancelled.");
};

/** True when completing this job should move the order to installed (§7.1). */
export const orderReadyForInstalled = (order, jobs) =>
  order.fulfillmentStatus === "delivered" &&
  jobs.some((job) => job.status === "completed") &&
  jobs.every((job) => job.status === "completed" || job.status === "cancelled");

// ---- shapes and lists ----------------------------------------------------------------------------

export const serializeJob = (job, ordersById = new Map(), adminsById = new Map()) => {
  const order = ordersById.get(job.orderId);
  const engineer = job.engineerId ? adminsById.get(job.engineerId) : null;
  return {
    id: job.id,
    orderId: job.orderId,
    order: order
      ? { id: order.id, name: order.name ?? "", phoneNumber: order.phoneNumber ?? "", deliveryAddress: order.deliveryAddress ?? "" }
      : null,
    engineerId: job.engineerId ?? null,
    engineer: engineer
      ? {
          id: engineer.id,
          name: engineer.name ?? "",
          email: engineer.email ?? "",
          phone: typeof engineer.phone === "string" && engineer.phone ? engineer.phone : null,
        }
      : null,
    scheduledAt: job.scheduledAt ?? null,
    durationEstimateMinutes: job.durationEstimateMinutes ?? null,
    address: job.address ?? null,
    status: job.status,
    checklist: Array.isArray(job.checklist) ? job.checklist : [],
    photos: Array.isArray(job.photos) ? job.photos : [],
    notes: job.notes ?? null,
    completionNotes: job.completionNotes ?? null,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    cancelledAt: job.cancelledAt ?? null,
    createdAt: job.createdAt ?? null,
    updatedAt: job.updatedAt ?? null,
  };
};

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** scheduledAt ascending (unscheduled last), then createdAt descending. */
export const jobOrder = (a, b) => {
  if (a.scheduledAt && !b.scheduledAt) return -1;
  if (!a.scheduledAt && b.scheduledAt) return 1;
  return compare(String(a.scheduledAt ?? ""), String(b.scheduledAt ?? "")) || compare(String(b.createdAt), String(a.createdAt)) || compare(String(a.id), String(b.id));
};

const rangeValue = (query, key) => {
  const value = queryText(query, key);
  if (!value) return "";
  try {
    return dateTime({ value }, "value") || "";
  } catch {
    throw badRequest(`${key} must be a valid date.`);
  }
};

const statusFilter = (query) => {
  const status = queryText(query, "status");
  if (status && !JOB_STATUSES.includes(status)) throw badRequest("Status is not valid.");
  return status;
};

/** GET /admin/jobs filters and ordering. Returns the paged stored jobs. */
export const adminJobPage = (jobs, query, page) => {
  const status = statusFilter(query);
  const engineerId = queryText(query, "engineerId");
  const orderId = queryText(query, "orderId");
  const from = rangeValue(query, "from");
  const to = rangeValue(query, "to");
  const items = jobs
    .filter(
      (job) =>
        (!status || job.status === status) &&
        (!engineerId || job.engineerId === engineerId) &&
        (!orderId || job.orderId === orderId) &&
        (!from || (job.scheduledAt && job.scheduledAt >= from)) &&
        (!to || (job.scheduledAt && job.scheduledAt <= to))
    )
    .sort(jobOrder);
  return paginate(items, page);
};

/** GET /admin/me/jobs: the engineer's jobs, open ones unless `status` is given. */
export const myJobPage = (jobs, engineerId, query, page) => {
  const status = statusFilter(query);
  const items = jobs
    .filter((job) => job.engineerId === engineerId && (status ? job.status === status : !CLOSED_JOB_STATUSES.includes(job.status)))
    .sort(jobOrder);
  return paginate(items, page);
};

/** An engineer's own job, or 404 (never 403, so other job ids cannot be probed). */
export const ownJob = (job, engineerId) => {
  if (!job || job.engineerId !== engineerId) throw jobNotFound();
  return job;
};

export const serializeJobPage = (paged, ordersById, adminsById) => ({
  ...paged,
  items: paged.items.map((job) => serializeJob(job, ordersById, adminsById)),
});

// ---- staff (§7.4) ----------------------------------------------------------------------------------

/** PUT /admin/staff/:id body: { phone?, profile?: Partial<StaffProfile> } -> patch merged over the stored profile. */
export const staffPayload = (body, admin) => {
  const input = isPlainObject(body) ? body : {};
  const patch = {};
  if (input.phone !== undefined) patch.phone = input.phone === null ? null : phone(input, "phone") || null;
  if (input.profile !== undefined) {
    if (!isPlainObject(input.profile)) throw badRequest("Profile must be an object.");
    const source = input.profile;
    const current = adminUser(admin).profile;
    const profile = { ...current };
    if (source.areaCoverage !== undefined) {
      profile.areaCoverage = textList(source, "areaCoverage", { label: "Area coverage", max: 20, itemMax: 100 }) ?? [];
    }
    if (source.certifications !== undefined) {
      profile.certifications = textList(source, "certifications", { label: "Certifications", max: 20, itemMax: 150 }) ?? [];
    }
    if (source.bio !== undefined) profile.bio = text(source, "bio", { label: "Bio", max: 1000, multiline: true }) || null;
    if (source.avatarUrl !== undefined) profile.avatarUrl = url(source, "avatarUrl", { label: "Avatar URL" }) || null;
    patch.profile = profile;
  }
  return patch;
};

/** GET /admin/staff: AdminUser page filtered by role/area/isActive/q, ordered by name. */
export const staffPage = (admins, query, page) => {
  const role = queryText(query, "role");
  if (role && !isValidRole(role)) throw badRequest("Role is not valid.");
  const isActive = queryText(query, "isActive");
  if (isActive && !["true", "false"].includes(isActive)) throw badRequest("isActive must be true or false.");
  const area = queryText(query, "area").toLowerCase();
  const q = queryText(query, "q").toLowerCase();
  const items = admins
    .map(adminUser)
    .filter(
      (user) =>
        (!role || user.role === role) &&
        (!isActive || String(user.isActive) === isActive) &&
        (!area || user.profile.areaCoverage.some((entry) => String(entry).toLowerCase() === area)) &&
        (!q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q))
    )
    .sort((a, b) => compare(a.name.toLowerCase(), b.name.toLowerCase()) || compare(a.email, b.email));
  return paginate(items, page);
};

export const openJobCount = (jobs, engineerId) =>
  jobs.filter((job) => job.engineerId === engineerId && !CLOSED_JOB_STATUSES.includes(job.status)).length;
