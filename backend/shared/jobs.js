// Installation jobs, engineer-scoped job updates and staff profiles (API_CONTRACT_V3 §7).
// Pure: storage lives in each runtime. Ids for new checklist items come from the caller
// (`newId`), because shared modules have no crypto global.
import { adminUser, isValidRole } from "./capabilities.js";
import { badRequest, conflict, notFound } from "./errors.js";
import {
  OPS_LIMITS,
  dateTime,
  imageUrl,
  imageUrlList,
  integer,
  isPlainObject,
  list,
  paginate,
  phone,
  queryText,
  text,
  textList,
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
export const JOB_ENGINEERS_MAX = 10;
export const ASSIGNEE_MESSAGE = "Assignee must be an active engineer.";
export const ORDER_HAS_JOB_MESSAGE = "This order already has an installation job.";
const jobNotFound = () => notFound(JOB_NOT_FOUND);

const transitionError = (from, to) => conflict(`Cannot change job status from ${from} to ${to}.`);

// ---- crews (COMMERCE_V3 §1) ------------------------------------------------------------------------

/**
 * The job's engineer ids, lead first. Read-time migration: a job stored before crews has only
 * `engineerId`, which reads as a crew of one (or none).
 */
export const jobEngineerIds = (job) => {
  if (Array.isArray(job?.engineerIds)) return job.engineerIds.filter((id) => typeof id === "string" && id);
  return typeof job?.engineerId === "string" && job.engineerId ? [job.engineerId] : [];
};

/** Fields a stored job is missing (persisted on its next write): `engineerIds` from the legacy `engineerId`. */
export const jobBackfill = (job) => (Array.isArray(job?.engineerIds) ? {} : crewFields(jobEngineerIds(job)));

/** True when the admin is on the job's crew (lead or member). */
export const isJobEngineer = (job, adminId) => Boolean(adminId) && jobEngineerIds(job).includes(adminId);

/** Stored crew fields: `engineerIds`, with `engineerId` mirroring the lead for older readers. */
export const crewFields = (engineerIds) => ({ engineerIds, engineerId: engineerIds[0] ?? null });

const sameIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);

/** Ids in `next` that are not in `previous` (they get a job_assigned notification). */
export const newlyAddedEngineers = (previous, next) => next.filter((id) => !previous.includes(id));

/**
 * Crew from a create, update or assign body: `engineerIds` (a list, max 10, unique), else the
 * legacy `engineerId` (a string, or null/"" for none). Returns undefined when neither is sent.
 * Existence and role are checked by the runtime (assertActiveEngineer).
 */
export const engineerIdsInput = (body) => {
  const input = isPlainObject(body) ? body : {};
  if (input.engineerIds !== undefined) {
    if (!Array.isArray(input.engineerIds)) throw badRequest("Engineers must be a list.");
    if (input.engineerIds.length > JOB_ENGINEERS_MAX) throw badRequest(`A job can have at most ${JOB_ENGINEERS_MAX} engineers.`);
    const ids = input.engineerIds.map((raw) => {
      if (typeof raw !== "string" || !raw.trim() || raw.trim().length > OPS_LIMITS.id) throw badRequest(ASSIGNEE_MESSAGE);
      return raw.trim();
    });
    if (new Set(ids).size !== ids.length) throw badRequest("Each engineer can be added once.");
    return ids;
  }
  if (input.engineerId === undefined) return undefined;
  if (input.engineerId === null || input.engineerId === "") return [];
  if (typeof input.engineerId !== "string" || !input.engineerId.trim() || input.engineerId.trim().length > OPS_LIMITS.id) {
    throw badRequest(ASSIGNEE_MESSAGE);
  }
  return [input.engineerId.trim()];
};

/** 409 when the order already has a job that is not cancelled (one job per order). */
export const assertOrderHasNoOpenJob = (jobs) => {
  if (jobs.some((job) => job.status !== "cancelled")) throw conflict(ORDER_HAS_JOB_MESSAGE);
};

/** "Job for <customer>: engineers a@x, b@y" (or "no engineers"), for assignment audits. */
export const crewAuditSummary = (order, engineers) =>
  `Job for ${order?.name || order?.id || "an order"}: ${
    engineers.length ? `engineers ${engineers.map((engineer) => engineer.email).join(", ")}` : "no engineers"
  }`;

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

/**
 * POST /admin/jobs body. `engineerIds` is undefined when the body names no engineers (neither
 * `engineerIds` nor a non-empty legacy `engineerId`): the runtime then starts the job with the
 * order's assigned engineer, if any.
 */
