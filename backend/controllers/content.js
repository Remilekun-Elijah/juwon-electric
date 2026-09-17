// Website content (LANDING_V1 §1, TEAM_AND_MOTION_V1 §1): FAQs, reviews (testimonials), client logos
// and team members.
// Validation, filters and serializers are shared with the Worker (backend/shared/content.js).
import { asyncHandler } from "../services/asyncHandler.js";
import { audit, changedFields } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { keepSampleUnlessEdited, CONTENT_MODULES, contentAuditSummary, contentList, nextContentSortOrder } from "../shared/content.js";
import { definedKeys } from "../shared/fields.js";

const all = (collection) => listCollection(collection, { includeInactive: true });

const handlersFor = (collection) => {
  const { entity, payload: buildPayload, serialize, messages } = CONTENT_MODULES[collection];

  return {
    publicList: asyncHandler(async (req, res) => {
      ok(res, messages.list, contentList(collection, await all(collection), req.query, { publicView: true }));
    }),

    adminList: asyncHandler(async (req, res) => {
      ok(res, messages.list, contentList(collection, await all(collection), req.query));
    }),

    create: asyncHandler(async (req, res) => {
      const payload = buildPayload(req.body);
      // New records without a sortOrder go last (JSON store: computed inside the lock).
      const existing = payload.sortOrder === undefined ? await all(collection) : [];
      const item = await createCollectionItem(collection, payload, {
        prepare: (items, draft) =>
          draft.sortOrder !== undefined ? draft : { ...draft, sortOrder: nextContentSortOrder(items.length ? items : existing) },
      });
      audit(req, {
        action: `${entity}.create`,
        entity,
        entityId: item.id,
        summary: contentAuditSummary(collection, "Created", item),
        changes: changedFields({}, item, definedKeys(payload)),
      });
      created(res, messages.create, serialize(item));
    }),

    update: asyncHandler(async (req, res) => {
      const existing = await getCollectionItem(collection, req.params.id);
      const payload = keepSampleUnlessEdited(existing, buildPayload(req.body, { isUpdate: true }));
      const item = await updateCollectionItem(collection, existing.id, payload);
      audit(req, {
        action: `${entity}.update`,
        entity,
        entityId: item.id,
        summary: contentAuditSummary(collection, "Updated", item),
        changes: changedFields(existing, item, definedKeys(payload)),
      });
      ok(res, messages.update, serialize(item));
    }),

    remove: asyncHandler(async (req, res) => {
      const existing = await getCollectionItem(collection, req.params.id);
      const item = await deleteCollectionItem(collection, existing.id);
      audit(req, {
        action: `${entity}.delete`,
        entity,
        entityId: item.id,
        summary: contentAuditSummary(collection, "Deleted", item),
        changes: [],
      });
      ok(res, messages.delete, serialize(item));
    }),
  };
};

export const faqs = handlersFor("faqs");
export const testimonials = handlersFor("testimonials");
export const clients = handlersFor("clients");
export const teamMembers = handlersFor("teamMembers");
