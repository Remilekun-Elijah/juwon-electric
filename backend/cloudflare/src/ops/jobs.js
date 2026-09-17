// Installation jobs, engineer-scoped job endpoints and staff (API_CONTRACT_V3 §7) for the
// Worker, at parity with backend/controllers/jobs.js. Rules: backend/shared/jobs.js.
import { created, ok } from "../http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  getById,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../store.js";
import { requireCapability } from "../capabilities.js";
import { applyStockChanges } from "./stock.js";
import { idAfter, queryOf } from "./catalog.js";
import { applyOrderPlan, jobsOfOrder } from "./orders.js";
import { adminUser } from "../../../shared/capabilities.js";
import { notFound } from "../../../shared/errors.js";
import { pageParams } from "../../../shared/fields.js";
import {
  adminJobPage,
  assertJobDeletable,
  assertOrderAcceptsJobs,
  assertOrderHasNoOpenJob,
  crewAuditSummary,
  crewFields,
  engineerJobPayload,
  jobAssignPayload,
  jobBackfill,
  jobEngineerIds,
  jobCreatePayload,
  jobStatusPayload,
  jobUpdatePayload,
  myJobPage,
  newlyAddedEngineers,
  openJobCount,
  orderReadyForInstalled,
  ownJob,
  planJobAssignment,
  planJobStatus,
  serializeJob,
  serializeJobPage,
  staffPage,
  staffPayload,
} from "../../../shared/jobs.js";
import { assertActiveEngineer, planOrderChanges, serializeOrder } from "../../../shared/orders.js";
import { jobAssignedNotification } from "../../../shared/notifications.js";
import { notify } from "../notifications.js";

const byId = (records) => new Map(records.map((record) => [record.id, record]));
const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

const references = async (env) => {
  const [orders, admins] = await Promise.all([
    listCollection(env, "orders", { includeInactive: true }),
    listCollection(env, "admins", { includeInactive: true }),
  ]);
  return { orders: byId(orders), admins: byId(admins) };
};

const serialize = async (env, job) => {
  const [order, ...engineers] = await Promise.all([
    getById(env, "orders", job.orderId),
    ...jobEngineerIds(job).map((id) => getById(env, "admins", id)),
  ]);
  return serializeJob(job, byId(order ? [order] : []), byId(engineers.filter(Boolean)));
};

/** The crew's admin records, in order; every one must be an active engineer. */
const engineersFor = async (env, engineerIds) => {
  const engineers = await Promise.all(engineerIds.map((id) => getById(env, "admins", id)));
  engineers.forEach(assertActiveEngineer);
  return engineers;
};

/** A job created without engineers starts with the order's assigned engineer, when still active. */
const orderCrew = async (env, order) => {
  if (!order.assignedEngineerId) return [];
  const engineer = await getById(env, "admins", order.assignedEngineerId);
  try {
    assertActiveEngineer(engineer);
    return [engineer];
  } catch {
    return [];
  }
};

const assignOrderEngineerIfUnset = (env, orderId, engineerId) =>
  applyStockChanges(env, {
    lines: [],
    record: { collection: "orders", id: orderId, expect: { assignedEngineerId: null }, patch: { assignedEngineerId: engineerId } },
  }).catch(() => {});

const writeJobPatch = async (env, job, patch) =>
  (
    await applyStockChanges(env, {
      lines: [],
      record: { collection: "installationJobs", id: job.id, expect: { status: job.status }, patch },
    })
  ).record;

const installOrderWhenDone = async (context, orderId) => {
  try {
    const order = await getById(context.env, "orders", orderId);
    if (!order || !orderReadyForInstalled(serializeOrder(order), await jobsOfOrder(context.env, orderId))) return;
    const plan = planOrderChanges(order, { fulfillmentStatus: "installed" }, { timestamp: now() });
    await applyOrderPlan(context, order, plan);
  } catch (error) {
    console.error("Moving the order to installed failed:", error?.message);
  }
};

