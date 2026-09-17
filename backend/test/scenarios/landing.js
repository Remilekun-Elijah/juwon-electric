// Landing v1 (docs/agents/LANDING_V1.md §1-§3): FAQs, reviews and client logos (CRUD, validation,
// capabilities, public filtering, sample clearing, audit), portfolio case-study fields and the
// category filter, and the website/financing/calculator settings sections (validation, sample
// clearing on save, public exposure). Runtime-agnostic scenario; returns the transcript for parity.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

const CONTENT_KEYS = ["createdAt", "id", "isActive", "sample", "sortOrder", "updatedAt"];

// Portfolio bodies depend on each runtime's default catalog (sortOrder): keep the fields under test.
const portfolioView = (item) =>
  item && {
    name: item.name,
    slug: item.slug,
    featured: item.featured,
    category: item.category,
    summary: item.summary,
    location: item.location,
    system: item.system,
    sample: item.sample,
  };
const portfolioProject = (body) => ({
  message: body?.message,
  data: Array.isArray(body?.data)
    ? body.data.filter((item) => item.name.startsWith("Landing ")).map(portfolioView)
    : portfolioView(body?.data),
});

export const runLandingScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const support = await client.seedAdmin("support");
  const sales = await client.seedAdmin("sales");
  const engineer = await client.seedAdmin("engineer");

  // ---- capabilities ------------------------------------------------------------------------
  await expect("engineer cannot read FAQs", "GET", "/admin/faqs", { token: engineer.token }, 403, FORBIDDEN);
  await expect("support reads reviews", "GET", "/admin/testimonials", { token: support.token }, 200, "Reviews retrieved.");
  await expect("support cannot create clients", "POST", "/admin/clients", { token: support.token, body: {} }, 403, FORBIDDEN);

  // ---- FAQs ------------------------------------------------------------------------------------
  await expect("faq question required", "POST", "/admin/faqs", { body: { answer: "Yes." } }, 400, "Question is required.");
  await expect("faq question too short", "POST", "/admin/faqs", { body: { question: "Why", answer: "Yes." } }, 400, "Question must be at least 5 characters.");
  await expect("faq answer required", "POST", "/admin/faqs", { body: { question: "Do you deliver?" } }, 400, "Answer is required.");
  await expect("faq answer too long", "POST", "/admin/faqs", { body: { question: "Do you deliver?", answer: "x".repeat(2001) } }, 400, "Answer must be 2000 characters or fewer.");
  await expect("faq category too long", "POST", "/admin/faqs", { body: { question: "Do you deliver?", answer: "Yes.", category: "c".repeat(61) } }, 400, "Category must be 60 characters or fewer.");

  const faq = (
    await expect("create faq", "POST", "/admin/faqs", {
      token: sales.token,
      body: { question: "  Do I pay to place an order?  ", answer: "No.\nWe call to confirm.", category: "Ordering", unknown: "ignored", sample: true },
    }, 201, "FAQ created.")
  ).body.data;
  assert.deepEqual(Object.keys(faq).sort(), [...CONTENT_KEYS, "answer", "category", "question"].sort());
  assert.equal(faq.question, "Do I pay to place an order?");
  assert.equal(faq.answer, "No.\nWe call to confirm.");
  assert.equal(faq.sample, false, "sample is never accepted from a request");
  assert.equal(faq.isActive, true);
  assert.equal(faq.sortOrder, 1, "first record goes first");
  const second = (
    await expect("create faq without category", "POST", "/admin/faqs", { body: { question: "How long is installation?", answer: "About a day.", category: "  " } }, 201)
  ).body.data;
  assert.equal(second.category, null);
  assert.equal(second.sortOrder, 2, "new records go last");
  await expect("create inactive faq", "POST", "/admin/faqs", {
    body: { question: "Hidden question?", answer: "Hidden.", category: "Ordering", isActive: false, sortOrder: 0 },
  }, 201);
  await client.seedRecord("faqs", {
    id: "sample-faq-test",
    question: "Sample question here?",
    answer: "Sample answer.",
    category: "Products",
    sortOrder: 0,
    isActive: true,
    sample: true,
    createdAt: "2026-12-31T00:00:00.000Z",
  });

  const publicFaqs = (await expect("public faqs", "GET", "/faqs", { token: null }, 200, "FAQs retrieved.")).body.data;
  assert.deepEqual(publicFaqs.map((item) => item.question), ["Sample question here?", "Do I pay to place an order?", "How long is installation?"]);
  assert.equal(publicFaqs[0].sample, true);
  const ordering = (await expect("public faqs by category", "GET", "/faqs?category=ordering", { token: null }, 200)).body.data;
  assert.deepEqual(ordering.map((item) => item.question), ["Do I pay to place an order?"]);
  const adminFaqs = (await expect("admin faqs include inactive", "GET", "/admin/faqs", { token: support.token }, 200)).body.data;
  assert.equal(adminFaqs.length, 4);
  assert.equal(adminFaqs[0].question, "Hidden question?", "sortOrder 0, created before the seeded sample");

  const moved = (await expect("update faq sort order only", "PUT", `/admin/faqs/${faq.id}`, { body: { sortOrder: 9 } }, 200, "FAQ updated.")).body.data;
  assert.equal(moved.question, "Do I pay to place an order?");
  assert.equal(moved.category, "Ordering");
  const cleared = (await expect("clear faq category", "PUT", `/admin/faqs/${faq.id}`, { body: { category: null } }, 200)).body.data;
  assert.equal(cleared.category, null);
  const reordered = (await expect("reordering a sample faq keeps it sample", "PUT", "/admin/faqs/sample-faq-test", { body: { sortOrder: 7, isActive: true } }, 200)).body.data;
  assert.equal(reordered.sample, true, "moving or showing a sample record is not an edit");
  const resaved = (await expect("re-saving unchanged sample faq keeps it sample", "PUT", "/admin/faqs/sample-faq-test", { body: { question: reordered.question, answer: reordered.answer, category: reordered.category } }, 200)).body.data;
  assert.equal(resaved.sample, true, "unchanged values are not an edit");
  const saved = (await expect("saving a sample faq makes it real", "PUT", "/admin/faqs/sample-faq-test", { body: { answer: "Real answer." } }, 200)).body.data;
  assert.equal(saved.sample, false);
  await expect("faq bad update", "PUT", `/admin/faqs/${faq.id}`, { body: { question: "" } }, 400, "Question is required.");
  await expect("unknown faq", "PUT", "/admin/faqs/missing", { body: { answer: "x" } }, 404, "FAQ not found.");
  await expect("delete faq", "DELETE", `/admin/faqs/${second.id}`, {}, 200, "FAQ deleted.");
  await expect("delete faq again", "DELETE", `/admin/faqs/${second.id}`, {}, 404, "FAQ not found.");

  // ---- reviews -------------------------------------------------------------------------------------
  const review = { name: "Adaeze O.", quote: "The team called to confirm within the hour." };
  await expect("review quote too short", "POST", "/admin/testimonials", { body: { ...review, quote: "Great" } }, 400, "Quote must be at least 10 characters.");
  await expect("review name required", "POST", "/admin/testimonials", { body: { quote: review.quote } }, 400, "Name is required.");
  await expect("review rating range", "POST", "/admin/testimonials", { body: { ...review, rating: 6 } }, 400, "Rating must be a whole number from 1 to 5.");
  await expect("review rating whole", "POST", "/admin/testimonials", { body: { ...review, rating: 4.5 } }, 400, "Rating must be a whole number.");
  await expect("review source", "POST", "/admin/testimonials", { body: { ...review, source: "twitter" } }, 400, "Source must be one of: website, whatsapp, google, facebook, in_person.");
  await expect("review image url", "POST", "/admin/testimonials", { body: { ...review, imageUrl: "javascript:alert(1)" } }, 400, "Image URL must be an http(s) URL or a path starting with /.");
  await expect("review image path characters", "POST", "/admin/testimonials", { body: { ...review, imageUrl: "/images/a b.png" } }, 400, "Image URL must be an http(s) URL or a path starting with /.");
  await expect("review context too long", "POST", "/admin/testimonials", { body: { ...review, context: "c".repeat(151) } }, 400, "Context must be 150 characters or fewer.");

  const created = (
    await expect("create review", "POST", "/admin/testimonials", {
      body: { ...review, context: "3.5kVA lithium, Ikeja", rating: 5, source: "whatsapp", imageUrl: "/samples/review-1.jpg" },
    }, 201, "Review created.")
  ).body.data;
  assert.deepEqual(Object.keys(created).sort(), [...CONTENT_KEYS, "context", "imageUrl", "name", "quote", "rating", "source"].sort());
  const bare = (
    await expect("create review with defaults", "POST", "/admin/testimonials", {
      body: { name: "Tunde B.", quote: "Stayed on through every outage.", imageUrl: "http://images.juwon.test/tunde.jpg" },
    }, 201)
  ).body.data;
  assert.deepEqual([bare.rating, bare.source, bare.context], [null, null, null]);
  const hidden = (await expect("hide review", "PUT", `/admin/testimonials/${bare.id}`, { body: { isActive: false, rating: null } }, 200, "Review updated.")).body.data;
  assert.equal(hidden.isActive, false);
  const publicReviews = (await expect("public reviews", "GET", "/testimonials", { token: null }, 200, "Reviews retrieved.")).body.data;
  assert.deepEqual(publicReviews.map((item) => item.name), ["Adaeze O."]);
  await expect("unknown review", "DELETE", "/admin/testimonials/missing", {}, 404, "Review not found.");
  await expect("delete review", "DELETE", `/admin/testimonials/${bare.id}`, {}, 200, "Review deleted.");

  // ---- client logos ---------------------------------------------------------------------------------
  await expect("client logo required", "POST", "/admin/clients", { body: { name: "Palmgrove Farms" } }, 400, "Logo URL is required.");
  await expect("client logo protocol", "POST", "/admin/clients", { body: { name: "Palmgrove Farms", logoUrl: "ftp://x.test/logo.svg" } }, 400, "Logo URL must be an http(s) URL or a path starting with /.");
  await expect("client website", "POST", "/admin/clients", { body: { name: "Palmgrove Farms", logoUrl: "/samples/client-3.svg", website: "/about" } }, 400, "Website must be an http(s) URL.");
  const logo = (
    await expect("create client", "POST", "/admin/clients", {
      body: { name: "Palmgrove Farms", logoUrl: "/samples/client-3.svg", website: "https://palmgrove.test" },
    }, 201, "Client created.")
  ).body.data;
  assert.deepEqual(Object.keys(logo).sort(), [...CONTENT_KEYS, "logoUrl", "name", "website"].sort());
  await expect("client logo cannot be cleared", "PUT", `/admin/clients/${logo.id}`, { body: { logoUrl: "" } }, 400, "Logo URL is required.");
  const renamed = (await expect("update client", "PUT", `/admin/clients/${logo.id}`, { body: { website: null, name: "Palmgrove Farm" } }, 200, "Client updated.")).body.data;
  assert.deepEqual([renamed.name, renamed.website, renamed.logoUrl], ["Palmgrove Farm", null, "/samples/client-3.svg"]);
  const publicClients = (await expect("public clients", "GET", "/clients", { token: null }, 200, "Clients retrieved.")).body.data;
  assert.deepEqual(publicClients.map((item) => item.name), ["Palmgrove Farm"]);
  await expect("unknown client", "PUT", "/admin/clients/missing", { body: {} }, 404, "Client not found.");

  const auditActions = (
    await expect("content audit entries", "GET", "/admin/audit-logs?entity=faq", {
      project: (body) => ({ actions: body?.data?.items?.map((item) => item.action).sort() }),
    }, 200)
  ).body.data.items.map((item) => [item.action, item.summary]);
  assert.ok(auditActions.some(([action, summary]) => action === "faq.create" && summary === 'Created FAQ "Do I pay to place an order?"'));
  assert.ok(auditActions.some(([action]) => action === "faq.delete"));

  // ---- portfolio case-study fields -------------------------------------------------------------------
  const image = "https://images.juwon.test/case.jpg";
  await expect("portfolio category must be a slug", "POST", "/admin/portfolio", { body: { name: "Landing Bad", image, category: "Two Words!" } }, 400, "Category must be a customer segment slug.");
  await expect("portfolio summary too long", "POST", "/admin/portfolio", { body: { name: "Landing Bad", image, summary: "s".repeat(501) } }, 400, "Summary must be 500 characters or fewer.");
  const caseStudy = portfolioProject(
    (await expect("create case study", "POST", "/admin/portfolio", {
      body: { name: "Landing Clinic", image, category: "Hospitals", summary: "Backup for a clinic.", location: "Surulere, Lagos", system: "7.5kVA inverter, 2 × 5kWh lithium", featured: true },
      project: portfolioProject,
    }, 201, "Portfolio item created.")).body
  ).data;
  assert.deepEqual(caseStudy, {
    name: "Landing Clinic",
    slug: "landing-clinic",
    featured: true,
    category: "hospitals",
    summary: "Backup for a clinic.",
    location: "Surulere, Lagos",
    system: "7.5kVA inverter, 2 × 5kWh lithium",
    sample: false,
  });
  await client.seedRecord("portfolio", { name: "Landing Legacy", slug: "landing-legacy", image, featured: false, sortOrder: 500 });
  const older = portfolioProject((await expect("older portfolio records read null", "GET", "/portfolio/landing-legacy", { token: null, project: portfolioProject }, 200)).body).data;
  assert.deepEqual([older.category, older.summary, older.location, older.system, older.sample], [null, null, null, null, false]);
  const byCategory = portfolioProject((await expect("portfolio category filter", "GET", "/portfolio?category=hospitals", { token: null, project: portfolioProject }, 200, "Portfolio retrieved.")).body).data;
  assert.deepEqual(byCategory.map((item) => item.name), ["Landing Clinic"]);
  const featured = portfolioProject((await expect("portfolio featured filter still works", "GET", "/portfolio?featured=true", { token: null, project: portfolioProject }, 200)).body).data;
  assert.deepEqual(featured.map((item) => item.name), ["Landing Clinic"]);
  const adminList = portfolioProject((await expect("admin portfolio includes the fields", "GET", "/admin/portfolio", { project: portfolioProject }, 200)).body).data;
  assert.equal(adminList.length, 2);
  const updated = portfolioProject(
    (await expect("update case study clears summary", "PUT", "/admin/portfolio/landing-clinic", {
      body: { name: "Landing Clinic", image, summary: "", location: null },
      project: portfolioProject,
    }, 200, "Portfolio item updated.")).body
  ).data;
  assert.deepEqual([updated.category, updated.summary, updated.location, updated.system], ["hospitals", null, null, "7.5kVA inverter, 2 × 5kWh lithium"]);

  // ---- settings sections ------------------------------------------------------------------------------
  const bad = (label, body, message) => expect(label, "PUT", "/admin/settings", { body }, 400, message);
  await bad("website must be an object", { website: [] }, "website must be an object.");
  await bad("too many stats", { website: { stats: [1, 2, 3, 4, 5].map((n) => ({ label: `S${n}`, value: `${n}` })) } }, "Stats can have at most 4 entries.");
  await bad("stat value too long", { website: { stats: [{ label: "Installations", value: "x".repeat(21) }] } }, "Stat value must be 20 characters or fewer.");
  await bad("stat label required", { website: { stats: [{ value: "500+" }] } }, "Stat label is required.");
  await bad("whatsapp number", { website: { whatsappNumber: "call me" } }, "Enter a valid phone number.");
  await bad("business hours too long", { website: { businessHours: "h".repeat(201) } }, "Business hours must be 200 characters or fewer.");
  await bad("financing enabled", { financing: { enabled: "yes" } }, "Financing enabled must be true or false.");
  await bad("deposit percent", { financing: { depositPercent: 101 } }, "Deposit percent must be a whole number from 0 to 100.");
  await bad("too many terms", { financing: { termsMonths: [1, 2, 3, 4, 5, 6, 7] } }, "Terms can have at most 6 entries.");
  await bad("term range", { financing: { termsMonths: [0] } }, "Each term must be a whole number from 1 to 60.");
  await bad("monthly rate range", { financing: { monthlyRatePercent: 21 } }, "Monthly rate must be between 0 and 20.");
  await bad("monthly rate decimals", { financing: { monthlyRatePercent: 3.125 } }, "Monthly rate can have at most 2 decimal places.");
  await bad("approval time too long", { financing: { approvalTime: "a".repeat(61) } }, "Approval time must be 60 characters or fewer.");
  await bad("financing note too long", { financing: { note: "n".repeat(301) } }, "Financing note must be 300 characters or fewer.");
  const appliance = { key: "fan", label: "Fan", watts: 75, defaultHours: 8, defaultQuantity: 2 };
  await bad("appliance key pattern", { calculator: { appliances: [{ ...appliance, key: "Ceiling Fan" }] } }, "Appliance key must contain only lowercase letters, numbers and hyphens.");
  await bad("appliance key unique", { calculator: { appliances: [appliance, { ...appliance, label: "Fan 2" }] } }, 'Appliance key "fan" is used more than once.');
  await bad("appliance watts", { calculator: { appliances: [{ ...appliance, watts: 0 }] } }, "Watts must be a whole number from 1 to 10,000.");
  await bad("appliance hours step", { calculator: { appliances: [{ ...appliance, defaultHours: 1.25 }] } }, "Default hours must be in steps of 0.5.");
  await bad("appliance quantity", { calculator: { appliances: [{ ...appliance, defaultQuantity: 21 }] } }, "Default quantity must be a whole number from 0 to 20.");
  await bad("too many appliances", { calculator: { appliances: Array.from({ length: 41 }, (_, n) => ({ ...appliance, key: `a-${n}` })) } }, "Appliances can have at most 40 entries.");
  await bad("battery voltage", { calculator: { batteryVoltage: 36 } }, "Battery voltage must be 12, 24 or 48.");
  await bad("depth of discharge", { calculator: { batteryDepthOfDischargePercent: 5 } }, "Battery depth of discharge must be a whole number from 10 to 100.");
  await bad("panel watts", { calculator: { panelWatts: 50 } }, "Panel watts must be a whole number from 100 to 1,000.");
  await bad("peak sun hours decimals", { calculator: { peakSunHours: 4.55 } }, "Peak sun hours can have at most 1 decimal place.");
  await bad("headroom required", { calculator: { inverterHeadroomPercent: null } }, "Inverter headroom must be a whole number.");
  await bad("generator object", { calculator: { generator: 5 } }, "Generator must be an object.");
  await bad("litres per kVA-hour", { calculator: { generator: { litresPerKvaHour: 2.5 } } }, "Litres per kVA-hour must be between 0 and 2.");

  // Sample sections, as the local seed stores them.
  await client.seedRecord("settings", {
    id: "global",
    website: { stats: [{ label: "Installations", value: "500+" }], whatsappNumber: "+2348000000000", businessHours: "Mon–Sat 8am–6pm", sample: true },
    financing: { enabled: false, depositPercent: 40, termsMonths: [3, 6, 12], monthlyRatePercent: 3.5, approvalTime: "48 hours", note: "Sample terms.", sample: true },
    calculator: { enabled: true, appliances: [appliance], inverterHeadroomPercent: 25, batteryDepthOfDischargePercent: 80, batteryVoltage: 48, panelWatts: 550, peakSunHours: 4.5, generator: { fuelPricePerLitre: 1000, litresPerKvaHour: 0.25, maintenancePerMonth: 20000 }, sample: true },
  });
  const seeded = (await expect("seeded sample sections", "GET", "/admin/settings", {}, 200)).body.data;
  assert.deepEqual([seeded.website.sample, seeded.financing.sample, seeded.calculator.sample], [true, true, true]);
  assert.equal(seeded.business.name, "Juwon Electric", "missing sections read as defaults");

  const publicSample = (await expect("public sample settings", "GET", "/settings/public", { token: null }, 200)).body.data;
  assert.deepEqual(Object.keys(publicSample).sort(), ["business", "calculator", "financing", "payments", "website"]);
  assert.equal(publicSample.website.sample, true);
  assert.deepEqual(publicSample.financing, { enabled: false }, "disabled financing hides its terms");
  assert.equal(publicSample.calculator.enabled, true);
  assert.deepEqual(publicSample.calculator.appliances, [appliance]);
  assert.equal("notifications" in publicSample, false);

  const unchanged = (
    await expect("re-save sample financing unchanged", "PUT", "/admin/settings", {
      body: { financing: { enabled: false, depositPercent: 40, termsMonths: [3, 6, 12], monthlyRatePercent: 3.5, approvalTime: "48 hours", note: "Sample terms." } },
    }, 200)
  ).body.data;
  assert.equal(unchanged.financing.sample, true, "a section saved without changes keeps its Sample label");

  const saved1 = (
    await expect("save website section", "PUT", "/admin/settings", {
      body: { website: { businessHours: "Mon–Fri 8am–6pm\nSat 9am–3pm", sample: true }, calculator: { generator: { fuelPricePerLitre: 1200 } } },
    }, 200, "Settings updated.")
  ).body.data;
  assert.equal(saved1.website.sample, false, "saving a section clears sample (sent sample is ignored)");
  assert.deepEqual(saved1.website.stats, [{ label: "Installations", value: "500+" }], "unsent keys are kept");
  assert.equal(saved1.financing.sample, true, "unsent sections keep sample");
  assert.equal(saved1.calculator.sample, false);
  assert.deepEqual(saved1.calculator.generator, { fuelPricePerLitre: 1200, litresPerKvaHour: 0.25, maintenancePerMonth: 20000 }, "generator keys merge");

  const saved2 = (
    await expect("enable financing", "PUT", "/admin/settings", {
      body: { financing: { enabled: true, termsMonths: [12, "6", 3, 6], monthlyRatePercent: "3.25", depositPercent: "" }, calculator: { enabled: false } },
    }, 200)
  ).body.data;
  assert.deepEqual(saved2.financing, { enabled: true, depositPercent: null, termsMonths: [3, 6, 12], monthlyRatePercent: 3.25, approvalTime: "48 hours", note: "Sample terms.", sample: false });
  const publicSaved = (await expect("public settings after save", "GET", "/settings/public", { token: null }, 200)).body.data;
  assert.deepEqual(publicSaved.financing, saved2.financing, "enabled financing is public in full");
  assert.deepEqual(publicSaved.calculator, { enabled: false });
  assert.deepEqual(publicSaved.website, {
    stats: [{ label: "Installations", value: "500+" }],
    whatsappNumber: "+2348000000000",
    businessHours: "Mon–Fri 8am–6pm\nSat 9am–3pm",
    productsEnabled: true,
    sample: false,
  });

  // Products on the website: a boolean in the website section, public so the storefront can hide its Products area.
  await bad("products flag must be boolean", { website: { productsEnabled: "no" } }, "Products on the website must be true or false.");
  const productsOff = (
    await expect("switch products off", "PUT", "/admin/settings", { body: { website: { productsEnabled: false } } }, 200, "Settings updated.")
  ).body.data;
  assert.equal(productsOff.website.productsEnabled, false);
  const publicOff = (await expect("public settings with products off", "GET", "/settings/public", { token: null }, 200)).body.data;
  assert.equal(publicOff.website.productsEnabled, false, "the storefront reads the flag from public settings");
  await expect("switch products back on", "PUT", "/admin/settings", { body: { website: { productsEnabled: true } } }, 200);

  const auditChanges = (
    await expect("settings audit lists the cleared sample flag", "GET", "/admin/audit-logs?entity=settings", {
      // Entries written in the same millisecond can list in either order, so compare them sorted.
      project: (body) => ({ changes: (body?.data?.items?.map((item) => item.changes) || []).map((list) => [...list].sort()).sort((a, b) => a.join().localeCompare(b.join())) }),
    }, 200)
  ).body.data.items.map((item) => item.changes);
  assert.ok(auditChanges.some((changes) => changes.includes("website.sample") && changes.includes("calculator.generator")));

  return transcript;
};
