// Commerce v2 (docs/agents/COMMERCE_V2.md §1–§2): composed package pricing, public markup
// hiding, order line snapshots (CO-04), cancel after a product is deleted (CO-01), in-store
// orders (collected, shortfall, later, discount validation, channel filter) and the
// orders:create capability. Runtime-agnostic scenario; returns the transcript for parity.
import assert from "node:assert/strict";
import { STATIC_TOKEN, recorder } from "./opsKit.js";
import { allowedFulfillmentTransitions } from "../../shared/orders.js";

const FORBIDDEN = "You do not have permission to perform this action.";
const UNAVAILABLE = "Some items in your cart are no longer available. Please refresh your cart.";

// Express seeds a package catalog and the Worker does not: package bodies are compared on the
// fields this module owns.
const packageParts = (body) => ({ message: body?.message, options: body?.data?.options });
const publicParts = (body) => ({ message: body?.message, id: body?.data?.id, name: body?.data?.name, options: body?.data?.options });
// Order bodies: the Worker stores a sortOrder, and receivedAt/createdAt are masked anyway.
const orderParts = (body) => {
  const data = body?.data || {};
  const pick = [
    "name", "phoneNumber", "emailAddress", "deliveryAddress", "order", "total", "totalAmount", "subtotal", "discount", "channel",
    "createdBy", "source", "status", "paymentStatus", "paidAt", "fulfillmentStatus", "requiresInstallation", "stockCommittedAt", "note",
  ];
  return { message: body?.message, details: body?.details, data: Object.fromEntries(pick.filter((key) => key in data).map((key) => [key, data[key]])) };
};
const names = (body) => ({ message: body?.message, names: (body?.data || []).map((order) => order.name).sort() });

