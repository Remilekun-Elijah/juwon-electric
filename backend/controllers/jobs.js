// Installation jobs, engineer-scoped job endpoints and staff (API_CONTRACT_V3 §7). Rules are
// shared with the Worker (backend/shared/jobs.js).
import { randomUUID } from "crypto";
import { applyOrderPlan, jobsOf } from "./orders.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { STATIC_TOKEN_ACTOR, audit } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import {
  applyStockChanges,
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
  updateCollectionItemIf,
} from "../services/store.js";
import { adminUser } from "../shared/capabilities.js";
import { notFound } from "../shared/errors.js";
import { pageParams } from "../shared/fields.js";
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
} from "../shared/jobs.js";
import { assertActiveEngineer, planOrderChanges, serializeOrder } from "../shared/orders.js";
import { jobAssignedNotification } from "../shared/notifications.js";
import { notify } from "../services/notifications.js";

const byId = (records) => new Map(records.map((record) => [record.id, record]));
const now = () => new Date().toISOString();

const references = async () => {
  const [orders, admins] = await Promise.all([
    listCollection("orders", { includeInactive: true }),
    listCollection("admins", { includeInactive: true }),
  ]);
  return { orders: byId(orders), admins: byId(admins) };
};

const serialize = async (job) => {
  const [order, ...engineers] = await Promise.all([
    findCollectionItem("orders", { id: job.orderId }),
    ...jobEngineerIds(job).map((id) => findCollectionItem("admins", { id })),
  ]);
  return serializeJob(job, byId(order ? [order] : []), byId(engineers.filter(Boolean)));
};

/** The crew's admin records, in order; every one must be an active engineer. */
const engineersFor = async (engineerIds) => {
  const engineers = await Promise.all(engineerIds.map((id) => findCollectionItem("admins", { id })));
  engineers.forEach(assertActiveEngineer);
  return engineers;
};

/** A job created without engineers starts with the order's assigned engineer, when still active. */
const orderCrew = async (order) => {
  if (!order.assignedEngineerId) return [];
  const engineer = await findCollectionItem("admins", { id: order.assignedEngineerId });
  try {
    assertActiveEngineer(engineer);
    return [engineer];
  } catch {
    return [];
  }
};

/** Sets order.assignedEngineerId when it is still empty (best effort, never fails the request). */
const assignOrderEngineerIfUnset = (orderId, engineerId) =>
  updateCollectionItemIf("orders", { id: orderId, assignedEngineerId: null }, { assignedEngineerId: engineerId }).catch(
    (error) => console.error("Setting the order engineer failed:", error?.message)
  );

/** Writes a job status/assignment patch only while the job still has the status it was read with. */
const writeJobPatch = async (job, patch) =>
  (
    await applyStockChanges({
      lines: [],
      record: { collection: "installationJobs", id: job.id, expect: { status: job.status }, patch },
    })
  ).record;

/** After a job completes: a delivered order whose open jobs are all completed moves to installed. */
const installOrderWhenDone = async (req, orderId) => {
  try {
    const order = await findCollectionItem("orders", { id: orderId });
    if (!order || !orderReadyForInstalled(serializeOrder(order), await jobsOf(orderId))) return;
    const plan = planOrderChanges(order, { fulfillmentStatus: "installed" }, { timestamp: now() });
    await applyOrderPlan(req, order, plan);
  } catch (error) {
    console.error("Moving the order to installed failed:", error?.message);
  }
};

const auditJob = (req, action, job, summary, changes = []) =>
  audit(req, { action, entity: "job", entityId: job.id, summary, changes });

/**
 * After a crew is set: the lead becomes the order's engineer when it has none, engineers not
 * on `previousIds` get job_assigned, and the assignment is audited with the crew's emails.
 */
const afterCrewChange = async (req, job, previousIds, engineers, order) => {
  const target = order ?? (await findCollectionItem("orders", { id: job.orderId }));
  if (engineers.length) await assignOrderEngineerIfUnset(job.orderId, engineers[0].id);
  for (const id of newlyAddedEngineers(previousIds, jobEngineerIds(job))) notify(jobAssignedNotification(job, target, id));
  auditJob(req, "job.assign", job, crewAuditSummary(target, engineers), ["engineerIds", "status"]);
};

// ---- admin jobs ------------------------------------------------------------------------------

export const adminListJobs = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  const [jobs, refs] = await Promise.all([listCollection("installationJobs", { includeInactive: true }), references()]);
  ok(res, "Jobs retrieved.", serializeJobPage(adminJobPage(jobs, req.query, page), refs.orders, refs.admins));
});

export const adminGetJob = asyncHandler(async (req, res) => {
  ok(res, "Job retrieved.", await serialize(await getCollectionItem("installationJobs", req.params.id)));
});

export const adminCreateJob = asyncHandler(async (req, res) => {
  const { engineerIds, ...payload } = jobCreatePayload(req.body, randomUUID);
  const order = await getCollectionItem("orders", payload.orderId);
  const named = engineerIds !== undefined ? await engineersFor(engineerIds) : null;
  assertOrderAcceptsJobs(serializeOrder(order));
  assertOrderHasNoOpenJob(await jobsOf(order.id));
  const engineers = named ?? (await orderCrew(order));
  const job = await createCollectionItem(
    "installationJobs",
    {
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
    },
    // JSON store: re-checked inside the write lock (Mongo passes no items; the pre-check applies).
    { prepare: (items, draft) => assertOrderHasNoOpenJob(items.filter((item) => item.orderId === draft.orderId)) }
  );
  auditJob(req, "job.create", job, `Created job for order from ${order.name || order.id}`, [...Object.keys(payload), "engineerIds"]);
  if (engineers.length) await afterCrewChange(req, job, [], engineers, order);
  created(res, "Job created.", await serialize(job));
});

