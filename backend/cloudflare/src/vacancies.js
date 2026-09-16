// Vacancies (API_CONTRACT_V3 §3), stored in records (collection 'vacancies',
// migrations/0008_vacancies.sql). Parity: backend/controllers/vacancies.js.
import { paginate } from "../../shared/adminUsers.js";
import {
  VACANCY_LIMITS,
  VACANCY_MESSAGES,
  adminVacancies,
  createdByOf,
  parseAdminFilters,
  parseDescription,
  parseEmploymentType,
  parsePublicFilters,
  parseStatus,
  parseTextList,
  publicVacancies,
  publicVacancyView,
  statusAction,
  statusChange,
  vacancyView,
} from "../../shared/vacancies.js";
import { changedFields, recordAudit } from "./audit.js";
import { requireCapability } from "./capabilities.js";
import { ApiError, badRequest, created, ok } from "./http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  getById,
  listCollection,
  normalizeSlug,
  now,
  resolveSlug,
  updateCollectionItem,
} from "./store.js";
import { pageQuery, queryValue } from "./query.js";
import { stringField } from "./validation.js";

const COLLECTION = "vacancies";
const ADMIN_ID = /^\/admin\/vacancies\/([^/]+)$/;
const ADMIN_ACTION = /^\/admin\/vacancies\/([^/]+)\/(publish|unpublish)$/;
const PUBLIC_SLUG = /^\/vacancies\/([^/]+)$/;

const unwrap = (result) => {
  if (result.error) badRequest(result.error);
  return result.value;
};

// Nullable single-line text: absent -> undefined, null/blank -> null.
const nullableText = (body, field, label, max) => {
  if (body[field] === undefined) return undefined;
  if (body[field] === null) return null;
  return stringField(body, field, { label, max }) || null;
};

/** Validated fields from the body, in contract order. `isUpdate` makes every field optional. */
const vacancyFields = (body, { isUpdate }) => {
  const title =
    isUpdate && body.title === undefined
      ? undefined
      : stringField(body, "title", { label: "Title", required: true, max: VACANCY_LIMITS.title });
  const slugInput = stringField(body, "slug", { label: "Slug", max: VACANCY_LIMITS.slug });
  const fields = {
    title,
    slug: normalizeSlug(slugInput) ? slugInput : undefined,
    department: nullableText(body, "department", "Department", VACANCY_LIMITS.department),
    location: nullableText(body, "location", "Location", VACANCY_LIMITS.location),
    employmentType: unwrap(parseEmploymentType(body)),
    salaryRange: nullableText(body, "salaryRange", "Salary range", VACANCY_LIMITS.salaryRange),
    descriptionHtml: unwrap(parseDescription(body)),
    requirements: unwrap(parseTextList(body, "requirements")),
    responsibilities: unwrap(parseTextList(body, "responsibilities")),
  };
  const status = unwrap(parseStatus(body.status));
  return { fields, status };
};

const notFound = () => new ApiError(404, VACANCY_MESSAGES.notFound);

// Admin :id resolves by id, then slug.
const findForAdmin = async (env, key) => {
  const vacancy = await findCollectionItem(env, COLLECTION, key);
  if (!vacancy) throw notFound();
  return vacancy;
};

const isUniqueViolation = (error) => /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(error?.message));

// idx_records_vacancies_slug: a concurrent writer can take the slug between the
// check and the write. Retry once with a fresh check.
const retryOnDuplicate = async (task) => {
  try {
    return await task();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return task();
  }
};

const notifyVacancyPosted = (_vacancy) => {
  // TODO(integration): notify vacancy_posted
};

/** GET /vacancies and /vacancies/:slug. Returns null for other paths. */
export const handlePublicVacancies = async (request, env, path, url) => {
  if (request.method !== "GET") return null;

  if (path === "/vacancies") {
    const { filters, error } = parsePublicFilters(
      queryValue(url.searchParams, "department"),
      queryValue(url.searchParams, "employmentType")
    );
    if (error) badRequest(error);
    const records = await listCollection(env, COLLECTION, { includeInactive: true });
    return ok(VACANCY_MESSAGES.list, publicVacancies(records, filters));
  }

  const match = PUBLIC_SLUG.exec(path);
  if (!match) return null;
  const key = match[1];
  const bySlug = await env.DB.prepare(
    "SELECT data FROM records WHERE collection = ? AND slug = ? ORDER BY created_at ASC LIMIT 1"
  )
    .bind(COLLECTION, key)
    .first();
  const vacancy = bySlug ? JSON.parse(bySlug.data) : await getById(env, COLLECTION, key);
  if (!vacancy || vacancy.status !== "open") throw notFound();
  return ok(VACANCY_MESSAGES.get, publicVacancyView(vacancy));
};

