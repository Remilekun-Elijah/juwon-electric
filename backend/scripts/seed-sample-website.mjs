// Seeds the sample website content (LANDING_V1 §4) into the Express store: the JSON file store,
// or MongoDB when MONGODB_URI is set. Local development only: refuses NODE_ENV=production.
//
//   npm run seed:sample
//
// Idempotent: FAQs, reviews, client logos and team members use fixed `sample-` ids and are upserted; the
// existing portfolio records get sample case-study fields; the website, financing and calculator
// settings sections are replaced only while they are missing, empty or still sample content.
// Data: backend/shared/sampleWebsite.js (also exported to D1 SQL for the Worker).
import { pathToFileURL } from "node:url";
import {
  SAMPLE_COLLECTIONS,
  SAMPLE_PORTFOLIO,
  SAMPLE_SETTINGS,
  isSeedableSection,
} from "../shared/sampleWebsite.js";
import { SETTINGS_ID } from "../shared/settings.js";

export const refuseInProduction = (env = process.env) => {
  if (String(env.NODE_ENV || "").trim().toLowerCase() === "production") {
    throw new Error("Refusing to seed sample website content: NODE_ENV is production. Sample data is for local development only.");
  }
};

/** Runs the seed against the already-selected store. Returns counts per step. */
export const seedSampleWebsite = async ({ log = console.log } = {}) => {
  refuseInProduction();
  const store = await import("../services/store.js");
  const result = { created: 0, updated: 0, kept: 0, portfolio: 0, portfolioMissing: [], sections: [], sectionsKept: [] };

  for (const [collection, items] of Object.entries(SAMPLE_COLLECTIONS)) {
    for (const item of items) {
      const { id, createdAt: _createdAt, ...fields } = item;
      let kept = false;
      const { created } = await store.upsertCollectionItem(collection, { id }, {
        create: item,
        // A sample record an admin has saved (sample: false) is real content: keep it.
        update: (existing) => {
          kept = existing.sample !== true;
          return kept ? null : fields;
        },
      });
      result[created ? "created" : kept ? "kept" : "updated"] += 1;
    }
  }

  const portfolio = await store.listCollection("portfolio", { includeInactive: true });
  for (const { id, slug, sortOrder, ...fields } of SAMPLE_PORTFOLIO) {
    const match =
      portfolio.find((item) => item.id === id) ||
      portfolio.find((item) => item.slug === slug && Number(item.sortOrder) === sortOrder);
    if (!match) {
      result.portfolioMissing.push(slug);
      continue;
    }
    if (match.sample === false) continue; // saved by an admin since: real content
    await store.updateCollectionItem("portfolio", match.id, { ...fields, sample: true });
    result.portfolio += 1;
  }

  const current = (await store.findCollectionItem("settings", { id: SETTINGS_ID })) || null;
  const patch = {};
  for (const [section, value] of Object.entries(SAMPLE_SETTINGS)) {
    if (isSeedableSection(section, current?.[section])) {
      patch[section] = value;
      result.sections.push(section);
    } else {
      result.sectionsKept.push(section);
    }
  }
  if (Object.keys(patch).length) {
    await store.upsertCollectionItem("settings", { id: SETTINGS_ID }, {
      create: { id: SETTINGS_ID, ...patch, updatedAt: new Date().toISOString(), updatedBy: null },
      update: () => patch,
    });
  }

  log(
    `Sample website content: ${result.created} created, ${result.updated} updated, ${result.kept} kept (edited by an admin); ` +
      `${result.portfolio} portfolio items; settings sections seeded: ${result.sections.join(", ") || "none"}` +
      (result.sectionsKept.length ? ` (kept real content: ${result.sectionsKept.join(", ")})` : "") +
      (result.portfolioMissing.length ? `; portfolio not found: ${result.portfolioMissing.join(", ")}` : "")
  );
  return result;
};

const connect = async () => {
  const { default: config } = await import("../config.js");
  const { setStorageMode } = await import("../services/runtime.js");
  if (!config.mongodb_uri) {
    setStorageMode("json");
    return async () => {};
  }
  const { default: mongoose } = await import("mongoose");
  await mongoose.connect(config.mongodb_uri, { serverSelectionTimeoutMS: 10000 });
  setStorageMode("mongo");
  return () => mongoose.disconnect();
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    refuseInProduction();
    const disconnect = await connect();
    try {
      await seedSampleWebsite();
    } finally {
      await disconnect();
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