export const adminUpdateJob = asyncHandler(async (req, res) => {
  const job = await getCollectionItem("installationJobs", req.params.id);
  const patch = jobUpdatePayload(req.body, job, randomUUID);
  const crewChanged = patch.engineerIds !== undefined;
  const engineers = crewChanged ? await engineersFor(patch.engineerIds) : [];
  const changes = { ...jobBackfill(job), ...patch };
  // A crew change moves the status, so it is written only while the status is unchanged.
  const item = crewChanged ? await writeJobPatch(job, changes) : await updateCollectionItem("installationJobs", job.id, changes);
  auditJob(req, "job.update", item, "Updated job", Object.keys(patch));
  if (crewChanged) await afterCrewChange(req, item, jobEngineerIds(job), engineers);
  ok(res, "Job updated.", await serialize(item));
});

export const adminAssignJob = asyncHandler(async (req, res) => {
  const engineerIds = jobAssignPayload(req.body);
  const job = await getCollectionItem("installationJobs", req.params.id);
  const engineers = await engineersFor(engineerIds);
  const item = await writeJobPatch(job, planJobAssignment(job, engineerIds));
  await afterCrewChange(req, item, jobEngineerIds(job), engineers);
  ok(res, engineerIds.length ? "Job assigned." : "Job unassigned.", await serialize(item));
});

export const adminJobStatus = asyncHandler(async (req, res) => {
  const { status, note } = jobStatusPayload(req.body);
  const job = await getCollectionItem("installationJobs", req.params.id);
  const patch = planJobStatus(job, status, { timestamp: now() });
  if (!patch.status) return ok(res, "Job status updated.", await serialize(job));
  const item = await writeJobPatch(job, { ...jobBackfill(job), ...patch });
  auditJob(req, "job.status_change", item, `Job ${job.status} → ${status}${note ? `: ${note.slice(0, 200)}` : ""}`, ["status"]);
  if (status === "completed") await installOrderWhenDone(req, job.orderId);
  ok(res, "Job status updated.", await serialize(item));
});

export const adminDeleteJob = asyncHandler(async (req, res) => {
  const job = await getCollectionItem("installationJobs", req.params.id);
  assertJobDeletable(job);
  await deleteCollectionItem("installationJobs", job.id);
  auditJob(req, "job.delete", job, "Deleted job");
  ok(res, "Job deleted.", await serialize(job));
});

// ---- engineer (me) ------------------------------------------------------------------------------

const meId = (req) => req.admin?.id ?? STATIC_TOKEN_ACTOR;

const myJob = async (req) => ownJob(await findCollectionItem("installationJobs", { id: req.params.id }), meId(req));

export const myListJobs = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  const [jobs, refs] = await Promise.all([listCollection("installationJobs", { includeInactive: true }), references()]);
  ok(res, "Jobs retrieved.", serializeJobPage(myJobPage(jobs, meId(req), req.query, page), refs.orders, refs.admins));
});

export const myGetJob = asyncHandler(async (req, res) => {
  ok(res, "Job retrieved.", await serialize(await myJob(req)));
});

export const myJobStatus = asyncHandler(async (req, res) => {
  const { status } = jobStatusPayload(req.body, { engineer: true });
  const job = await myJob(req);
  const patch = planJobStatus(job, status, { timestamp: now(), engineer: true });
  if (!patch.status) return ok(res, "Job status updated.", await serialize(job));
  const item = await writeJobPatch(job, { ...jobBackfill(job), ...patch });
  auditJob(req, "job.status_change", item, `Job ${job.status} → ${status}`, ["status"]);
  if (status === "completed") await installOrderWhenDone(req, job.orderId);
  ok(res, "Job status updated.", await serialize(item));
});

export const myUpdateJob = asyncHandler(async (req, res) => {
  const job = await myJob(req);
  const patch = engineerJobPayload(req.body, job, { actorId: meId(req), timestamp: now() });
  const item = await updateCollectionItem("installationJobs", job.id, { ...jobBackfill(job), ...patch });
  auditJob(req, "job.update", item, "Updated job", Object.keys(patch));
  ok(res, "Job updated.", await serialize(item));
});

// ---- staff ------------------------------------------------------------------------------------

const staffMember = async (id) => {
  const admin = await findCollectionItem("admins", { id });
  if (!admin) throw notFound("User not found.");
  return admin;
};

export const adminListStaff = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  ok(res, "Staff retrieved.", staffPage(await listCollection("admins", { includeInactive: true }), req.query, page));
});

export const adminGetStaff = asyncHandler(async (req, res) => {
  const admin = await staffMember(req.params.id);
  const jobs = await listCollection("installationJobs", { includeInactive: true });
  ok(res, "Staff member retrieved.", { ...adminUser(admin), openJobs: openJobCount(jobs, admin.id) });
});

export const adminUpdateStaff = asyncHandler(async (req, res) => {
  staffPayload(req.body, {});
  const admin = await staffMember(req.params.id);
  const patch = staffPayload(req.body, admin);
  const item = await updateCollectionItem("admins", admin.id, patch);
  audit(req, {
    action: "user.update",
    entity: "user",
    entityId: admin.id,
    summary: `Updated staff profile of ${admin.email}`,
    changes: Object.keys(patch),
  });
  ok(res, "Staff member updated.", adminUser(item));
});

