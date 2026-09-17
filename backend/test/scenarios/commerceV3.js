// Commerce v3 (docs/agents/COMMERCE_V3.md §7): installation crews (validation, notifications to
// newly added engineers only, filters, engineer scoping, audit, read-time migration), one job per
// order, optional in-store name and phone, online product orders (quote, cart, order, snapshot,
// requiresInstallation default, stock commit, email) and package categories (categoryId, the
// ?category= filter, category delete). Runtime-agnostic scenario; returns the transcript for parity.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const UNAVAILABLE = "Some items in your cart are no longer available. Please refresh your cart.";
const ASSIGNEE = "Assignee must be an active engineer.";
const ORDER_HAS_JOB = "This order already has an installation job.";

const message = (body) => ({ message: body?.message });
// Order bodies: the Worker stores a sortOrder, and ids and timestamps are masked anyway.
const ORDER_KEYS = [
  "name", "phoneNumber", "emailAddress", "deliveryAddress", "order", "total", "totalAmount", "subtotal", "discount", "channel",
  "createdBy", "source", "status", "paymentStatus", "fulfillmentStatus", "requiresInstallation", "stockCommittedAt",
];
const orderParts = (body) => {
  const data = body?.data || {};
  return { message: body?.message, data: Object.fromEntries(ORDER_KEYS.filter((key) => key in data).map((key) => [key, data[key]])) };
};
// Express seeds a package catalog and the Worker does not: package bodies keep the fields this round owns.
const packageParts = (body) => ({
  message: body?.message,
  name: body?.data?.name,
  categoryId: body?.data?.categoryId,
  categoryRef: body?.data?.categoryRef,
});
const packageNames = (body) => ({ message: body?.message, names: (body?.data || []).map((pack) => pack.name).sort() });

