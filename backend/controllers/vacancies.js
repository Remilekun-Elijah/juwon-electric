// Vacancies (API_CONTRACT_V3 §3). Parity: backend/cloudflare/src/vacancies.js.
import { actingAdmin } from "../middleware/capabilities.js";
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
} from "../shared/vacancies.js";
import { uniqueSlug } from "./_catalog.js";
import { paginate } from "../shared/adminUsers.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit, changedFields } from "../services/audit.js";
import { notifyVacancyPosted as notifyVacancy } from "../services/notifications.js";
import { ApiError, badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import { pageQuery } from "../services/pagination.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { deriveSlug, optionalSlug, optionalString, requiredString } from "../services/validators.js";

const COLLECTION = "vacancies";

const unwrap = (result) => {
  if (result.error) throw badRequest(result.error);
  return result.value;
};

// Nullable single-line text: absent -> undefined, null/blank -> null.
const nullableText = (body, field, label, max) => {
  if (body[field] === undefined) return undefined;
  if (body[field] === null) return null;
  return optionalString(body, field, { label, max }) || null;
};

/** Validated fields from the body, in contract order. `isUpdate` makes every field optional. */
const vacancyFields = (body, { isUpdate }) => {
  const fields = {
    title:
      isUpdate && body.title === undefined
        ? undefined
        : requiredString(body, "title", "Title", { max: VACANCY_LIMITS.title }),
    slug: optionalSlug(body),
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
const findForAdmin = async (key) => {
  try {
    return await getCollectionItem(COLLECTION, key);
  } catch (error) {
    if (error?.statusCode === 404) throw notFound();
    throw error;
  }
};

const withUniqueSlug = (draftSlug, selfId) => (items) => uniqueSlug(items, draftSlug, selfId);

// Mongo: a concurrent writer can take the slug between the check and the write
// (unique index). Retry once with a fresh check.
const retryOnDuplicate = async (task) => {
  try {
    return await task();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return task();
  }
};

const auditVacancy = (req, action, vacancy, summary, changes = []) =>
  audit(req, { action, entity: "vacancy", entityId: vacancy.id, summary, changes });

// vacancy_posted notification and vacancyEmails email (API_CONTRACT_V3 §8.2).
const notifyVacancyPosted = (vacancy) => notifyVacancy(vacancy);

// ---- public -------------------------------------------------------------------

// GET /vacancies?department&employmentType
export const listVacancies = asyncHandler(async (req, res) => {
  const { filters, error } = parsePublicFilters(req.query.department, req.query.employmentType);
  if (error) throw badRequest(error);
  const records = await listCollection(COLLECTION, { includeInactive: true });
  ok(res, VACANCY_MESSAGES.list, publicVacancies(records, filters));
});

// GET /vacancies/:slug (slug, then id; open only)
export const getVacancy = asyncHandler(async (req, res) => {
  const key = String(req.params.slug);
  const vacancy =
    (await findCollectionItem(COLLECTION, { slug: key })) || (await findCollectionItem(COLLECTION, { id: key }));
  if (!vacancy || vacancy.status !== "open") throw notFound();
  ok(res, VACANCY_MESSAGES.get, publicVacancyView(vacancy));
});

// ---- admin --------------------------------------------------------------------

// GET /admin/vacancies?status&q&page&limit (paged, every status)
export const adminListVacancies = asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req.query);
  const { filters, error } = parseAdminFilters(req.query.status, req.query.q);
  if (error) throw badRequest(error);
  const records = await listCollection(COLLECTION, { includeInactive: true });
  const { items, total } = paginate(adminVacancies(records, filters), page, limit);
  ok(res, VACANCY_MESSAGES.list, { items: items.map(vacancyView), page, limit, total });
});

// GET /admin/vacancies/:id
export const adminGetVacancy = asyncHandler(async (req, res) => {
  ok(res, VACANCY_MESSAGES.get, vacancyView(await findForAdmin(req.params.id)));
});

