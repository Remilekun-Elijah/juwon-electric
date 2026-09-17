// Installation jobs, engineer-scoped endpoints and staff (API_CONTRACT_V3 §7).
// Runtime-agnostic scenario; returns the transcript for the parity test.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

export const runJobsScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const sales = await client.seedAdmin("sales");
  const support = await client.seedAdmin("support");
  const hr = await client.seedAdmin("hr");
  const engineerA = await client.seedAdmin("engineer", { name: "Ada Engineer" });
  const engineerB = await client.seedAdmin("engineer", { name: "Bayo Engineer" });
  await client.seedAdmin("engineer", { name: "Retired Engineer", isActive: false });

  // ---- orders that need installation ------------------------------------------------------------
  await expect("package", "POST", "/admin/packages", {
    body: { legacyId: 9101, type: "tubular", name: "Install Kit", kva: 3, load: "Lights", options: [{ name: "Standard", price: 300000, kits: "1 battery" }] },
    project: (body) => ({ message: body?.message }),
  }, 201);
  const placeOrder = async (label, name) =>
    (
      await expect(label, "POST", "/order", {
        token: null,
        body: { name, phoneNumber: "08011112222", deliveryAddress: `${name} Street, Lekki`, order: [{ id: 9101, quantity: 1, optionName: "Standard" }] },
        project: (body) => ({ message: body?.message }),
      }, 201)
    ).body.data;
  const order = await placeOrder("place order", "Install Customer");
  const order2 = await placeOrder("place second order", "Second Customer");

  // ---- create -----------------------------------------------------------------------------------------
  const jobs = "/admin/jobs";
  await expect("turn installation off", "PUT", `/admin/orders/${order.id}`, { body: { requiresInstallation: false }, project: (body) => ({ message: body?.message }) }, 200);
  await expect("order without installation", "POST", jobs, { body: { orderId: order.id } }, 409, "Order does not require installation.");
  await expect("require installation", "PUT", `/admin/orders/${order.id}`, { body: { requiresInstallation: true }, project: (body) => ({ message: body?.message }) }, 200);
  await expect("require installation on order 2", "PUT", `/admin/orders/${order2.id}`, { body: { requiresInstallation: true }, project: (body) => ({ message: body?.message }) }, 200);
  await expect("missing order", "POST", jobs, { body: {} }, 400, "Order is required.");
  await expect("unknown order", "POST", jobs, { body: { orderId: "missing" } }, 404, "Order not found.");
  await expect("bad scheduled time", "POST", jobs, { body: { orderId: order.id, scheduledAt: "next week" } }, 400, "Scheduled time must be a valid date.");
  await expect("duration too short", "POST", jobs, { body: { orderId: order.id, durationEstimateMinutes: 10 } }, 400);
  await expect("assignee is not an engineer", "POST", jobs, { body: { orderId: order.id, engineerId: sales.id } }, 400, "Assignee must be an active engineer.");
  await expect("support cannot create jobs", "POST", jobs, { token: support.token, body: { orderId: order.id } }, 403, FORBIDDEN);

  const survey = (await expect("unassigned job", "POST", jobs, { token: sales.token, body: { orderId: order.id, checklist: ["Site survey"] } }, 201, "Job created.")).body.data;
  assert.deepEqual(Object.keys(survey).sort(), [
    "address", "cancelledAt", "checklist", "completedAt", "completionNotes", "createdAt", "durationEstimateMinutes", "engineer",
    "engineerId", "engineerIds", "engineers", "id", "notes", "order", "orderId", "photos", "scheduledAt", "startedAt", "status", "updatedAt",
  ]);
  assert.equal(survey.status, "unassigned");
  assert.equal(survey.address, "Install Customer Street, Lekki");
  assert.deepEqual(survey.order, { id: order.id, name: "Install Customer", phoneNumber: "08011112222", deliveryAddress: "Install Customer Street, Lekki" });
  assert.deepEqual(survey.checklist.map(({ label, done, doneAt, doneBy }) => ({ label, done, doneAt, doneBy })), [
    { label: "Site survey", done: false, doneAt: null, doneBy: null },
  ]);
  // One job per order (COMMERCE_V3 §1.2): a cancelled job makes room for a new one.
  await expect("one job per order", "POST", jobs, { body: { orderId: order.id } }, 409, "This order already has an installation job.");
  await expect("cancel the survey job", "POST", `${jobs}/${survey.id}/status`, { body: { status: "cancelled", note: "Not needed" } }, 200, "Job status updated.");

  const install = (
    await expect("assigned job", "POST", jobs, {
      body: {
        orderId: order.id,
        engineerId: engineerA.id,
        scheduledAt: "2026-10-01T09:00:00Z",
        durationEstimateMinutes: 240,
        checklist: ["Mount inverter", "Connect batteries"],
        notes: "Gate code 1234",
      },
    }, 201)
  ).body.data;
  assert.equal(install.status, "assigned");
  assert.equal(install.scheduledAt, "2026-10-01T09:00:00.000Z");
  assert.deepEqual(install.engineer, { id: engineerA.id, name: "Ada Engineer", email: engineerA.email, phone: null });
  const withEngineer = (await expect("order gets the engineer", "GET", `/admin/orders/${order.id}`, { project: (body) => ({ jobs: body.data.jobs.length }) }, 200)).body.data;
  assert.equal(withEngineer.assignedEngineerId, engineerA.id);
  assert.equal(withEngineer.jobs.length, 2);

  // ---- list -------------------------------------------------------------------------------------------
  const listed = (await expect("list jobs", "GET", jobs, { token: support.token }, 200, "Jobs retrieved.")).body.data;
  assert.deepEqual(listed.items.map((job) => job.id), [install.id, survey.id], "scheduled first");
  const assignedOnly = (await expect("filter by status", "GET", `${jobs}?status=assigned`, {}, 200)).body.data;
  assert.deepEqual(assignedOnly.items.map((job) => job.id), [install.id]);
  const byEngineer = (await expect("filter by engineer", "GET", `${jobs}?engineerId=${engineerA.id}`, {}, 200)).body.data;
  assert.equal(byEngineer.total, 1);
  const inRange = (await expect("filter by schedule", "GET", `${jobs}?from=2026-10-01&to=2026-10-02`, {}, 200)).body.data;
  assert.equal(inRange.total, 1);
  await expect("bad status filter", "GET", `${jobs}?status=done`, {}, 400, "Status is not valid.");
  await expect("get job", "GET", `${jobs}/${install.id}`, {}, 200, "Job retrieved.");
  await expect("unknown job", "GET", `${jobs}/missing`, {}, 404, "Job not found.");

  // ---- admin update -------------------------------------------------------------------------------------
  const [mount] = install.checklist;
  const edited = (
    await expect("replace checklist", "PUT", `${jobs}/${install.id}`, {
      body: { checklist: [{ id: mount.id, label: "Mount inverter on the wall" }, "Test battery backup"], durationEstimateMinutes: null },
    }, 200, "Job updated.")
  ).body.data;
  assert.equal(edited.checklist.length, 2);
  assert.equal(edited.checklist[0].id, mount.id);
  assert.equal(edited.checklist[0].label, "Mount inverter on the wall");
  assert.equal(edited.durationEstimateMinutes, null);
  assert.equal(edited.notes, "Gate code 1234");

  // ---- engineer endpoints ---------------------------------------------------------------------------------
  const mine = "/admin/me/jobs";
  const bList = (await expect("other engineer sees nothing", "GET", mine, { token: engineerB.token }, 200)).body.data;
  assert.equal(bList.total, 0);
  await expect("other engineer cannot read the job", "GET", `${mine}/${install.id}`, { token: engineerB.token }, 404, "Job not found.");
  await expect("other engineer cannot update the job", "PUT", `${mine}/${install.id}`, { token: engineerB.token, body: { completionNotes: "x" } }, 404, "Job not found.");
  await expect("sales has no engineer endpoints", "GET", mine, { token: sales.token }, 403, FORBIDDEN);
  await expect("engineers cannot use admin job routes", "GET", jobs, { token: engineerA.token }, 403, FORBIDDEN);

  const aList = (await expect("engineer sees own open jobs", "GET", mine, { token: engineerA.token }, 200)).body.data;
  assert.deepEqual(aList.items.map((job) => job.id), [install.id]);
  const aJob = (await expect("engineer reads own job", "GET", `${mine}/${install.id}`, { token: engineerA.token }, 200)).body.data;
  assert.equal(aJob.notes, "Gate code 1234");

  const status = (token, id, value) => ["POST", `${mine}/${id}/status`, { token, body: { status: value } }];
  await expect("engineer cannot skip in_progress", ...status(engineerA.token, install.id, "completed"), 409, "Cannot change job status from assigned to completed.");
  await expect("engineer cannot cancel", ...status(engineerA.token, install.id, "cancelled"), 400, "Status is not valid.");
  const started = (await expect("engineer starts", ...status(engineerA.token, install.id, "in_progress"), 200, "Job status updated.")).body.data;
  assert.equal(started.status, "in_progress");
  assert.ok(started.startedAt);
  await expect("checklist must be done", ...status(engineerA.token, install.id, "completed"), 409, "Complete the checklist first.");

  await expect("unknown checklist item", "PUT", `${mine}/${install.id}`, { token: engineerA.token, body: { checklist: [{ id: "nope", done: true }] } }, 400, "Checklist item not found.");
  const ticked = (
    await expect("engineer ticks the checklist", "PUT", `${mine}/${install.id}`, {
      token: engineerA.token,
      body: {
        checklist: edited.checklist.map((item) => ({ id: item.id, done: true })),
        photos: ["https://cdn.juwon.test/install-1.jpg"],
        completionNotes: "Installed and tested.",
      },
    }, 200, "Job updated.")
  ).body.data;
  assert.ok(ticked.checklist.every((item) => item.done && item.doneAt && item.doneBy === engineerA.id));
  assert.deepEqual(ticked.photos, ["https://cdn.juwon.test/install-1.jpg"]);

  // ---- completion moves a delivered order to installed ------------------------------------------------------
  const fulfil = (id, value) => ["POST", `/admin/orders/${id}/fulfillment`, { body: { status: value }, project: (body) => ({ message: body?.message, status: body?.data?.fulfillmentStatus }) }];
  await expect("order processing", ...fulfil(order.id, "processing"), 200);
  await expect("order delivered", ...fulfil(order.id, "delivered"), 200);
  await expect("admin cannot move a job to assigned by status", "POST", `${jobs}/${install.id}/status`, { body: { status: "assigned" } }, 409, "Cannot change job status from in_progress to assigned.");
  const completed = (await expect("engineer completes", ...status(engineerA.token, install.id, "completed"), 200)).body.data;
  assert.ok(completed.completedAt);
  const installed = (await expect("order installed automatically", "GET", `/admin/orders/${order.id}`, { project: (body) => ({ status: body.data.fulfillmentStatus }) }, 200)).body.data;
  assert.equal(installed.fulfillmentStatus, "installed");
  const closedList = (await expect("closed jobs hidden by default", "GET", mine, { token: engineerA.token }, 200)).body.data;
  assert.equal(closedList.total, 0);
  const completedList = (await expect("closed jobs by status", "GET", `${mine}?status=completed`, { token: engineerA.token }, 200)).body.data;
  assert.equal(completedList.total, 1);

  await expect("admin cannot edit a closed job", "PUT", `${jobs}/${install.id}`, { body: { notes: "late" } }, 409, "Job is closed.");
  await expect("engineer cannot edit a closed job", "PUT", `${mine}/${install.id}`, { token: engineerA.token, body: { completionNotes: "late" } }, 409, "Job is closed.");
  await expect("closed job cannot be reassigned", "POST", `${jobs}/${install.id}/assign`, { body: { engineerId: engineerB.id } }, 409, "Cannot change job status from completed to assigned.");

  // ---- assignment ---------------------------------------------------------------------------------------------
  const pending = (await expect("job for order 2", "POST", jobs, { body: { orderId: order2.id } }, 201)).body.data;
  await expect("assign an inactive or unknown engineer", "POST", `${jobs}/${pending.id}/assign`, { body: { engineerId: "missing" } }, 400, "Assignee must be an active engineer.");
  const assigned = (await expect("assign", "POST", `${jobs}/${pending.id}/assign`, { token: sales.token, body: { engineerId: engineerB.id } }, 200, "Job assigned.")).body.data;
  assert.equal(assigned.status, "assigned");
  assert.equal(assigned.engineerId, engineerB.id);
  const unassigned = (await expect("unassign", "POST", `${jobs}/${pending.id}/assign`, { body: { engineerId: null } }, 200, "Job unassigned.")).body.data;
  assert.equal(unassigned.status, "unassigned");
  assert.equal(unassigned.engineer, null);

  // ---- orders with open jobs ---------------------------------------------------------------------------------
  await expect("order with open jobs cannot be deleted", "DELETE", `/admin/orders/${order2.id}`, {}, 409, "Order has installation jobs.");
  await expect("installation flag is locked by open jobs", "PUT", `/admin/orders/${order2.id}`, { body: { requiresInstallation: false } }, 409, "Order has installation jobs.");

  // ---- delete ------------------------------------------------------------------------------------------------------
  await expect("started job cannot be deleted", "DELETE", `${jobs}/${install.id}`, {}, 409, "Job cannot be deleted once started.");
  await expect("delete cancelled job", "DELETE", `${jobs}/${survey.id}`, {}, 200, "Job deleted.");
  await expect("delete unassigned job", "DELETE", `${jobs}/${pending.id}`, {}, 200, "Job deleted.");

  // ---- staff -------------------------------------------------------------------------------------------------------
  const engineers = (await expect("engineer picker", "GET", "/admin/staff?role=engineer&isActive=true", { token: sales.token }, 200, "Staff retrieved.")).body.data;
  assert.deepEqual(engineers.items.map((user) => user.name), ["Ada Engineer", "Bayo Engineer"]);
  assert.equal(engineers.items[0].passwordHash, undefined);
  await expect("bad role filter", "GET", "/admin/staff?role=customer", {}, 400, "Role is not valid.");
  await expect("support cannot read staff", "GET", "/admin/staff", { token: support.token }, 403, FORBIDDEN);

  const profile = (
    await expect("hr updates a staff profile", "PUT", `/admin/staff/${engineerA.id}`, {
      token: hr.token,
      body: { phone: "08031234567", profile: { areaCoverage: ["Lekki", "Ikeja"], certifications: ["NABCEP PV Installer"], bio: "Solar installs" }, role: "admin" },
    }, 200, "Staff member updated.")
  ).body.data;
  assert.equal(profile.phone, "08031234567");
  assert.equal(profile.role, "engineer", "roles are not editable here");
  assert.deepEqual(profile.profile, { areaCoverage: ["Lekki", "Ikeja"], certifications: ["NABCEP PV Installer"], bio: "Solar installs", avatarUrl: null });
  const partial = (await expect("partial profile update", "PUT", `/admin/staff/${engineerA.id}`, { token: hr.token, body: { profile: { bio: null } } }, 200)).body.data;
  assert.deepEqual(partial.profile.areaCoverage, ["Lekki", "Ikeja"]);
  assert.equal(partial.profile.bio, null);
  await expect("bad avatar", "PUT", `/admin/staff/${engineerA.id}`, { token: hr.token, body: { profile: { avatarUrl: "ftp://x" } } }, 400);
  await expect("bad phone", "PUT", `/admin/staff/${engineerA.id}`, { token: hr.token, body: { phone: "12" } }, 400, "Enter a valid phone number.");
  await expect("unknown staff member", "PUT", `/admin/staff/missing`, { token: hr.token, body: { phone: null } }, 404, "User not found.");
  await expect("sales cannot write staff", "PUT", `/admin/staff/${engineerA.id}`, { token: sales.token, body: { phone: null } }, 403, FORBIDDEN);

  const byArea = (await expect("staff by area", "GET", "/admin/staff?area=lekki", {}, 200)).body.data;
  assert.deepEqual(byArea.items.map((user) => user.id), [engineerA.id]);
  const member = (await expect("staff member with open jobs", "GET", `/admin/staff/${engineerA.id}`, {}, 200, "Staff member retrieved.")).body.data;
  assert.equal(member.openJobs, 0);
  const job = (await expect("job shows the engineer phone", "GET", `${jobs}/${install.id}`, {}, 200)).body.data;
  assert.equal(job.engineer.phone, "08031234567");

  return transcript;
};