export const runCommerceV3Scenario = async (client) => {
  const { transcript, expect, call } = recorder(client);
  const sales = await client.seedAdmin("sales");
  const ada = await client.seedAdmin("engineer", { name: "Ada Crew" });
  const bayo = await client.seedAdmin("engineer", { name: "Bayo Crew" });
  const chidi = await client.seedAdmin("engineer", { name: "Chidi Crew" });
  const retired = await client.seedAdmin("engineer", { name: "Retired Crew", isActive: false });

  // ---- catalogue ----------------------------------------------------------------------------------
  const product = async (label, body) => (await expect(label, "POST", "/admin/products", { body }, 201)).body.data;
  const inverter = await product("inverter", { sku: "V3-INV", name: "V3 Inverter", price: 150000, stockQuantity: 5 });
  const cable = await product("hidden cable", { sku: "V3-CBL", name: "V3 Cable", price: 2000, stockQuantity: 50, status: "hidden" });
  const battery = await product("scarce battery", { sku: "V3-BAT", name: "V3 Battery", price: 80000, stockQuantity: 2 });
  await expect("install package", "POST", "/admin/packages", {
    body: { legacyId: 9301, type: "tubular", name: "V3 Kit", kva: 2, load: "Lights", options: [{ name: "Standard", price: 400000, kits: "1 battery" }] },
    project: packageParts,
  }, 201, "Package created.");

  // ================================================================================================
  // §3 online product orders
  // ================================================================================================
  const productItem = (productId, quantity) => ({ type: "product", productId, quantity });
  const kitItem = { id: 9301, optionName: "Standard", quantity: 1 };

  // Shape validation.
  await expect("product item without productId", "POST", "/cart/quote", { token: null, body: { items: [{ type: "product", quantity: 1 }] } }, 400, "Invalid cart item.");
  await expect("product id too long", "POST", "/cart/quote", { token: null, body: { items: [productItem("x".repeat(65), 1)] } }, 400, "Invalid cart item.");
  await expect("product id not text", "POST", "/order", {
    token: null,
    body: { name: "Shape", phoneNumber: "08012345678", deliveryAddress: "1 Street", order: [{ type: "product", productId: 5 }] },
  }, 400, "Invalid order item.");
  await expect("product quantity over 100", "POST", "/cart/quote", { token: null, body: { items: [productItem(inverter.id, 101)] } }, 400, "Quantity must be a whole number from 1 to 100.");

  // Quote: active and in stock, hidden, short stock, unknown, mixed with a package.
  const quote = (
    await expect("mixed quote", "POST", "/cart/quote", {
      token: null,
      body: { items: [productItem(inverter.id, 2), productItem(cable.id, 1), productItem(battery.id, 3), kitItem, productItem("missing", 1)] },
    }, 200, "Cart quoted.")
  ).body.data;
  assert.deepEqual(quote.unavailable, [1, 2, 4]);
  assert.equal(quote.total, 700000);
  assert.deepEqual(quote.items[0], {
    type: "product", productId: inverter.id, sku: "V3-INV", slug: inverter.slug, name: "V3 Inverter", price: 150000, unitPrice: 150000, quantity: 2, lineTotal: 300000, available: true,
  });
  assert.deepEqual(quote.items[1], { available: false, message: "This item is no longer available." });
  assert.equal(quote.items[3].unitPrice, 400000);

  // Saved carts accept product lines and reject unavailable ones.
  const cart = (
    await expect("save a cart with a product", "POST", "/cart", {
      token: null,
      body: { sessionId: "v3-session", items: [kitItem, productItem(inverter.id, 1)] },
      project: (body) => ({ message: body?.message, items: body?.data?.items, total: body?.data?.total }),
    }, 201, "Cart saved.")
  ).body.data;
  assert.deepEqual(cart.items.map((line) => [line.type === "product" ? "product" : "package", line.lineTotal]), [["package", 400000], ["product", 150000]]);
  assert.equal(cart.total, 550000);
  await expect("save a cart with a hidden product", "POST", "/cart", { token: null, body: { sessionId: "v3-session", items: [productItem(cable.id, 1)] } }, 400, UNAVAILABLE);

  // Orders: hidden and short stock are rejected.
  const customer = { name: "Online Buyer", phoneNumber: "08012345678", deliveryAddress: "3 Online Road", emailAddress: "buyer@online.test" };
  await expect("order a hidden product", "POST", "/order", { token: null, body: { ...customer, order: [productItem(cable.id, 1)] } }, 400, UNAVAILABLE);
  await expect("order more than the stock", "POST", "/order", { token: null, body: { ...customer, order: [kitItem, productItem(battery.id, 3)] } }, 400, UNAVAILABLE);

  // Product-only order: snapshot, totals, no installation, stock untouched, email lines.
  client.emails.length = 0;
  const productOrderResponse = await expect("product-only order", "POST", "/order", {
    token: null,
    body: { ...customer, order: [productItem(inverter.id, 2), productItem(battery.id, 1)], total: "1" },
    project: orderParts,
  }, 201, "Order placed successfully.");
  const productOrder = productOrderResponse.body.data;
  assert.deepEqual(productOrder.order, [
    { type: "product", productId: inverter.id, sku: "V3-INV", name: "V3 Inverter", quantity: 2, unitPrice: 150000, lineTotal: 300000, typeLabel: "Product" },
    { type: "product", productId: battery.id, sku: "V3-BAT", name: "V3 Battery", quantity: 1, unitPrice: 80000, lineTotal: 80000, typeLabel: "Product" },
  ]);
  assert.deepEqual({ total: productOrder.total, totalAmount: productOrder.totalAmount, requiresInstallation: productOrder.requiresInstallation, channel: productOrder.channel }, {
    total: "₦380,000", totalAmount: 380000, requiresInstallation: false, channel: "website",
  });
  const orderEmail = client.emails.find((email) => email.subject === "You have a new order");
  assert.ok(orderEmail, "order email sent");
  assert.ok(orderEmail.html.includes("2 × V3 Inverter (V3-INV)"), "product line in the email");
  assert.ok(orderEmail.html.includes("₦150,000 x 2 = ₦300,000"), "product prices in the email");

  // Mixed order: package line first, then the product; installation needed.
  const mixed = (
    await expect("mixed order", "POST", "/order", { token: null, body: { ...customer, name: "Mixed Buyer", order: [kitItem, productItem(inverter.id, 1)] }, project: orderParts }, 201)
  ).body.data;
  assert.deepEqual(mixed.order.map((line) => [line.type, line.lineTotal]), [["package", 400000], ["product", 150000]]);
  assert.deepEqual({ totalAmount: mixed.totalAmount, requiresInstallation: mixed.requiresInstallation }, { totalAmount: 550000, requiresInstallation: true });
  const packageOnly = (await expect("package-only order", "POST", "/order", { token: null, body: { ...customer, name: "Kit Buyer", order: [kitItem] }, project: orderParts }, 201)).body.data;
  assert.equal(packageOnly.requiresInstallation, true);

  const stock = async (label) =>
    Object.fromEntries((await expect(label, "GET", "/admin/inventory?q=V3-", {}, 200)).body.data.items.map((row) => [row.sku, row.stockQuantity]));
  assert.deepEqual(await stock("placing orders leaves stock"), { "V3-BAT": 2, "V3-CBL": 50, "V3-INV": 5 });
  await expect("process the product order", "POST", `/admin/orders/${productOrder.id}/fulfillment`, { body: { status: "processing" }, project: orderParts }, 200);
  assert.deepEqual(await stock("processing commits product lines"), { "V3-BAT": 1, "V3-CBL": 50, "V3-INV": 3 });
  const movements = (await expect("product sale movements", "GET", "/admin/inventory/movements?reason=sale", {}, 200)).body.data;
  assert.deepEqual(
    movements.items.filter((movement) => movement.referenceId === productOrder.id).map((movement) => [movement.sku, movement.change]).sort(),
    [["V3-BAT", -1], ["V3-INV", -2]]
  );

  // ================================================================================================
  // §2 in-store sales: optional name and phone
  // ================================================================================================
  const sale = (overrides = {}) => ({ lines: [{ productId: cable.id, quantity: 1 }], fulfilment: "collected", paymentStatus: "paid", ...overrides });
  const walkIn = (await expect("in-store sale without a customer", "POST", "/admin/orders", { token: sales.token, body: sale(), project: orderParts }, 201, "Order created.")).body.data;
  assert.deepEqual({ name: walkIn.name, phoneNumber: walkIn.phoneNumber, emailAddress: walkIn.emailAddress }, { name: "Walk-in customer", phoneNumber: null, emailAddress: null });
  const blank = (
    await expect("in-store sale with blank name and phone", "POST", "/admin/orders", {
      token: sales.token,
      body: sale({ customer: { name: "   ", phoneNumber: "", emailAddress: "walkin@store.test" } }),
      project: orderParts,
    }, 201)
  ).body.data;
  assert.deepEqual({ name: blank.name, phoneNumber: blank.phoneNumber, emailAddress: blank.emailAddress }, { name: "Walk-in customer", phoneNumber: null, emailAddress: "walkin@store.test" });
  const named = (
    await expect("in-store sale with name only", "POST", "/admin/orders", { token: sales.token, body: sale({ customer: { name: " Tola " } }), project: orderParts }, 201)
  ).body.data;
  assert.deepEqual({ name: named.name, phoneNumber: named.phoneNumber }, { name: "Tola", phoneNumber: null });
  const reject = (label, body, text) => expect(label, "POST", "/admin/orders", { token: sales.token, body }, 400, text);
  await reject("given phone must be valid", sale({ customer: { phoneNumber: "123" } }), "Enter a valid phone number.");
  await reject("given name too long", sale({ customer: { name: "N".repeat(101) } }), "Name must be 100 characters or fewer.");
  await reject("customer must be an object", sale({ customer: "walk-in" }), "Customer is not valid.");
  await reject("later still needs an address", sale({ fulfilment: "later" }), "Delivery address is required for later fulfilment.");

  await call("walk-in audit", "GET", "/admin/audit-logs?entity=order&limit=100", {
    project: (body) => ({ summaries: body.data.items.filter((item) => item.entityId === walkIn.id).map((item) => item.summary).sort() }),
  });
  assert.deepEqual(transcript.at(-1).body.summaries, ["In-store order for Walk-in customer: 1 item, ₦2,000", "Order from Walk-in customer: fulfilment pending → delivered"]);
  await call("walk-in notification", "GET", "/admin/notifications?type=new_order&limit=100", {
    project: (body) => ({ messages: body.data.items.filter((item) => item.entityId === walkIn.id).map((item) => item.message) }),
  });
  assert.deepEqual(transcript.at(-1).body.messages, ["In-store order for Walk-in customer of ₦2,000."]);

  // ================================================================================================
  // §4 package categories
  // ================================================================================================
  const category = async (label, body) => (await expect(label, "POST", "/admin/categories", { body }, 201)).body.data;
  const power = await category("root category", { name: "V3 Power", slug: "v3-power" });
  const inverters = await category("child category", { name: "V3 Inverters", slug: "v3-inverters", parentId: power.id });
  const dormant = await category("inactive category", { name: "V3 Dormant", slug: "v3-dormant", isActive: false });

  const kit = (legacyId, name, extra = {}) => ({
    legacyId, type: "lithium", name, kva: 5, load: "Fridge", options: [{ name: "Standard", price: 500000, kits: "2 batteries" }], ...extra,
  });
  await expect("unknown package category", "POST", "/admin/packages", { body: kit(9310, "V3 Bad Category", { categoryId: "missing" }) }, 400, "Category not found.");
  await expect("category must be text", "POST", "/admin/packages", { body: kit(9310, "V3 Bad Category", { categoryId: 7 }) }, 400, "Category must be text.");
  const child = (await expect("package in the child category", "POST", "/admin/packages", { body: kit(9311, "V3 Child Kit", { categoryId: inverters.id }), project: packageParts }, 201)).body.data;
  assert.deepEqual({ categoryId: child.categoryId, categoryRef: child.categoryRef }, {
    categoryId: inverters.id, categoryRef: { id: inverters.id, slug: "v3-inverters", name: "V3 Inverters" },
  });
  const noCategory = (await expect("package without a category", "POST", "/admin/packages", { body: kit(9312, "V3 Root Kit"), project: packageParts }, 201)).body.data;
  assert.deepEqual({ categoryId: noCategory.categoryId, categoryRef: noCategory.categoryRef }, { categoryId: null, categoryRef: null });
  const rooted = (await expect("set the root category", "PUT", "/admin/packages/9312", { body: kit(9312, "V3 Root Kit", { categoryId: power.id }), project: packageParts }, 200)).body.data;
  assert.equal(rooted.categoryRef.name, "V3 Power");
  const kept = (await expect("update without categoryId keeps it", "PUT", "/admin/packages/9312", { body: kit(9312, "V3 Root Kit"), project: packageParts }, 200)).body.data;
  assert.equal(kept.categoryId, power.id);
  const cleared = (await expect("categoryId null clears it", "PUT", "/admin/packages/9311", { body: kit(9311, "V3 Child Kit", { categoryId: null }), project: packageParts }, 200)).body.data;
  assert.equal(cleared.categoryRef, null);
  await expect("restore the child category", "PUT", "/admin/packages/9311", { body: kit(9311, "V3 Child Kit", { categoryId: inverters.id }), project: packageParts }, 200);
  await expect("package in an inactive category", "POST", "/admin/packages", { body: kit(9313, "V3 Dormant Kit", { categoryId: dormant.id }), project: packageParts }, 201);

  const publicChild = (await expect("public package categoryRef", "GET", "/packages/9311", { token: null, project: packageParts }, 200)).body.data;
  assert.deepEqual(publicChild.categoryRef, { id: inverters.id, slug: "v3-inverters", name: "V3 Inverters" });
  const publicDormant = (await expect("inactive category hidden publicly", "GET", "/packages/9313", { token: null, project: packageParts }, 200)).body.data;
  assert.deepEqual({ categoryId: publicDormant.categoryId, categoryRef: publicDormant.categoryRef }, { categoryId: dormant.id, categoryRef: null });
  await expect("admin sees the inactive category", "GET", "/admin/packages", {
    project: (body) => ({ ref: body.data.find((pack) => pack.name === "V3 Dormant Kit")?.categoryRef }),
  }, 200);
  assert.deepEqual(transcript.at(-1).body.ref, { id: dormant.id, slug: "v3-dormant", name: "V3 Dormant" });

  await expect("filter by root slug includes descendants", "GET", "/packages?category=v3-power", { token: null, project: packageNames }, 200, "Packages retrieved.");
  assert.deepEqual(transcript.at(-1).body.names, ["V3 Child Kit", "V3 Root Kit"]);
  await expect("filter by child id", "GET", `/packages?category=${inverters.id}`, { token: null, project: packageNames }, 200);
  assert.deepEqual(transcript.at(-1).body.names, ["V3 Child Kit"]);
  await expect("unknown category filter", "GET", "/packages?category=nothing-here", { token: null }, 200);
  assert.deepEqual(transcript.at(-1).body.data, []);
  await expect("inactive category filter", "GET", "/packages?category=v3-dormant", { token: null }, 200);
  assert.deepEqual(transcript.at(-1).body.data, []);
  await call("no filter keeps every package", "GET", "/packages", {
    token: null,
    project: (body) => ({ names: body.data.map((pack) => pack.name).filter((name) => name.startsWith("V3 ")).sort() }),
  });
  assert.deepEqual(transcript.at(-1).body.names, ["V3 Child Kit", "V3 Dormant Kit", "V3 Kit", "V3 Root Kit"]);

  await expect("category used by a package", "DELETE", `/admin/categories/${dormant.id}`, {}, 409, "Category has subcategories, products or packages.");
  await expect("delete the package", "DELETE", "/admin/packages/9313", { project: message }, 200);
  await expect("unused category can be deleted", "DELETE", `/admin/categories/${dormant.id}`, {}, 200, "Category deleted.");

  // ================================================================================================
  // §1 installation crews and one job per order
  // ================================================================================================
  const jobs = "/admin/jobs";
  const placeKitOrder = async (label, name) =>
    (await expect(label, "POST", "/order", { token: null, body: { ...customer, name, order: [kitItem] }, project: message }, 201)).body.data;
  const order1 = await placeKitOrder("crew order 1", "Crew One");
  const order2 = await placeKitOrder("crew order 2", "Crew Two");
  const order3 = await placeKitOrder("crew order 3", "Crew Three");
  const order4 = await placeKitOrder("crew order 4", "Crew Four");

  // Validation.
  const createJob = (label, body, status, text) => expect(label, "POST", jobs, { body }, status, text);
  await createJob("engineers must be a list", { orderId: order1.id, engineerIds: ada.id }, 400, "Engineers must be a list.");
  await createJob("at most 10 engineers", { orderId: order1.id, engineerIds: Array.from({ length: 11 }, (_, index) => `engineer-${index}`) }, 400, "A job can have at most 10 engineers.");
  await createJob("duplicate engineers", { orderId: order1.id, engineerIds: [ada.id, bayo.id, ada.id] }, 400, "Each engineer can be added once.");
  await createJob("crew with a sales rep", { orderId: order1.id, engineerIds: [ada.id, sales.id] }, 400, ASSIGNEE);
  await createJob("crew with an inactive engineer", { orderId: order1.id, engineerIds: [retired.id] }, 400, ASSIGNEE);
  await createJob("crew with a blank id", { orderId: order1.id, engineerIds: [""] }, 400, ASSIGNEE);
  await createJob("installation still required", { orderId: productOrder.id, engineerIds: [ada.id] }, 409, "Order does not require installation.");

  // Create with a crew: lead first.
  const job1 = (await createJob("create with a crew", { orderId: order1.id, engineerIds: [ada.id, bayo.id], engineerId: chidi.id }, 201, "Job created.")).body.data;
  assert.deepEqual(
    { status: job1.status, engineerIds: job1.engineerIds, engineerId: job1.engineerId, lead: job1.engineer?.name, crew: job1.engineers.map((engineer) => Object.keys(engineer).sort().join()) },
    { status: "assigned", engineerIds: [ada.id, bayo.id], engineerId: ada.id, lead: "Ada Crew", crew: ["email,id,name,phone", "email,id,name,phone"] }
  );
  assert.deepEqual(job1.engineers.map((engineer) => engineer.name), ["Ada Crew", "Bayo Crew"]);
  await createJob("one job per order", { orderId: order1.id }, 409, ORDER_HAS_JOB);
  const order1View = (await expect("order detail lists the crew", "GET", `/admin/orders/${order1.id}`, { project: (body) => ({ jobs: body.data.jobs.map((job) => ({ status: job.status, crew: job.engineerIds.length })) }) }, 200)).body.data;
  assert.deepEqual(order1View.jobs.map((job) => job.engineerIds), [[ada.id, bayo.id]]);
  assert.equal(order1View.assignedEngineerId, ada.id, "the lead becomes the order engineer");

  // Legacy engineerId is ignored when engineerIds is sent.
  const job2 = (await createJob("engineerIds wins over engineerId", { orderId: order2.id, engineerIds: [], engineerId: ada.id }, 201)).body.data;
  assert.deepEqual({ status: job2.status, engineerIds: job2.engineerIds, engineer: job2.engineer, engineers: job2.engineers }, { status: "unassigned", engineerIds: [], engineer: null, engineers: [] });

  // Update: new lead, one engineer removed, one added.
  const update = (label, id, body, status, text) => expect(label, "PUT", `${jobs}/${id}`, { body }, status, text);
  await update("update with duplicate engineers", job1.id, { engineerIds: [bayo.id, bayo.id] }, 400, "Each engineer can be added once.");
  await update("update with a non-engineer", job1.id, { engineerIds: [bayo.id, sales.id] }, 400, ASSIGNEE);
  const reworked = (await update("update the crew", job1.id, { engineerIds: [bayo.id, chidi.id] }, 200, "Job updated.")).body.data;
  assert.deepEqual({ engineerId: reworked.engineerId, names: reworked.engineers.map((engineer) => engineer.name) }, { engineerId: bayo.id, names: ["Bayo Crew", "Chidi Crew"] });
  const sameCrew = (await update("same crew is a no-op", job1.id, { engineerIds: [bayo.id, chidi.id], notes: "Bring ladder" }, 200)).body.data;
  assert.equal(sameCrew.notes, "Bring ladder");

  // Assign endpoint: list, legacy id, empty list.
  const assign = (label, id, body, status, text) => expect(label, "POST", `${jobs}/${id}/assign`, { token: sales.token, body }, status, text);
  await assign("assign without engineers", job2.id, {}, 400, ASSIGNEE);
  const crewed = (await assign("assign a crew", job2.id, { engineerIds: [ada.id, chidi.id] }, 200, "Job assigned.")).body.data;
  assert.deepEqual({ status: crewed.status, names: crewed.engineers.map((engineer) => engineer.name) }, { status: "assigned", names: ["Ada Crew", "Chidi Crew"] });
  const legacy = (await assign("assign with the legacy engineerId", job2.id, { engineerId: bayo.id }, 200, "Job assigned.")).body.data;
  assert.deepEqual(legacy.engineerIds, [bayo.id]);
  const emptied = (await assign("assign an empty crew", job2.id, { engineerIds: [] }, 200, "Job unassigned.")).body.data;
  assert.deepEqual({ status: emptied.status, engineerIds: emptied.engineerIds, engineerId: emptied.engineerId }, { status: "unassigned", engineerIds: [], engineerId: null });

  // Notifications: only newly added engineers, once per addition.
  const assignedCount = async (label, engineer) =>
    (await expect(label, "GET", "/admin/notifications?type=job_assigned&limit=100", { token: engineer.token, project: (body) => ({ total: body.data.total }) }, 200)).body.data.total;
  // ada: create job1, assign job2. bayo: create job1, legacy assign job2. chidi: job1 update, assign job2.
  assert.equal(await assignedCount("ada notifications", ada), 2);
  assert.equal(await assignedCount("bayo notifications", bayo), 2);
  assert.equal(await assignedCount("chidi notifications", chidi), 2);

  // Audit lists the crew's emails.
  await call("crew audit", "GET", "/admin/audit-logs?entity=job&limit=100", {
    project: (body) => ({ summaries: body.data.items.filter((item) => item.action === "job.assign").map((item) => item.summary).sort() }),
  });
  assert.deepEqual(transcript.at(-1).body.summaries, [
    "Job for Crew One: engineers " + `${ada.email}, ${bayo.email}`,
    "Job for Crew One: engineers " + `${bayo.email}, ${chidi.email}`,
    "Job for Crew Two: engineers " + `${ada.email}, ${chidi.email}`,
    "Job for Crew Two: engineers " + `${bayo.email}`,
    "Job for Crew Two: no engineers",
  ].sort());

  // Filters and engineer scoping with a crew.
  await expect("filter by a crew member", "GET", `${jobs}?engineerId=${chidi.id}`, { project: (body) => ({ total: body.data.total }) }, 200);
  assert.equal(transcript.at(-1).body.total, 1);
  await expect("filter by a removed engineer", "GET", `${jobs}?engineerId=${ada.id}`, { project: (body) => ({ total: body.data.total }) }, 200);
  assert.equal(transcript.at(-1).body.total, 0);
  const mine = "/admin/me/jobs";
  const chidiJobs = (await expect("crew member lists the job", "GET", mine, { token: chidi.token }, 200)).body.data;
  assert.deepEqual(chidiJobs.items.map((job) => job.id), [job1.id]);
  await expect("removed engineer cannot read the job", "GET", `${mine}/${job1.id}`, { token: ada.token }, 404, "Job not found.");
  await expect("crew member reads the job", "GET", `${mine}/${job1.id}`, { token: chidi.token, project: (body) => ({ names: body.data.engineers.map((engineer) => engineer.name) }) }, 200);
  await expect("crew member starts the job", "POST", `${mine}/${job1.id}/status`, { token: chidi.token, body: { status: "in_progress" } }, 200, "Job status updated.");
  await update("started job keeps its crew", job1.id, { engineerIds: [ada.id] }, 409, "Cannot change job status from in_progress to assigned.");
  await assign("started job cannot be reassigned", job1.id, { engineerIds: [] }, 409, "Cannot change job status from in_progress to unassigned.");
  await expect("staff open jobs count crews", "GET", `/admin/staff/${chidi.id}`, { project: (body) => ({ openJobs: body.data.openJobs }) }, 200);
  assert.equal(transcript.at(-1).body.openJobs, 1);

  // One job per order: a cancelled job makes room; the order engineer seeds a job without engineers.
  await expect("order engineer for order 3", "POST", `/admin/orders/${order3.id}/assign-engineer`, { body: { engineerId: ada.id }, project: message }, 200, "Engineer assigned.");
  const seeded = (await createJob("job starts with the order engineer", { orderId: order3.id }, 201)).body.data;
  assert.deepEqual({ status: seeded.status, engineerIds: seeded.engineerIds }, { status: "assigned", engineerIds: [ada.id] });
  await createJob("second job for order 3", { orderId: order3.id, engineerIds: [] }, 409, ORDER_HAS_JOB);
  await expect("cancel the order 3 job", "POST", `${jobs}/${seeded.id}/status`, { body: { status: "cancelled" } }, 200, "Job status updated.");
  const replacement = (await createJob("cancelled job allows a new one", { orderId: order3.id, engineerIds: [] }, 201)).body.data;
  assert.deepEqual({ status: replacement.status, engineerIds: replacement.engineerIds }, { status: "unassigned", engineerIds: [] }, "an explicit empty crew skips the order engineer");

  // Read-time migration: a job stored before crews.
  const stored = await client.seedRecord("installationJobs", {
    orderId: order4.id, engineerId: bayo.id, scheduledAt: null, durationEstimateMinutes: null, address: "Old Street", status: "assigned",
    checklist: [], photos: [], notes: null, completionNotes: null, startedAt: null, completedAt: null, cancelledAt: null,
  });
  const migrated = (await expect("legacy job reads as a crew of one", "GET", `${jobs}/${stored.id}`, {}, 200)).body.data;
  assert.deepEqual({ engineerIds: migrated.engineerIds, names: migrated.engineers.map((engineer) => engineer.name) }, { engineerIds: [bayo.id], names: ["Bayo Crew"] });
  await expect("legacy job is in the lead's list", "GET", mine, { token: bayo.token, project: (body) => ({ total: body.data.total }) }, 200);
  assert.equal(transcript.at(-1).body.total, 2);
  await createJob("legacy job counts for one job per order", { orderId: order4.id }, 409, ORDER_HAS_JOB);
  const persisted = (await update("next write keeps the crew", stored.id, { notes: "Migrated" }, 200, "Job updated.")).body.data;
  assert.deepEqual(persisted.engineerIds, [bayo.id]);
  const added = (await update("add to the legacy crew", stored.id, { engineerIds: [bayo.id, ada.id] }, 200)).body.data;
  assert.deepEqual(added.engineerIds, [bayo.id, ada.id]);
  // ada: 2 above, the job seeded from the order engineer, and this addition.
  assert.equal(await assignedCount("ada notified for the legacy job", ada), 4);
  assert.equal(await assignedCount("bayo not notified again", bayo), 2);

  return transcript;
};