const handleAdminJobs = async (context) => {
  const { request, env, path, body, admin, audit, url } = context;
  const { method } = request;
  const auditJob = (action, job, summary, changes = []) => audit({ action, entity: "job", entityId: job.id, summary, changes });

  // See afterCrewChange in backend/controllers/jobs.js.
  const afterCrewChange = async (job, previousIds, engineers, order) => {
    const target = order ?? (await getById(env, "orders", job.orderId));
    if (engineers.length) await assignOrderEngineerIfUnset(env, job.orderId, engineers[0].id);
    for (const id of newlyAddedEngineers(previousIds, jobEngineerIds(job))) {
      notify(env, context.ctx, jobAssignedNotification(job, target, id));
    }
    auditJob("job.assign", job, crewAuditSummary(target, engineers), ["engineerIds", "status"]);
  };

  if (path === "/admin/jobs" && method === "GET") {
    requireCapability(admin, "jobs:read");
    const query = queryOf(url);
    const page = pageParams(query);
    const [jobs, refs] = await Promise.all([listCollection(env, "installationJobs", { includeInactive: true }), references(env)]);
    return ok("Jobs retrieved.", serializeJobPage(adminJobPage(jobs, query, page), refs.orders, refs.admins));
  }

  if (path === "/admin/jobs" && method === "POST") {
    requireCapability(admin, "jobs:assign");
    const { engineerIds, ...payload } = jobCreatePayload(body, newId);
    const order = await getCollectionItem(env, "orders", payload.orderId);
    const named = engineerIds !== undefined ? await engineersFor(env, engineerIds) : null;
    assertOrderAcceptsJobs(serializeOrder(order));
    assertOrderHasNoOpenJob(await jobsOfOrder(env, order.id));
    const engineers = named ?? (await orderCrew(env, order));
    const job = await createCollectionItem(env, "installationJobs", {
      ...payload,
      ...crewFields(engineers.map((engineer) => engineer.id)),
      orderId: order.id,
      address: payload.address ?? order.deliveryAddress ?? null,
      status: engineers.length ? "assigned" : "unassigned",
      photos: [],
      completionNotes: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
    });
    auditJob("job.create", job, `Created job for order from ${order.name || order.id}`, [...Object.keys(payload), "engineerIds"]);
    if (engineers.length) await afterCrewChange(job, [], engineers, order);
    return created("Job created.", await serialize(env, job));
  }

  const jobId = idAfter(path, "/admin/jobs");
  if (jobId && method === "GET") {
    requireCapability(admin, "jobs:read");
    return ok("Job retrieved.", await serialize(env, await getCollectionItem(env, "installationJobs", jobId)));
  }
  if (jobId && method === "PUT") {
    requireCapability(admin, "jobs:assign");
    const job = await getCollectionItem(env, "installationJobs", jobId);
    const patch = jobUpdatePayload(body, job, newId);
    const crewChanged = patch.engineerIds !== undefined;
    const engineers = crewChanged ? await engineersFor(env, patch.engineerIds) : [];
    const changes = { ...jobBackfill(job), ...patch };
    // A crew change moves the status, so it is written only while the status is unchanged.
    const item = crewChanged ? await writeJobPatch(env, job, changes) : await updateCollectionItem(env, "installationJobs", job.id, changes);
    auditJob("job.update", item, "Updated job", Object.keys(patch));
    if (crewChanged) await afterCrewChange(item, jobEngineerIds(job), engineers);
    return ok("Job updated.", await serialize(env, item));
  }
  if (jobId && method === "DELETE") {
    requireCapability(admin, "jobs:assign");
    const job = await getCollectionItem(env, "installationJobs", jobId);
    assertJobDeletable(job);
    await deleteCollectionItem(env, "installationJobs", job);
    auditJob("job.delete", job, "Deleted job");
    return ok("Job deleted.", await serialize(env, job));
  }

  const action = /^\/admin\/jobs\/([^/]+)\/(assign|status)$/.exec(path);
  if (!action || method !== "POST") return null;
  requireCapability(admin, "jobs:assign");

  if (action[2] === "assign") {
    const engineerIds = jobAssignPayload(body);
    const job = await getCollectionItem(env, "installationJobs", action[1]);
    const engineers = await engineersFor(env, engineerIds);
    const item = await writeJobPatch(env, job, planJobAssignment(job, engineerIds));
    await afterCrewChange(item, jobEngineerIds(job), engineers);
    return ok(engineerIds.length ? "Job assigned." : "Job unassigned.", await serialize(env, item));
  }

  const { status, note } = jobStatusPayload(body);
  const job = await getCollectionItem(env, "installationJobs", action[1]);
  const patch = planJobStatus(job, status, { timestamp: now() });
  if (!patch.status) return ok("Job status updated.", await serialize(env, job));
  const item = await writeJobPatch(env, job, { ...jobBackfill(job), ...patch });
  auditJob("job.status_change", item, `Job ${job.status} → ${status}${note ? `: ${note.slice(0, 200)}` : ""}`, ["status"]);
  if (status === "completed") await installOrderWhenDone(context, job.orderId);
  return ok("Job status updated.", await serialize(env, item));
};

