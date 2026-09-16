// Vacancies (API_CONTRACT_V3 §3). Runtime-agnostic; returns a transcript for parity.
import assert from "node:assert/strict";
import { OWNER, STATIC_TOKEN } from "./adminUsers.js";

const FORBIDDEN = "You do not have permission to perform this action.";

// Distinct updatedAt values keep list order deterministic across runtimes.
const pause = () => new Promise((resolve) => setTimeout(resolve, 5));

export const runVacanciesScenario = async (request) => {
  const transcript = [];
  const call = async (label, method, path, options = {}) => {
    const { statusOnly, ...rest } = options;
    const response = await request(method, path, rest);
    transcript.push({ label, status: response.status, body: statusOnly ? { message: response.body?.message } : response.body });
    return response;
  };
  const expect = async (label, method, path, options, status, message) => {
    const response = await call(label, method, path, options);
    assert.equal(response.status, status, `${label}: ${JSON.stringify(response.body)}`);
    if (message) assert.equal(response.body.message, message, label);
    return response;
  };

  const owner = (
    await expect("owner login", "POST", "/admin/auth/login", { body: { username: OWNER.email, password: OWNER.password }, statusOnly: true }, 200)
  ).body.data;
  const token = owner.token;

  // ---- removed legacy routes and auth ------------------------------------------------
  await expect("legacy POST /vacancies", "POST", "/vacancies", {
    body: { title: "Hack" },
    headers: { "X-User-Role": "admin" },
  }, 404, "Route not found.");
  await expect("legacy PUT /vacancies/:id", "PUT", "/vacancies/x", { body: {}, headers: { "X-User-Role": "admin" } }, 404);
  await expect("legacy DELETE /vacancies/:id", "DELETE", "/vacancies/x", { headers: { "X-User-Role": "admin" } }, 404);
  await expect("admin no token", "GET", "/admin/vacancies", {}, 401);
  await expect("header role ignored", "POST", "/admin/vacancies", {
    body: { title: "Hack" },
    headers: { "X-User-Role": "admin", "X-User-Id": "evil" },
  }, 401);

  // ---- create ------------------------------------------------------------------------
  const draft = (
    await expect("create draft", "POST", "/admin/vacancies", {
      token,
      body: {
        title: "  Solar Installation Engineer ",
        department: "Engineering",
        location: "Lagos",
        employmentType: "full-time",
        salaryRange: "NGN 300k - 450k",
        descriptionHtml: "<p onclick=\"x()\">Install <strong>systems</strong></p><script>alert(1)</script><a href=\"javascript:alert(1)\">x</a>",
        requirements: ["3 years experience", "  ", "COREN registration"],
        responsibilities: ["Site surveys"],
        // Mass assignment attempts are ignored:
        id: "chosen-id",
        postedAt: "2020-01-01T00:00:00.000Z",
        closedAt: "2020-01-01T00:00:00.000Z",
        createdBy: { id: "evil", email: "evil@x.test" },
        isActive: false,
        _id: "x",
      },
    }, 201, "Vacancy created.")
  ).body.data;
  assert.equal(draft.status, "draft");
  assert.equal(draft.title, "Solar Installation Engineer");
  assert.equal(draft.slug, "solar-installation-engineer");
  assert.notEqual(draft.id, "chosen-id");
  assert.equal(draft.postedAt, null);
  assert.equal(draft.closedAt, null);
  assert.deepEqual(draft.createdBy, { id: owner.admin.id, email: OWNER.email });
  assert.equal(
    draft.descriptionHtml,
    '<p>Install <strong>systems</strong></p><a rel="noopener noreferrer nofollow" target="_blank">x</a>'
  );
  assert.deepEqual(draft.requirements, ["3 years experience", "COREN registration"]);
  assert.deepEqual(Object.keys(draft).sort(), [
    "closedAt", "createdAt", "createdBy", "department", "descriptionHtml", "employmentType", "id", "location",
    "postedAt", "requirements", "responsibilities", "salaryRange", "slug", "status", "title", "updatedAt",
  ]);

  const same = (
    await expect("slug collision gets -2", "POST", "/admin/vacancies", {
      token,
      body: { title: "Solar Installation Engineer", status: "open" },
    }, 201)
  ).body.data;
  assert.equal(same.slug, "solar-installation-engineer-2");
  assert.equal(same.status, "open");
  assert.ok(same.postedAt);
  assert.equal(same.department, null);
  assert.equal(same.descriptionHtml, "");
  assert.deepEqual(same.requirements, []);
  await pause();

  const staticCreated = (
    await expect("static token create", "POST", "/admin/vacancies", {
      token: STATIC_TOKEN,
      body: { title: "Sales Rep", slug: "Sales Rep Lagos", employmentType: "contract", department: "Sales" },
    }, 201)
  ).body.data;
  assert.equal(staticCreated.slug, "sales-rep-lagos");
  assert.deepEqual(staticCreated.createdBy, { id: "static-token", email: "static-token" });
  await pause();

  // ---- validation ------------------------------------------------------------------------
  const invalid = [
    ["missing title", { department: "x" }, "Title is required."],
    ["long title", { title: "x".repeat(151) }, "Title must be 150 characters or fewer."],
    ["bad employment type", { title: "T", employmentType: "gig" }, "Employment type is not valid."],
    ["bad status", { title: "T", status: "archived" }, "Status is not valid."],
    ["uuid slug", { title: "T", slug: "123e4567-e89b-12d3-a456-426614174000" }, "Slug must not look like an id."],
    ["long department", { title: "T", department: "d".repeat(101) }, "Department must be 100 characters or fewer."],
    ["requirements not a list", { title: "T", requirements: "one" }, "Requirements must be a list."],
    ["requirement not text", { title: "T", requirements: [1] }, "Each requirement must be text."],
    ["requirement too long", { title: "T", requirements: ["r".repeat(301)] }, "Each requirement must be 300 characters or fewer."],
    ["too many responsibilities", { title: "T", responsibilities: Array.from({ length: 31 }, (_, i) => `r${i}`) }, "Responsibilities can have at most 30 items."],
    ["description not text", { title: "T", descriptionHtml: 5 }, "Description must be text."],
    ["description too long", { title: "T", descriptionHtml: `<p>${"a".repeat(50001)}</p>` }, "Description must be 50000 characters or fewer."],
  ];
  for (const [label, body, message] of invalid) {
    await expect(label, "POST", "/admin/vacancies", { token, body }, 400, message);
  }

  // ---- public ----------------------------------------------------------------------------
  const publicList = await expect("public list", "GET", "/vacancies", {}, 200, "Vacancies retrieved.");
  assert.deepEqual(publicList.body.data.map((item) => item.slug), ["solar-installation-engineer-2"]);
  assert.equal(publicList.body.data[0].createdBy, undefined);
  assert.equal(publicList.body.data[0].closedAt, undefined);
  await expect("public list /api alias", "GET", "/api/vacancies", {}, 200);
  await expect("public draft slug hidden", "GET", "/vacancies/solar-installation-engineer", {}, 404, "Vacancy not found.");
  await expect("public draft id hidden", "GET", `/vacancies/${draft.id}`, {}, 404, "Vacancy not found.");
  await expect("public open slug", "GET", "/vacancies/solar-installation-engineer-2", {}, 200, "Vacancy retrieved.");
  await expect("public open by id", "GET", `/api/vacancies/${same.id}`, {}, 200);
  await expect("public bad employmentType", "GET", "/vacancies?employmentType=gig", {}, 400, "Employment type is not valid.");

  // ---- transitions ---------------------------------------------------------------------------
  await expect("draft -> closed rejected", "PUT", `/admin/vacancies/${draft.id}`, { token, body: { status: "closed" } }, 409, "Cannot change vacancy status from draft to closed.");
  const published = await expect("publish", "POST", `/admin/vacancies/${draft.id}/publish`, { token, body: {} }, 200, "Vacancy published.");
  const postedAt = published.body.data.postedAt;
  assert.ok(postedAt);
  await expect("publish again is a no-op", "POST", `/admin/vacancies/${draft.slug}/publish`, { token }, 200, "Vacancy published.");
  const closed = await expect("close", "PUT", `/admin/vacancies/${draft.id}`, { token, body: { status: "closed" } }, 200, "Vacancy updated.");
  assert.equal(closed.body.data.status, "closed");
  assert.ok(closed.body.data.closedAt);
  await expect("closed hidden publicly", "GET", `/vacancies/${draft.slug}`, {}, 404);
  const reopened = await expect("reopen", "PUT", `/admin/vacancies/${draft.id}`, { token, body: { status: "open" } }, 200);
  assert.equal(reopened.body.data.closedAt, null);
  assert.equal(reopened.body.data.postedAt, postedAt, "postedAt is never reset");
  const unpublished = await expect("unpublish", "POST", `/admin/vacancies/${draft.id}/unpublish`, { token }, 200, "Vacancy unpublished.");
  assert.equal(unpublished.body.data.status, "draft");
  assert.equal(unpublished.body.data.postedAt, postedAt);
  await expect("unpublish again", "POST", `/admin/vacancies/${draft.id}/unpublish`, { token }, 200, "Vacancy unpublished.");

  // ---- update --------------------------------------------------------------------------------
  const updated = await expect("partial update", "PUT", `/admin/vacancies/${draft.id}`, {
    token,
    body: { location: null, requirements: ["Driving licence"], slug: "sales-rep-lagos", createdBy: { id: "evil" }, postedAt: null },
  }, 200, "Vacancy updated.");
  assert.equal(updated.body.data.location, null);
  assert.equal(updated.body.data.department, "Engineering");
  assert.deepEqual(updated.body.data.requirements, ["Driving licence"]);
  assert.equal(updated.body.data.slug, "sales-rep-lagos-2");
  assert.equal(updated.body.data.postedAt, postedAt);
  assert.equal(updated.body.data.createdBy.id, owner.admin.id);
  await expect("update blank title", "PUT", `/admin/vacancies/${draft.id}`, { token, body: { title: " " } }, 400, "Title is required.");
  await expect("update unknown", "PUT", "/admin/vacancies/nope", { token, body: {} }, 404, "Vacancy not found.");

  // ---- admin list ------------------------------------------------------------------------------
  const all = await expect("admin list", "GET", "/admin/vacancies", { token }, 200, "Vacancies retrieved.");
  assert.equal(all.body.data.total, 3);
  assert.deepEqual(all.body.data.items.map((item) => item.id), [draft.id, staticCreated.id, same.id]);
  const drafts = await expect("admin list drafts", "GET", "/admin/vacancies?status=draft", { token }, 200);
  assert.deepEqual(drafts.body.data.items.map((item) => item.id).sort(), [draft.id, staticCreated.id].sort());
  const searched = await expect("admin search", "GET", "/admin/vacancies?q=SALES&limit=1&page=1", { token }, 200);
  assert.deepEqual({ total: searched.body.data.total, count: searched.body.data.items.length }, { total: 1, count: 1 });
  await expect("admin bad status filter", "GET", "/admin/vacancies?status=gone", { token }, 400, "Status is not valid.");
  await expect("admin repeated status", "GET", "/admin/vacancies?status=draft&status=open", { token }, 400, "Status is not valid.");
  await expect("admin repeated q", "GET", "/admin/vacancies?q=a&q=b", { token }, 400, "q must be text.");
  await expect("admin repeated page", "GET", "/admin/vacancies?page=1&page=1", { token }, 400, "page must be a whole number from 1 to 100000.");
  await expect("public repeated department", "GET", "/vacancies?department=a&department=b", {}, 400, "department must be text.");
  await expect("public repeated employmentType", "GET", "/vacancies?employmentType=contract&employmentType=contract", {}, 400, "Employment type is not valid.");
  await expect("admin get by slug", "GET", `/admin/vacancies/${same.slug}`, { token }, 200, "Vacancy retrieved.");

  // ---- delete frees the slug ---------------------------------------------------------------------
  const removed = await expect("delete", "DELETE", `/admin/vacancies/${same.id}`, { token }, 200, "Vacancy deleted.");
  assert.equal(removed.body.data.id, same.id);
  await expect("deleted is gone", "GET", `/admin/vacancies/${same.id}`, { token }, 404, "Vacancy not found.");
  const recreated = await expect("recreate same slug", "POST", "/admin/vacancies", {
    token,
    body: { title: "Other", slug: "solar-installation-engineer-2" },
  }, 201);
  assert.equal(recreated.body.data.slug, "solar-installation-engineer-2");

  // ---- capability gating ------------------------------------------------------------------------
  const hr = (
    await expect("create hr", "POST", "/admin/users", { token, body: { name: "Hana HR", email: "hr@juwon.test", role: "hr" }, statusOnly: true }, 201)
  ).body.data;
  const sales = (
    await expect("create sales", "POST", "/admin/users", { token, body: { name: "Sam Sales", email: "sales2@juwon.test", role: "sales" }, statusOnly: true }, 201)
  ).body.data;
  const signIn = async (email) => {
    const reset = await expect(`${email} reset request`, "POST", "/admin/auth/request-password-reset", { body: { username: email }, statusOnly: true }, 200);
    await expect(`${email} reset`, "POST", "/admin/auth/reset-password", {
      body: { username: email, token: reset.body.data.resetToken, password: "Another-Strong-Passw0rd" },
      statusOnly: true,
    }, 200);
    return (await expect(`${email} login`, "POST", "/admin/auth/login", { body: { username: email, password: "Another-Strong-Passw0rd" }, statusOnly: true }, 200)).body.data.token;
  };
  const hrToken = await signIn(hr.email);
  const salesToken = await signIn(sales.email);
  await expect("hr lists", "GET", "/admin/vacancies", { token: hrToken, statusOnly: true }, 200);
  await expect("hr creates", "POST", "/admin/vacancies", { token: hrToken, body: { title: "HR made" }, statusOnly: true }, 201);
  await expect("sales cannot read", "GET", "/admin/vacancies", { token: salesToken }, 403, FORBIDDEN);
  await expect("sales cannot write", "POST", "/admin/vacancies", { token: salesToken, body: {} }, 403, FORBIDDEN);
  await expect("sales cannot delete", "DELETE", `/admin/vacancies/${draft.id}`, { token: salesToken }, 403, FORBIDDEN);

  // ---- audit ----------------------------------------------------------------------------------------
  const logs = await expect("audit", "GET", "/admin/audit-logs?entity=vacancy&limit=100", { token, statusOnly: true }, 200);
  const actions = [...new Set(logs.body.data.items.map((item) => item.action))].sort();
  assert.deepEqual(actions, ["vacancy.close", "vacancy.create", "vacancy.delete", "vacancy.publish", "vacancy.unpublish", "vacancy.update"]);
  transcript.push({ label: "audit actions", status: 200, body: actions });

  return transcript;
};