export const jobCreatePayload = (body, newId) => {
  const input = isPlainObject(body) ? body : {};
  const orderId = text(input, "orderId", { label: "Order", required: true, max: OPS_LIMITS.id });
  const crew = engineerIdsInput(input);
  const named = input.engineerIds !== undefined || (crew !== undefined && crew.length > 0);
  return {
    orderId,
    engineerIds: named ? crew : undefined,
    scheduledAt: scheduledAtField(input) ?? null,
    durationEstimateMinutes: durationField(input) ?? null,
    address: nullableText(input, "address", "Address", 500),
    checklist: adminChecklist(input, [], newId) ?? [],
    notes: nullableText(input, "notes", "Notes", 2000),
  };
};

/**
 * PUT /admin/jobs/:id body (partial). A sent crew that differs from the stored one is applied
 * with the reassignment rules (planJobAssignment); the same crew is a no-op.
 */
export const jobUpdatePayload = (body, job, newId) => {
  const input = isPlainObject(body) ? body : {};
  const patch = {};
  const crew = engineerIdsInput(input);
  if (input.scheduledAt !== undefined) patch.scheduledAt = scheduledAtField(input) ?? null;
  if (input.durationEstimateMinutes !== undefined) patch.durationEstimateMinutes = durationField(input) ?? null;
  if (input.address !== undefined) patch.address = nullableText(input, "address", "Address", 500);
  if (input.notes !== undefined) patch.notes = nullableText(input, "notes", "Notes", 2000);
  if (input.checklist !== undefined) patch.checklist = adminChecklist(input, job.checklist || [], newId);
  if (CLOSED_JOB_STATUSES.includes(job.status)) throw conflict("Job is closed.");
  if (crew !== undefined && !sameIds(crew, jobEngineerIds(job))) Object.assign(patch, planJobAssignment(job, crew));
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

/** Assignment move: an empty crew unassigns. Only open, not-started jobs can be (re)assigned. */
export const planJobAssignment = (job, engineerIds) => {
  const to = engineerIds.length ? "assigned" : "unassigned";
  if (!["unassigned", "assigned"].includes(job.status)) throw transitionError(job.status, to);
  return { ...crewFields(engineerIds), status: to };
};

/** POST /admin/jobs/:id/assign body: { engineerIds } or legacy { engineerId }. */
export const jobAssignPayload = (body) => {
  const crew = engineerIdsInput(body);
  if (crew === undefined) throw badRequest(ASSIGNEE_MESSAGE);
  return crew;
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
  if (input.photos !== undefined) patch.photos = imageUrlList(input, "photos", { label: "Photos", max: 20 });
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

const engineerRef = (engineer) => ({
  id: engineer.id,
  name: engineer.name ?? "",
  email: engineer.email ?? "",
  phone: typeof engineer.phone === "string" && engineer.phone ? engineer.phone : null,
});

export const serializeJob = (job, ordersById = new Map(), adminsById = new Map()) => {
  const order = ordersById.get(job.orderId);
  const engineerIds = jobEngineerIds(job);
  const lead = engineerIds.length ? adminsById.get(engineerIds[0]) : null;
  return {
    id: job.id,
    orderId: job.orderId,
    order: order
      ? { id: order.id, name: order.name ?? "", phoneNumber: order.phoneNumber ?? "", deliveryAddress: order.deliveryAddress ?? "" }
      : null,
    engineerId: engineerIds[0] ?? null,
    engineerIds,
    engineer: lead ? engineerRef(lead) : null,
    engineers: engineerIds.flatMap((id) => (adminsById.has(id) ? [engineerRef(adminsById.get(id))] : [])),
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
        (!engineerId || isJobEngineer(job, engineerId)) &&
        (!orderId || job.orderId === orderId) &&
        (!from || (job.scheduledAt && job.scheduledAt >= from)) &&
        (!to || (job.scheduledAt && job.scheduledAt <= to))
    )
    .sort(jobOrder);
  return paginate(items, page);
};

/** GET /admin/me/jobs: the jobs whose crew includes the engineer, open ones unless `status` is given. */
export const myJobPage = (jobs, engineerId, query, page) => {
  const status = statusFilter(query);
  const items = jobs
    .filter((job) => isJobEngineer(job, engineerId) && (status ? job.status === status : !CLOSED_JOB_STATUSES.includes(job.status)))
    .sort(jobOrder);
  return paginate(items, page);
};

/** A job the engineer is on (lead or crew), or 404 (never 403, so other job ids cannot be probed). */
export const ownJob = (job, engineerId) => {
  if (!job || !isJobEngineer(job, engineerId)) throw jobNotFound();
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
    if (source.avatarUrl !== undefined) profile.avatarUrl = imageUrl(source, "avatarUrl", { label: "Avatar URL" }) || null;
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
  jobs.filter((job) => isJobEngineer(job, engineerId) && !CLOSED_JOB_STATUSES.includes(job.status)).length;
