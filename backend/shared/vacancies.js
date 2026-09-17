// Vacancy rules shared by Express and the Worker (API_CONTRACT_V3 §3).
// Pure ESM. Each runtime validates plain text fields with its own validators and
// throws its own error type; everything that decides behaviour or shape lives here.
import { RICH_TEXT_MAX_LENGTH, RICH_TEXT_TOO_LONG_MESSAGE, sanitizeRichText } from "./richText.js";

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship", "temporary"];
export const VACANCY_STATUSES = ["draft", "open", "closed"];

export const VACANCY_LIMITS = {
  title: 150,
  slug: 120,
  department: 100,
  location: 100,
  salaryRange: 100,
  listItems: 30,
  listItem: 300,
  q: 100,
};

export const VACANCY_MESSAGES = {
  list: "Vacancies retrieved.",
  get: "Vacancy retrieved.",
  create: "Vacancy created.",
  update: "Vacancy updated.",
  publish: "Vacancy published.",
  unpublish: "Vacancy unpublished.",
  delete: "Vacancy deleted.",
  notFound: "Vacancy not found.",
  employmentTypeInvalid: "Employment type is not valid.",
  statusInvalid: "Status is not valid.",
  descriptionText: "Description must be text.",
  descriptionTooLong: RICH_TEXT_TOO_LONG_MESSAGE,
  qTooLong: "q must be 100 characters or fewer.",
  departmentTooLong: "department must be 100 characters or fewer.",
  departmentText: "department must be text.",
  qText: "q must be text.",
};

// Allowed status changes (a same-status change is a no-op and never reaches this table).
const TRANSITIONS = {
  draft: ["open"],
  open: ["draft", "closed"],
  closed: ["open", "draft"],
};

export const transitionError = (from, to) => `Cannot change vacancy status from ${from} to ${to}.`;

/** Audit action for a status change. */
export const statusAction = (from, to) => {
  if (to === "open") return "vacancy.publish";
  if (to === "draft") return "vacancy.unpublish";
  return "vacancy.close";
};

/**
 * The patch for moving `vacancy` to `next` at time `nowIso`:
 * - { patch: null } when the status is unchanged (no-op),
 * - { error } (409 message) when the transition is not allowed,
 * - { patch, firstPublish } otherwise. Publishing sets postedAt only when it is null,
 *   closing sets closedAt, and leaving `closed` clears closedAt.
 */
export const statusChange = (vacancy, next, nowIso) => {
  const current = VACANCY_STATUSES.includes(vacancy.status) ? vacancy.status : "draft";
  if (current === next) return { patch: null, firstPublish: false };
  if (!TRANSITIONS[current].includes(next)) return { error: transitionError(current, next) };
  const patch = { status: next };
  let firstPublish = false;
  if (next === "open" && !vacancy.postedAt) {
    patch.postedAt = nowIso;
    firstPublish = true;
  }
  if (next === "closed") patch.closedAt = nowIso;
  if (current === "closed" && next !== "closed") patch.closedAt = null;
  return { patch, firstPublish };
};

// ---- field validation that must behave identically in both runtimes ---------

const SINGLE_LINE_INVALID = /(?![\u200c\u200d])[\p{Cc}\p{Cf}]/u;

const LIST_LABELS = {
  requirements: { plural: "Requirements", singular: "requirement" },
  responsibilities: { plural: "Responsibilities", singular: "responsibility" },
};

/**
 * requirements / responsibilities: an array of single-line strings, 1-300 characters
 * each (trimmed; blank items dropped), at most 30 items. Absent -> undefined,
 * null -> []. Returns { value } or { error }.
 */
export const parseTextList = (body, field) => {
  const raw = body?.[field];
  const { plural, singular } = LIST_LABELS[field];
  if (raw === undefined) return { value: undefined };
  if (raw === null) return { value: [] };
  if (!Array.isArray(raw)) return { error: `${plural} must be a list.` };
  const items = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return { error: `Each ${singular} must be text.` };
    const text = entry.trim();
    if (!text) continue;
    if (text.length > VACANCY_LIMITS.listItem) {
      return { error: `Each ${singular} must be ${VACANCY_LIMITS.listItem} characters or fewer.` };
    }
    if (SINGLE_LINE_INVALID.test(text)) return { error: `${plural} contain invalid characters.` };
    items.push(text);
  }
  if (items.length > VACANCY_LIMITS.listItems) {
    return { error: `${plural} can have at most ${VACANCY_LIMITS.listItems} items.` };
  }
  return { value: items };
};

/** employmentType: absent -> undefined, null/"" -> null, otherwise a valid type or { error }. */
export const parseEmploymentType = (body) => {
  const raw = body?.employmentType;
  if (raw === undefined) return { value: undefined };
  if (raw === null || raw === "") return { value: null };
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
  return EMPLOYMENT_TYPES.includes(value) ? { value } : { error: VACANCY_MESSAGES.employmentTypeInvalid };
};