// POST /admin/vacancies
export const adminCreateVacancy = asyncHandler(async (req, res) => {
  const { fields, status = "draft" } = vacancyFields(req.body || {}, { isUpdate: false });
  const timestamp = new Date().toISOString();
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
    createdBy: createdByOf(actingAdmin(req)),
  };
  const slug = fields.slug || deriveSlug(fields.title);

  const vacancy = await retryOnDuplicate(() =>
    createCollectionItem(COLLECTION, record, {
      prepare: (items, draft) => ({ ...draft, slug: withUniqueSlug(slug)(items) }),
    })
  );

  auditVacancy(req, "vacancy.create", vacancy, `Created vacancy "${vacancy.title}"`, [
    ...Object.keys(fields).filter((key) => fields[key] !== undefined),
    "status",
  ]);
  if (status === "open") notifyVacancyPosted(vacancy);
  created(res, VACANCY_MESSAGES.create, vacancyView(vacancy));
});

// PUT /admin/vacancies/:id (partial; status follows the transitions)
export const adminUpdateVacancy = asyncHandler(async (req, res) => {
  const { fields, status } = vacancyFields(req.body || {}, { isUpdate: true });
  const existing = await findForAdmin(req.params.id);

  let patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  let firstPublish = false;
  if (status !== undefined) {
    const change = statusChange(existing, status, new Date().toISOString());
    if (change.error) throw new ApiError(409, change.error);
    if (change.patch) patch = { ...patch, ...change.patch };
    firstPublish = change.firstPublish;
  }

  const keys = Object.keys(patch);
  const changes = changedFields(existing, patch, keys);
  if (changes.length === 0) {
    ok(res, VACANCY_MESSAGES.update, vacancyView(existing));
    return;
  }

  const vacancy = await retryOnDuplicate(() =>
    updateCollectionItem(COLLECTION, existing.id, patch, {
      prepare: (items, fresh, draft) =>
        draft.slug && draft.slug !== fresh.slug ? { ...draft, slug: withUniqueSlug(draft.slug, fresh.id)(items) } : draft,
    })
  );

  const previousStatus = vacancyView(existing).status;
  const action = changes.includes("status") ? statusAction(previousStatus, vacancy.status) : "vacancy.update";
  auditVacancy(req, action, vacancy, `Updated vacancy "${vacancy.title}"`, changes);
  if (firstPublish) notifyVacancyPosted(vacancy);
  ok(res, VACANCY_MESSAGES.update, vacancyView(vacancy));
});

const moveTo = (next, message) =>
  asyncHandler(async (req, res) => {
    const existing = await findForAdmin(req.params.id);
    const change = statusChange(existing, next, new Date().toISOString());
    if (change.error) throw new ApiError(409, change.error);
    if (!change.patch) {
      ok(res, message, vacancyView(existing));
      return;
    }
    const vacancy = await updateCollectionItem(COLLECTION, existing.id, change.patch);
    auditVacancy(
      req,
      statusAction(vacancyView(existing).status, next),
      vacancy,
      `${next === "open" ? "Published" : "Unpublished"} vacancy "${vacancy.title}"`,
      Object.keys(change.patch)
    );
    if (change.firstPublish) notifyVacancyPosted(vacancy);
    ok(res, message, vacancyView(vacancy));
  });

// POST /admin/vacancies/:id/publish and /unpublish
export const adminPublishVacancy = moveTo("open", VACANCY_MESSAGES.publish);
export const adminUnpublishVacancy = moveTo("draft", VACANCY_MESSAGES.unpublish);

// DELETE /admin/vacancies/:id (hard delete: the slug is freed)
export const adminDeleteVacancy = asyncHandler(async (req, res) => {
  const existing = await findForAdmin(req.params.id);
  const vacancy = await deleteCollectionItem(COLLECTION, existing.id);
  auditVacancy(req, "vacancy.delete", vacancy, `Deleted vacancy "${vacancy.title}"`);
  ok(res, VACANCY_MESSAGES.delete, vacancyView(vacancy));
});