export const runCommerceScenario = async (client) => {
  const { transcript, expect, call } = recorder(client);
  const roles = {};
  for (const role of ["superadmin", "admin", "inventory", "sales", "engineer", "hr", "support"]) roles[role] = await client.seedAdmin(role);

  // ---- products -------------------------------------------------------------------------------
  const product = async (label, body) => (await expect(label, "POST", "/admin/products", { body }, 201)).body.data;
  const inverter = await product("inverter", { sku: "COM-INV", name: "Commerce Inverter", price: 100000, stockQuantity: 10, brand: "Felicity", attributes: { capacity: 5 } });
  const battery = await product("battery", { sku: "COM-BAT", name: "Commerce Battery", price: 50000, stockQuantity: 10 });
  const panel = await product("panel", { sku: "COM-PNL", name: "Commerce Panel", price: 20000, stockQuantity: 1 });
  const hidden = await product("hidden product", { sku: "COM-HID", name: "Commerce Cable", price: 5000, stockQuantity: 10, status: "hidden" });
  const archived = await product("archived product", { sku: "COM-ARC", name: "Commerce Old", price: 7000, stockQuantity: 10, status: "archived" });
  const scarce = await product("scarce product", { sku: "COM-SCR", name: "Commerce Scarce", price: 9000, stockQuantity: 1 });
  const temp = await product("temporary product", { sku: "COM-TMP", name: "Commerce Temp", price: 3000, stockQuantity: 5 });

  // ---- composed package ---------------------------------------------------------------------------
  const packageBody = {
    legacyId: 9101,
    type: "lithium",
    name: "Commerce Kit",
    kva: 5,
    load: "Fridge",
    options: [
      { name: "Without solar", priceAdjustment: 5000, price: 1, kits: "ignored", items: [{ productId: inverter.id, quantity: 1 }, { productId: battery.id, quantity: 2, note: "Stacked" }] },
      {
        name: "With solar",
        priceAdjustment: -10000,
        items: [{ productId: inverter.id, quantity: 1 }, { productId: battery.id, quantity: 2 }, { productId: panel.id, quantity: 2 }],
      },
    ],
  };
  const created = (await expect("create composed package", "POST", "/admin/packages", { body: packageBody, project: packageParts }, 201, "Package created.")).body.data;
  const [without, withSolar] = created.options;
  assert.deepEqual(
    { ...without, items: undefined },
    { name: "Without solar", composed: true, productsTotal: 200000, priceAdjustment: 5000, price: 205000, available: true, inStock: true, kits: "1 × Commerce Inverter, 2 × Commerce Battery", items: undefined }
  );
  assert.deepEqual(without.items[1], {
    productId: battery.id, quantity: 2, note: "Stacked", name: "Commerce Battery", slug: battery.slug, sku: "COM-BAT", brand: null, categoryId: null, attributes: {}, unitPrice: 50000, lineTotal: 100000,
  });
  assert.deepEqual(
    { productsTotal: withSolar.productsTotal, priceAdjustment: withSolar.priceAdjustment, price: withSolar.price, available: withSolar.available, inStock: withSolar.inStock },
    { productsTotal: 240000, priceAdjustment: -10000, price: 230000, available: true, inStock: false },
    "negative adjustment; the panel is short"
  );

  // Write validation.
  const invalid = (label, options, message, extra = {}) =>
    expect(label, "POST", "/admin/packages", { body: { ...packageBody, legacyId: undefined, name: `Bad ${label}`, options, ...extra } }, 400, message);
  await invalid("duplicate product in an option", [{ name: "A", items: [{ productId: inverter.id, quantity: 1 }, { productId: inverter.id, quantity: 2 }] }], "Each product can appear once per option.");
  await invalid("archived product in an option", [{ name: "A", items: [{ productId: archived.id, quantity: 1 }] }], "Archived products can't be added to a package.");
  await invalid("unknown product in an option", [{ name: "A", items: [{ productId: "missing", quantity: 1 }] }], "Product not found.");
  await invalid("composed price not positive", [{ name: "Cheap", priceAdjustment: -200000, items: [{ productId: inverter.id, quantity: 1 }] }], "Option Cheap price must be greater than 0.");
  await invalid("duplicate option names", [{ name: "A", price: 5, kits: "x" }, { name: "a", price: 6, kits: "y" }], "Option names must be unique.");
  await invalid("fractional adjustment", [{ name: "A", priceAdjustment: 1.5, items: [{ productId: inverter.id, quantity: 1 }] }], "Price adjustment must be a whole number from -1,000,000,000 to 1,000,000,000.");
  await invalid("top-level items with a manual option", [{ name: "A", price: 5, kits: "x" }], "Add products to each option instead of the package.", {
    items: [{ productId: inverter.id, quantity: 1 }],
  });
  await expect("hidden products can be components", "POST", "/admin/packages", {
    body: { ...packageBody, legacyId: undefined, name: "Cable Kit", options: [{ name: "Only", items: [{ productId: hidden.id, quantity: 3 }] }] },
    project: packageParts,
  }, 201);

  // Public responses hide the markup.
  const publicKit = (await expect("public package", "GET", "/packages/9101", { token: null, project: publicParts }, 200, "Package retrieved.")).body.data;
  assert.deepEqual(publicKit.options.map((option) => Object.keys(option).sort()), [
    ["available", "composed", "inStock", "items", "kits", "name", "price"],
    ["available", "composed", "inStock", "items", "kits", "name", "price"],
  ]);
  assert.deepEqual(Object.keys(publicKit.options[0].items[0]).sort(), ["attributes", "brand", "categoryId", "name", "note", "productId", "quantity", "sku", "slug"]);
  assert.deepEqual(publicKit.options[0].items[0].attributes, { capacity: 5 });
  assert.equal("items" in publicKit, false);
  const listed = (
    await expect("public package list", "GET", "/packages", { token: null, project: (body) => ({ kit: body.data.find((pack) => pack.name === "Commerce Kit") }) }, 200)
  ).body.data.find((pack) => pack.name === "Commerce Kit");
  assert.deepEqual(listed.options, publicKit.options);
  assert.equal(JSON.stringify(listed).includes("priceAdjustment") || JSON.stringify(listed).includes("unitPrice"), false);

  // Quotes and product price changes.
  const quote = (label) =>
    expect(label, "POST", "/cart/quote", { token: null, body: { items: [{ id: 9101, optionName: "Without solar", quantity: 1 }, { id: 9101, optionName: "With solar", quantity: 1 }] } }, 200, "Cart quoted.");
  const firstQuote = (await quote("quote with computed prices")).body.data;
  assert.deepEqual(firstQuote.items.map((line) => line.unitPrice), [205000, 230000]);
  assert.equal(firstQuote.total, 435000);
  await expect("battery price change", "PUT", `/admin/products/${battery.id}`, { body: { price: 60000 } }, 200);
  const repriced = (await expect("price change propagates", "GET", "/packages/9101", { token: null, project: publicParts }, 200)).body.data;
  assert.deepEqual(repriced.options.map((option) => option.price), [225000, 250000]);
  assert.equal((await quote("quote after price change")).body.data.total, 475000);

  // Archiving a component makes the option unavailable (and it can't be priced).
  await expect("archive the panel", "PUT", `/admin/products/${panel.id}`, { body: { status: "archived" } }, 200);
  const archivedView = (await expect("option with an archived product", "GET", "/packages/9101", { token: null, project: publicParts }, 200)).body.data;
  assert.deepEqual(archivedView.options.map((option) => option.available), [true, false]);
  const partialQuote = (await quote("quote with an unavailable option")).body.data;
  assert.deepEqual(partialQuote.unavailable, [1]);
  await expect("order an unavailable option", "POST", "/order", {
    token: null,
    body: { name: "Nope", phoneNumber: "08012345678", deliveryAddress: "1 Street", order: [{ id: 9101, optionName: "With solar", quantity: 1 }] },
  }, 400, UNAVAILABLE);
  await expect("product used by an option", "DELETE", `/admin/products/${inverter.id}`, {}, 409, "Product is used by a package.");

  // Read-time migration of the deprecated top-level items.
  await client.seedRecord("packages", {
    legacyId: 9102, type: "lithium", name: "Legacy Items Kit", slug: "legacy-items-kit", kva: 3, load: "TV", volt: null, sortOrder: 900,
    options: [{ name: "Without solar", price: 1000, kits: "manual" }],
    items: [{ productId: battery.id, quantity: 1, note: null }],
  });
  const migrated = (await expect("legacy top-level items read per option", "GET", "/packages/9102", { token: null, project: publicParts }, 200)).body.data;
  assert.deepEqual(
    { composed: migrated.options[0].composed, price: migrated.options[0].price, kits: migrated.options[0].kits },
    { composed: true, price: 60000, kits: "1 × Commerce Battery" }
  );

  // ---- website order snapshot (CO-04) ---------------------------------------------------------------
  const placed = (
    await expect("website order", "POST", "/order", {
      token: null,
      body: { name: "Web Buyer", phoneNumber: "08012345678", deliveryAddress: "1 Web Street", order: [{ id: 9101, optionName: "Without solar", quantity: 2 }] },
      project: orderParts,
    }, 201, "Order placed successfully.")
  ).body.data;
  assert.equal(placed.totalAmount, 450000);
  assert.equal(placed.channel, "website");
  const line = placed.order[0];
  assert.deepEqual(
    { type: line.type, typeLabel: line.typeLabel, productsTotal: line.productsTotal, priceAdjustment: line.priceAdjustment, unitPrice: line.unitPrice, components: line.components },
    {
      type: "package", typeLabel: "Inverter + lithium", productsTotal: 220000, priceAdjustment: 5000, unitPrice: 225000,
      components: [
        { productId: inverter.id, sku: "COM-INV", name: "Commerce Inverter", quantity: 1, unitPrice: 100000 },
        { productId: battery.id, sku: "COM-BAT", name: "Commerce Battery", quantity: 2, unitPrice: 60000 },
      ],
    }
  );
  const webView = (await expect("website order defaults", "GET", `/admin/orders/${placed.id}`, { project: orderParts }, 200)).body.data;
  assert.deepEqual({ channel: webView.channel, subtotal: webView.subtotal, discount: webView.discount, createdBy: webView.createdBy }, { channel: "website", subtotal: null, discount: null, createdBy: null });

  await expect("recompose the package", "PUT", "/admin/packages/9101", {
    body: { ...packageBody, options: [{ name: "Without solar", items: [{ productId: inverter.id, quantity: 3 }] }] },
    project: packageParts,
  }, 200, "Package updated.");
  await expect("process the website order", "POST", `/admin/orders/${placed.id}/fulfillment`, { body: { status: "processing" }, project: orderParts }, 200);
  const webSales = (await expect("snapshot quantities committed", "GET", `/admin/inventory/movements?reason=sale`, {}, 200)).body.data;
  assert.deepEqual(
    webSales.items.filter((movement) => movement.referenceId === placed.id).map((movement) => [movement.sku, movement.change]),
    [["COM-BAT", -4], ["COM-INV", -2]]
  );

  // ---- orders:create per role ----------------------------------------------------------------------------
  for (const [role, admin] of Object.entries(roles)) {
    const allowed = ["superadmin", "admin", "sales"].includes(role);
    await expect(`orders:create as ${role}`, "POST", "/admin/orders", { token: admin.token, body: {} }, allowed ? 400 : 403, allowed ? "Name is required." : FORBIDDEN);
  }
  const salesSession = await call("sales capabilities", "GET", "/admin/auth/me", { token: roles.sales.token, project: (body) => ({ has: body.data.admin.capabilities.includes("orders:create") }) });
  assert.ok(salesSession.body.data.admin.capabilities.includes("orders:create"));

  // ---- in-store validation --------------------------------------------------------------------------------------
  const customer = { name: "Store Buyer", phoneNumber: "08023456789" };
  const inStore = (overrides) => ({ customer, lines: [{ productId: inverter.id, quantity: 1 }], fulfilment: "collected", paymentStatus: "paid", ...overrides });
  const reject = (label, body, message) => expect(label, "POST", "/admin/orders", { token: roles.sales.token, body }, 400, message);
  await reject("no lines", inStore({ lines: [] }), "Add at least one product.");
  await reject("duplicate lines", inStore({ lines: [{ productId: inverter.id, quantity: 1 }, { productId: inverter.id, quantity: 1 }] }), "Each product can appear once per order.");
  await reject("zero quantity", inStore({ lines: [{ productId: inverter.id, quantity: 0 }] }), "Quantity must be a whole number from 1 to 1,000.");
  await reject("unknown product", inStore({ lines: [{ productId: "missing", quantity: 1 }] }), "Product not found.");
  await reject("archived product", inStore({ lines: [{ productId: archived.id, quantity: 1 }] }), "Archived products can't be sold.");
  await reject("bad phone", inStore({ customer: { name: "X", phoneNumber: "12" } }), "Enter a valid phone number.");
  await reject("bad email", inStore({ customer: { ...customer, emailAddress: "nope" } }), "A valid email address is required.");
  await reject("bad fulfilment", inStore({ fulfilment: "shipped" }), "Fulfilment is not valid.");
  await reject("bad payment status", inStore({ paymentStatus: "refunded" }), "Payment status is not valid.");
  await reject("installation needs later", inStore({ requiresInstallation: true }), "Installation requires a later fulfilment.");
  await reject("later needs an address", inStore({ fulfilment: "later" }), "Delivery address is required for later fulfilment.");
  await reject("discount over subtotal", inStore({ discount: { amount: 100001, reason: "Too much" } }), "Discount can't be more than the subtotal.");
  await reject("discount without reason", inStore({ discount: { amount: 500 } }), "Discount reason is required.");
  await reject("discount reason too short", inStore({ discount: { amount: 500, reason: "ok" } }), "Discount reason must be at least 3 characters.");
  await reject("negative discount", inStore({ discount: { amount: -1, reason: "Refund" } }), "Discount amount must be a whole number from 0 to 1,000,000,000,000.");
  await reject("fractional discount", inStore({ discount: { amount: 1.5, reason: "Rounding" } }), "Discount amount must be a whole number.");

  // ---- in-store collected ----------------------------------------------------------------------------------------
  const collected = (
    await expect("collected sale", "POST", "/admin/orders", {
      token: roles.sales.token,
      body: inStore({
        customer: { ...customer, emailAddress: "Buyer@Store.test" },
        lines: [{ productId: inverter.id, quantity: 2 }, { productId: hidden.id, quantity: 1 }],
        discount: { amount: 10000, reason: "Loyal customer" },
        note: "Paid by transfer",
      }),
      project: orderParts,
    }, 201, "Order created.")
  ).body.data;
  assert.deepEqual(
    {
      order: collected.order, subtotal: collected.subtotal, discount: collected.discount, totalAmount: collected.totalAmount, total: collected.total,
      channel: collected.channel, createdBy: collected.createdBy, status: collected.status, fulfillmentStatus: collected.fulfillmentStatus,
      paymentStatus: collected.paymentStatus, emailAddress: collected.emailAddress, deliveryAddress: collected.deliveryAddress, note: collected.note,
      requiresInstallation: collected.requiresInstallation,
    },
    {
      order: [
        { type: "product", productId: inverter.id, sku: "COM-INV", name: "Commerce Inverter", quantity: 2, unitPrice: 100000, lineTotal: 200000 },
        { type: "product", productId: hidden.id, sku: "COM-HID", name: "Commerce Cable", quantity: 1, unitPrice: 5000, lineTotal: 5000 },
      ],
      subtotal: 205000, discount: { amount: 10000, reason: "Loyal customer" }, totalAmount: 195000, total: "₦195,000",
      channel: "in_store", createdBy: { id: roles.sales.id, email: roles.sales.email }, status: "completed", fulfillmentStatus: "delivered",
      paymentStatus: "paid", emailAddress: "buyer@store.test", deliveryAddress: null, note: "Paid by transfer", requiresInstallation: false,
    }
  );
  assert.ok(collected.stockCommittedAt && collected.paidAt);
  const collectedId = (await client.request("GET", "/admin/orders?channel=in_store", { token: STATIC_TOKEN })).body.data[0].id;
  const stockAfterSale = (await expect("stock after collected sale", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data;
  const stockOf = (page) => Object.fromEntries(page.items.map((row) => [row.sku, row.stockQuantity]));
  assert.deepEqual(stockOf(stockAfterSale), { "COM-ARC": 10, "COM-BAT": 6, "COM-HID": 9, "COM-INV": 6, "COM-PNL": 1, "COM-SCR": 1, "COM-TMP": 5 });
  const collectedSales = (await expect("collected sale movements", "GET", "/admin/inventory/movements?reason=sale", {}, 200)).body.data;
  assert.deepEqual(
    collectedSales.items.filter((movement) => movement.referenceId === collectedId).map((movement) => [movement.sku, movement.change, movement.referenceType]),
    [["COM-HID", -1, "order"], ["COM-INV", -2, "order"]]
  );

  const audits = await call("in-store audit", "GET", "/admin/audit-logs?entity=order&limit=100", {
    project: (body) => ({ entries: body.data.items.filter((item) => item.entityId === collectedId).map((item) => [item.action, item.summary]).sort() }),
  });
  assert.deepEqual(
    audits.body.data.items.filter((item) => item.entityId === collectedId).map((item) => [item.action, item.summary]).sort(),
    [
      ["order.create", "In-store order for Store Buyer: 3 items, ₦195,000; discount ₦10,000 (Loyal customer)"],
      ["order.fulfillment_change", "Order from Store Buyer: fulfilment pending → delivered"],
    ]
  );
  const notifications = await call("new_order notification", "GET", "/admin/notifications?type=new_order", {
    project: (body) => ({ items: body.data.items.map((item) => ({ message: item.message, data: item.data })) }),
  });
  assert.deepEqual(
    notifications.body.data.items.map((item) => item.data).sort((a, b) => a.channel.localeCompare(b.channel)),
    [{ channel: "in_store" }, { channel: "website" }]
  );

  // ---- shortfall: 409 and no order ----------------------------------------------------------------------------
  const short = await expect("collected shortfall", "POST", "/admin/orders", {
    token: roles.sales.token,
    body: inStore({ lines: [{ productId: scarce.id, quantity: 5 }, { productId: battery.id, quantity: 1 }] }),
  }, 409, "Insufficient stock to process this order.");
  assert.deepEqual(short.body.details, [{ productId: scarce.id, sku: "COM-SCR", required: 5, available: 1 }]);
  await expect("no order on shortfall", "GET", "/admin/orders?channel=in_store", { project: names }, 200);
  assert.equal(transcript.at(-1).body.names.length, 1);
  assert.deepEqual(stockOf((await expect("stock untouched on shortfall", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data), stockOf(stockAfterSale));

  // ---- later, then cancel after a product is deleted (CO-01) --------------------------------------------------------
  const later = (
    await expect("later sale", "POST", "/admin/orders", {
      token: roles.admin.token,
      body: inStore({
        customer: { name: "Later Buyer", phoneNumber: "08034567890", deliveryAddress: "5 Install Road" },
        lines: [{ productId: temp.id, quantity: 2 }, { productId: battery.id, quantity: 1 }],
        fulfilment: "later",
        paymentStatus: "partial",
        requiresInstallation: true,
      }),
      project: orderParts,
    }, 201, "Order created.")
  ).body.data;
  assert.deepEqual(
    { status: later.status, fulfillmentStatus: later.fulfillmentStatus, stockCommittedAt: later.stockCommittedAt, paidAt: later.paidAt, discount: later.discount, requiresInstallation: later.requiresInstallation },
    { status: "pending", fulfillmentStatus: "pending", stockCommittedAt: null, paidAt: null, discount: null, requiresInstallation: true }
  );
  assert.deepEqual(stockOf((await expect("later sale leaves stock", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data), stockOf(stockAfterSale));

  await expect("channel filter in_store", "GET", "/admin/orders?channel=in_store", { project: names }, 200);
  assert.deepEqual(transcript.at(-1).body.names, ["Later Buyer", "Store Buyer"]);
  await expect("channel filter website", "GET", "/admin/orders?channel=website", { project: names }, 200);
  assert.deepEqual(transcript.at(-1).body.names, ["Web Buyer"]);
  await expect("bad channel filter", "GET", "/admin/orders?channel=phone", {}, 400, "Channel is not valid.");

  const laterId = (await client.request("GET", "/admin/orders?channel=in_store", { token: STATIC_TOKEN })).body.data.find((order) => order.name === "Later Buyer").id;
  await expect("process the later sale", "POST", `/admin/orders/${laterId}/fulfillment`, { body: { status: "processing" }, project: orderParts }, 200);
  assert.deepEqual(stockOf((await expect("later sale committed", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data)["COM-TMP"], 3);
  await expect("delete a sold product", "DELETE", `/admin/products/${temp.id}`, {}, 200, "Product deleted.");
  const cancelled = (await expect("cancel after product delete", "POST", `/admin/orders/${laterId}/fulfillment`, { body: { status: "cancelled" }, project: orderParts }, 200, "Fulfilment status updated.")).body.data;
  assert.deepEqual({ status: cancelled.status, stockCommittedAt: cancelled.stockCommittedAt }, { status: "cancelled", stockCommittedAt: null });
  const reversals = (await expect("only existing products restored", "GET", "/admin/inventory/movements?reason=sale_reversal", {}, 200)).body.data;
  assert.deepEqual(reversals.items.filter((movement) => movement.referenceId === laterId).map((movement) => [movement.sku, movement.change]), [["COM-BAT", 1]]);
  const cancelAudit = await call("cancel audit note", "GET", "/admin/audit-logs?entity=order&limit=100", {
    project: (body) => ({ summaries: body.data.items.filter((item) => item.entityId === laterId).map((item) => item.summary).sort() }),
  });
  assert.ok(
    cancelAudit.body.data.items.some((item) => item.entityId === laterId && item.summary === "Order from Later Buyer: fulfilment processing → cancelled; stock not restored for deleted product COM-TMP"),
    JSON.stringify(cancelAudit.body.data.items.map((item) => item.summary))
  );

  // ---- in-store return: delivered -> cancelled restores stock (owner decision 2026-09-17) ------------------------
  const beforeReturn = stockOf((await expect("stock before return sale", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data);
  await expect("collected sale to return", "POST", "/admin/orders", {
    token: roles.sales.token,
    body: inStore({ customer: { name: "Return Buyer", phoneNumber: "08045678901" }, lines: [{ productId: battery.id, quantity: 2 }] }),
    project: orderParts,
  }, 201, "Order created.");
  const returnId = (await client.request("GET", "/admin/orders?channel=in_store", { token: STATIC_TOKEN })).body.data.find((order) => order.name === "Return Buyer").id;
  assert.equal(stockOf((await expect("return sale committed", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data)["COM-BAT"], beforeReturn["COM-BAT"] - 2);
  const returned = (await expect("cancel a delivered in-store sale", "POST", `/admin/orders/${returnId}/fulfillment`, { token: roles.sales.token, body: { status: "cancelled" }, project: orderParts }, 200, "Fulfilment status updated.")).body.data;
  assert.deepEqual({ status: returned.status, fulfillmentStatus: returned.fulfillmentStatus, stockCommittedAt: returned.stockCommittedAt }, { status: "cancelled", fulfillmentStatus: "cancelled", stockCommittedAt: null });
  assert.deepEqual(stockOf((await expect("return restores stock", "GET", "/admin/inventory?q=COM-", {}, 200)).body.data), beforeReturn);
  assert.deepEqual(allowedFulfillmentTransitions({ channel: "website", fulfillmentStatus: "delivered" }), ["installed"]);
  assert.deepEqual(allowedFulfillmentTransitions({ channel: "in_store", fulfillmentStatus: "delivered" }), ["installed", "cancelled"]);
  assert.deepEqual(allowedFulfillmentTransitions({ channel: "in_store", fulfillmentStatus: "installed" }), []);

  return transcript;
};