/** /admin/vacancies*. Returns null for other paths. */
export const handleAdminVacancies = async (request, env, ctx, path, body, admin, url) => {
  if (path !== "/admin/vacancies" && !path.startsWith("/admin/vacancies/")) return null;
  const { method } = request;
  const audit = (action, vacancy, summary, changes = []) =>
    recordAudit(env, ctx, request, admin, { action, entity: "vacancy", entityId: vacancy.id, summary, changes });

  if (method === "GET" && path === "/admin/vacancies") {
    requireCapability(admin, "vacancies:read");
    const { page, limit } = pageQuery(url.searchParams);
    const { filters, error } = parseAdminFilters(queryValue(url.searchParams, "status"), queryValue(url.searchParams, "q"));
    if (error) badRequest(error);
    const records = await listCollection(env, COLLECTION, { includeInactive: true });
    const { items, total } = paginate(adminVacancies(records, filters), page, limit);
    return ok(VACANCY_MESSAGES.list, { items: items.map(vacancyView), page, limit, total });
  }

  if (method === "POST" && path === "/admin/vacancies") {
    requireCapability(admin, "vacancies:write");
    const { fields, status = "draft" } = vacancyFields(body, { isUpdate: false });
    const timestamp = now();
    const record = {
      title: fields.title,
      department: fields.department ?? null,
      location: fields.location ?? null,
      employmentType: fields.employmentType ?? null,
      salaryRange: fields.salaryRange ?? null,
      descriptionHtml: fields.descriptionHtml ?? "",
      requirements: fields.requirements ?? [],
      responsibilities: fields.responsibilities ?? [],
      status,
      postedAt: status === "open" ? timestamp : null,
      closedAt: status === "closed" ? timestamp : null,
      createdBy: createdByOf(admin),
    };
    const vacancy = await retryOnDuplicate(() =>
      createCollectionItem(env, COLLECTION, { ...record, slug: fields.slug }, { slugFallback: fields.title })
    );
    audit("vacancy.create", vacancy, `Created vacancy "${vacancy.title}"`, [
      ...Object.keys(fields).filter((key) => fields[key] !== undefined),
      "status",
    ]);
    if (status === "open") notifyVacancyPosted(vacancy);
    return created(VACANCY_MESSAGES.create, vacancyView(vacancy));
  }

  const idMatch = ADMIN_ID.exec(path);
  if (idMatch && method === "GET") {
    requireCapability(admin, "vacancies:read");
    return ok(VACANCY_MESSAGES.get, vacancyView(await findForAdmin(env, idMatch[1])));
  }

  if (idMatch && method === "PUT") {
    requireCapability(admin, "vacancies:write");
    const { fields, status } = vacancyFields(body, { isUpdate: true });
    const existing = await findForAdmin(env, idMatch[1]);

    let patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    let firstPublish = false;
    if (status !== undefined) {
      const change = statusChange(existing, status, now());
      if (change.error) throw new ApiError(409, change.error);
      if (change.patch) patch = { ...patch, ...change.patch };
      firstPublish = change.firstPublish;
    }
    // A sent slug is normalised and made unique; compare the final value.
    const write = async () => {
      const draft = { ...patch };
      if (draft.slug !== undefined) {
        draft.slug = await resolveSlug(env, COLLECTION, { input: draft.slug, fallback: "", excludeId: existing.id });
      }
      return draft;
    };
    const firstDraft = await write();
    const changes = changedFields(existing, firstDraft);
    if (changes.length === 0) return ok(VACANCY_MESSAGES.update, vacancyView(existing));

    const vacancy = await retryOnDuplicate(async () =>
      updateCollectionItem(env, COLLECTION, existing.id, await write())
    );
    const action = changes.includes("status")
      ? statusAction(vacancyView(existing).status, vacancy.status)
      : "vacancy.update";
    audit(action, vacancy, `Updated vacancy "${vacancy.title}"`, changes);
    if (firstPublish) notifyVacancyPosted(vacancy);
    return ok(VACANCY_MESSAGES.update, vacancyView(vacancy));
  }

  if (idMatch && method === "DELETE") {
    requireCapability(admin, "vacancies:write");
    const existing = await findForAdmin(env, idMatch[1]);
    await deleteCollectionItem(env, COLLECTION, existing);
    audit("vacancy.delete", existing, `Deleted vacancy "${existing.title}"`);
    return ok(VACANCY_MESSAGES.delete, vacancyView(existing));
  }

  const actionMatch = ADMIN_ACTION.exec(path);
  if (actionMatch && method === "POST") {
    requireCapability(admin, "vacancies:write");
    const next = actionMatch[2] === "publish" ? "open" : "draft";
    const message = next === "open" ? VACANCY_MESSAGES.publish : VACANCY_MESSAGES.unpublish;
    const existing = await findForAdmin(env, actionMatch[1]);
    const change = statusChange(existing, next, now());
    if (change.error) throw new ApiError(409, change.error);
    if (!change.patch) return ok(message, vacancyView(existing));
    const vacancy = await updateCollectionItem(env, COLLECTION, existing.id, change.patch);
    audit(
      statusAction(vacancyView(existing).status, next),
      vacancy,
      `${next === "open" ? "Published" : "Unpublished"} vacancy "${vacancy.title}"`,
      Object.keys(change.patch)
    );
    if (change.firstPublish) notifyVacancyPosted(vacancy);
    return ok(message, vacancyView(vacancy));
  }

  return null;
};