const handleMyJobs = async (context) => {
  const { request, env, path, body, admin, audit, url } = context;
  const { method } = request;
  const meId = admin?.id;

  if (path === "/admin/me/jobs" && method === "GET") {
    requireCapability(admin, "jobs:update-own");
    const query = queryOf(url);
    const page = pageParams(query);
    const [jobs, refs] = await Promise.all([listCollection(env, "installationJobs", { includeInactive: true }), references(env)]);
    return ok("Jobs retrieved.", serializeJobPage(myJobPage(jobs, meId, query, page), refs.orders, refs.admins));
  }

  const statusMatch = /^\/admin\/me\/jobs\/([^/]+)\/status$/.exec(path);
  if (statusMatch && method === "POST") {
    requireCapability(admin, "jobs:update-own");
    const { status } = jobStatusPayload(body, { engineer: true });
    const job = ownJob(await getById(env, "installationJobs", statusMatch[1]), meId);
    const patch = planJobStatus(job, status, { timestamp: now(), engineer: true });
    if (!patch.status) return ok("Job status updated.", await serialize(env, job));
    const item = await writeJobPatch(env, job, { ...jobBackfill(job), ...patch });
    audit({ action: "job.status_change", entity: "job", entityId: job.id, summary: `Job ${job.status} → ${status}`, changes: ["status"] });
    if (status === "completed") await installOrderWhenDone(context, job.orderId);
    return ok("Job status updated.", await serialize(env, item));
  }

  const jobId = idAfter(path, "/admin/me/jobs");
  if (jobId && method === "GET") {
    requireCapability(admin, "jobs:update-own");
    return ok("Job retrieved.", await serialize(env, ownJob(await getById(env, "installationJobs", jobId), meId)));
  }
  if (jobId && method === "PUT") {
    requireCapability(admin, "jobs:update-own");
    const job = ownJob(await getById(env, "installationJobs", jobId), meId);
    const patch = engineerJobPayload(body, job, { actorId: meId, timestamp: now() });
    const item = await updateCollectionItem(env, "installationJobs", job.id, { ...jobBackfill(job), ...patch });
    audit({ action: "job.update", entity: "job", entityId: job.id, summary: "Updated job", changes: Object.keys(patch) });
    return ok("Job updated.", await serialize(env, item));
  }
  return null;
};

const handleStaff = async (context) => {
  const { request, env, path, body, admin, audit, url } = context;
  const { method } = request;

  if (path === "/admin/staff" && method === "GET") {
    requireCapability(admin, "staff:read");
    const query = queryOf(url);
    const page = pageParams(query);
    return ok("Staff retrieved.", staffPage(await listCollection(env, "admins", { includeInactive: true }), query, page));
  }

  const staffId = idAfter(path, "/admin/staff");
  if (!staffId || (method !== "GET" && method !== "PUT")) return null;
  requireCapability(admin, method === "GET" ? "staff:read" : "staff:write");
  if (method === "PUT") staffPayload(body, {});
  const member = await getById(env, "admins", staffId);
  if (!member) throw notFound("User not found.");

  if (method === "GET") {
    const jobs = await listCollection(env, "installationJobs", { includeInactive: true });
    return ok("Staff member retrieved.", { ...adminUser(member), openJobs: openJobCount(jobs, member.id) });
  }
  const patch = staffPayload(body, member);
  const item = await updateCollectionItem(env, "admins", member.id, patch);
  audit({ action: "user.update", entity: "user", entityId: member.id, summary: `Updated staff profile of ${member.email}`, changes: Object.keys(patch) });
  return ok("Staff member updated.", adminUser(item));
};

export const handleJobsAdmin = async (context) =>
  (await handleAdminJobs(context)) || (await handleMyJobs(context)) || (await handleStaff(context));