/** status (create/update): absent -> undefined, otherwise a valid status or { error }. */
export const parseStatus = (value) => {
  if (value === undefined) return { value: undefined };
  return typeof value === "string" && VACANCY_STATUSES.includes(value.trim())
    ? { value: value.trim() }
    : { error: VACANCY_MESSAGES.statusInvalid };
};

/** descriptionHtml: absent -> undefined, null -> "", otherwise sanitised or { error }. */
export const parseDescription = (body) => {
  const raw = body?.descriptionHtml;
  if (raw === undefined) return { value: undefined };
  if (raw === null) return { value: "" };
  if (typeof raw !== "string") return { error: VACANCY_MESSAGES.descriptionText };
  const value = sanitizeRichText(raw).trim();
  if (value.length > RICH_TEXT_MAX_LENGTH) return { error: VACANCY_MESSAGES.descriptionTooLong };
  return { value };
};

// ---- shapes -------------------------------------------------------------------

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null);
const textOrNull = (value) => (typeof value === "string" && value ? value : null);
const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);

/** Admin `Vacancy`. Stored records may carry extra keys (isActive, sortOrder); they are not returned. */
export const vacancyView = (record) => ({
  id: record.id,
  slug: record.slug ?? "",
  title: record.title ?? "",
  department: textOrNull(record.department),
  location: textOrNull(record.location),
  employmentType: EMPLOYMENT_TYPES.includes(record.employmentType) ? record.employmentType : null,
  salaryRange: textOrNull(record.salaryRange),
  descriptionHtml: typeof record.descriptionHtml === "string" ? record.descriptionHtml : "",
  requirements: list(record.requirements),
  responsibilities: list(record.responsibilities),
  status: VACANCY_STATUSES.includes(record.status) ? record.status : "draft",
  postedAt: iso(record.postedAt),
  closedAt: iso(record.closedAt),
  createdBy:
    record.createdBy && typeof record.createdBy === "object"
      ? { id: String(record.createdBy.id ?? ""), email: String(record.createdBy.email ?? "") }
      : null,
  createdAt: iso(record.createdAt),
  updatedAt: iso(record.updatedAt),
});

/** `PublicVacancy`: the admin shape without createdBy and closedAt. */
export const publicVacancyView = (record) => {
  const { createdBy: _createdBy, closedAt: _closedAt, ...rest } = vacancyView(record);
  return rest;
};

const byDesc = (key) => (a, b) =>
  String(iso(b[key]) || "").localeCompare(String(iso(a[key]) || "")) || String(b.id).localeCompare(String(a.id));

/**
 * Public list filters from query values: { department?, employmentType? } or { error }.
 * department matches case-insensitively; employmentType must be valid.
 */
export const parsePublicFilters = (department, employmentType) => {
  const filters = {};
  if (department !== undefined && department !== null && department !== "") {
    if (typeof department !== "string") return { error: VACANCY_MESSAGES.departmentText };
    if (department.length > VACANCY_LIMITS.department) return { error: VACANCY_MESSAGES.departmentTooLong };
    filters.department = department.trim().toLowerCase();
  }
  if (employmentType !== undefined && employmentType !== null && employmentType !== "") {
    if (!EMPLOYMENT_TYPES.includes(employmentType)) return { error: VACANCY_MESSAGES.employmentTypeInvalid };
    filters.employmentType = employmentType;
  }
  return { filters };
};

/** Open vacancies only, newest postedAt first. */
export const publicVacancies = (records, { department, employmentType } = {}) =>
  records
    .filter((record) => record.status === "open")
    .filter((record) => (department ? String(record.department || "").toLowerCase() === department : true))
    .filter((record) => (employmentType ? record.employmentType === employmentType : true))
    .sort(byDesc("postedAt"))
    .map(publicVacancyView);

/** Admin list filters from query values: { status?, q? } or { error }. */
export const parseAdminFilters = (status, q) => {
  const filters = {};
  if (status !== undefined && status !== null && status !== "") {
    if (!VACANCY_STATUSES.includes(status)) return { error: VACANCY_MESSAGES.statusInvalid };
    filters.status = status;
  }
  if (q !== undefined && q !== null && q !== "") {
    if (typeof q !== "string") return { error: VACANCY_MESSAGES.qText };
    if (q.length > VACANCY_LIMITS.q) return { error: VACANCY_MESSAGES.qTooLong };
    filters.q = q.trim().toLowerCase();
  }
  return { filters };
};

/** Every status, filtered by status and q (title, department, location), newest updatedAt first. */
export const adminVacancies = (records, { status, q } = {}) =>
  records
    .filter((record) => (status ? vacancyView(record).status === status : true))
    .filter((record) =>
      q
        ? [record.title, record.department, record.location].some((value) =>
            String(value || "").toLowerCase().includes(q)
          )
        : true
    )
    .sort(byDesc("updatedAt"));

/** createdBy from the acting admin (never from the request body). */
export const createdByOf = (admin) => (admin ? { id: String(admin.id), email: String(admin.email ?? "") } : null);
