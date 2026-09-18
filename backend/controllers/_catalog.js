// Shared create/update/delete flow for the catalog collections (packages,
// services, portfolio, customerSegments).
import { auditCreate, auditDelete, auditUpdate } from "../services/audit.js";
import { keepSampleUnlessEdited } from "../shared/content.js";
import { ApiError } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  updateCollectionItem,
} from "../services/store.js";
import { LIMITS, deriveSlug } from "../services/validators.js";

/** `slug`, or `slug-2`, `slug-3`, ... when another record already uses it (<= 120 chars). */
export const uniqueSlug = (items, slug, selfId) => {
  const taken = new Set(items.filter((item) => item.id !== selfId).map((item) => item.slug));
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${slug.slice(0, LIMITS.slug - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
};

const assertLegacyIdFree = (items, legacyId, selfId) => {
  if (legacyId === undefined || legacyId === null) return;
  const clash = items.some(
    (item) =>
      item.id !== selfId &&
      item.legacyId !== undefined &&
      item.legacyId !== null &&
      String(item.legacyId).trim() !== "" &&
      Number(item.legacyId) === Number(legacyId)
  );
  if (clash) throw new ApiError(409, `Another package already uses id ${Number(legacyId)}.`);
};

const definedKeys = (payload) => Object.keys(payload).filter((key) => payload[key] !== undefined);

/**
 * Express handlers for one catalog collection. `buildPayload(body, { isUpdate, existing })` (may be async);
 * optional async `validate(payload)` runs before any write (e.g. reference checks);
 * optional async `serialize(item)` shapes the response record.
 */
export const catalogHandlers = ({ collection, entity, buildPayload, messages, slugSource, validate, serialize = (item) => item }) => ({
  create: async (req, res) => {
    const payload = await buildPayload(req.body || {}, { isUpdate: false, existing: null });
    if (validate) await validate(payload);
    const item = await createCollectionItem(collection, payload, {
      prepare: (items, draft) => {
        if (collection === "packages") assertLegacyIdFree(items, draft.legacyId);
        return { ...draft, slug: uniqueSlug(items, draft.slug) };
      },
    });
    auditCreate(req, entity, item, definedKeys(payload));
    created(res, messages.create, await serialize(item));
  },

  update: async (req, res) => {
    const existing = await getCollectionItem(collection, req.params.id);
    // Portfolio sample records stay samples unless a content field changed (LANDING_V1 §0).
    const built = await buildPayload(req.body || {}, { isUpdate: true, existing });
    const payload = collection === "portfolio" ? keepSampleUnlessEdited(existing, built) : built;
    if (validate) await validate(payload);
    // Written strictly by the resolved id, with only the sent fields, against
    // the fresh stored record.
    const item = await updateCollectionItem(collection, existing.id, payload, {
      prepare: (items, fresh, patch) => {
        if (collection === "packages") assertLegacyIdFree(items, patch.legacyId, fresh.id);
        const slug = patch.slug || (fresh.slug ? undefined : deriveSlug(slugSource({ ...fresh, ...patch })));
        return slug ? { ...patch, slug: uniqueSlug(items, slug, fresh.id) } : patch;
      },
    });
    auditUpdate(req, entity, existing, item, definedKeys(payload));
    ok(res, messages.update, await serialize(item));
  },

  remove: async (req, res) => {
    const existing = await getCollectionItem(collection, req.params.id);
    const item = await deleteCollectionItem(collection, existing.id);
    auditDelete(req, entity, item);
    ok(res, messages.delete, await serialize(item));
  },
});
