// Website content (LANDING_V1 §1): FAQs, reviews (testimonials) and client logos for the
// Worker, at parity with backend/controllers/content.js. Rules: backend/shared/content.js.
import { created, ok } from "../http.js";
import { createCollectionItem, deleteCollectionItem, getCollectionItem, listCollection, updateCollectionItem } from "../store.js";
import { changedFields, providedFields } from "../audit.js";
import { requireCapability } from "../capabilities.js";
import { idAfter, queryOf } from "./catalog.js";
import { CONTENT_COLLECTIONS, CONTENT_MODULES, contentAuditSummary, contentList } from "../../../shared/content.js";

const all = (env, collection) => listCollection(env, collection, { includeInactive: true });

export const handleContentPublic = async ({ request, env, path, url }) => {
  if (request.method !== "GET") return null;
  const collection = CONTENT_COLLECTIONS.find((name) => path === `/${name}`);
  if (!collection) return null;
  const items = contentList(collection, await all(env, collection), queryOf(url), { publicView: true });
  return ok(CONTENT_MODULES[collection].messages.list, items);
};

export const handleContentAdmin = async ({ request, env, path, body, admin, audit, url }) => {
  const { method } = request;
  for (const collection of CONTENT_COLLECTIONS) {
    const base = `/admin/${collection}`;
    const { entity, payload: buildPayload, serialize, messages } = CONTENT_MODULES[collection];

    if (path === base && method === "GET") {
      requireCapability(admin, "content:read");
      return ok(messages.list, contentList(collection, await all(env, collection), queryOf(url)));
    }
    if (path === base && method === "POST") {
      requireCapability(admin, "content:write");
      const payload = buildPayload(body);
      const item = await createCollectionItem(env, collection, payload);
      audit({
        action: `${entity}.create`,
        entity,
        entityId: item.id,
        summary: contentAuditSummary(collection, "Created", item),
        changes: providedFields(payload),
      });
      return created(messages.create, serialize(item));
    }

    const id = idAfter(path, base);
    if (id && method === "PUT") {
      requireCapability(admin, "content:write");
      const existing = await getCollectionItem(env, collection, id);
      const payload = buildPayload(body, { isUpdate: true });
      const item = await updateCollectionItem(env, collection, existing.id, payload);
      audit({
        action: `${entity}.update`,
        entity,
        entityId: item.id,
        summary: contentAuditSummary(collection, "Updated", item),
        changes: changedFields(existing, payload),
      });
      return ok(messages.update, serialize(item));
    }
    if (id && method === "DELETE") {
      requireCapability(admin, "content:write");
      const existing = await getCollectionItem(env, collection, id);
      await deleteCollectionItem(env, collection, existing);
      audit({
        action: `${entity}.delete`,
        entity,
        entityId: existing.id,
        summary: contentAuditSummary(collection, "Deleted", existing),
      });
      return ok(messages.delete, serialize(existing));
    }
  }
  return null;
};
