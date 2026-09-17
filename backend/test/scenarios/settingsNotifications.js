// Settings and notifications (API_CONTRACT_V3 §8): settings merge, public settings, notify()
// for low_stock / new_order / vacancy_posted / job_assigned, audience filtering and read state.
// Runtime-agnostic scenario; returns the transcript for the parity test.
import assert from "node:assert/strict";
import { ALERT_MAILBOX, recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

const summary = (body) => ({
  message: body?.message,
  total: body?.data?.total,
  unreadCount: body?.data?.unreadCount,
  items: body?.data?.items?.map(({ type, title, message, entity, read }) => ({ type, title, message, entity, read })),
});

export const runSettingsNotificationsScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const inventoryUser = await client.seedAdmin("inventory");
  const hr = await client.seedAdmin("hr");
  const engineer = await client.seedAdmin("engineer", { name: "Notified Engineer" });
  const support = await client.seedAdmin("support");

  // ---- settings ------------------------------------------------------------------------------
  const defaults = (await expect("default settings", "GET", "/admin/settings", {}, 200, "Settings retrieved.")).body.data;
  assert.deepEqual(defaults, {
    business: { name: "Juwon Electric", email: null, phone: null, address: null, website: null },
    notifications: { orderEmails: [], lowStockEmails: [], vacancyEmails: [] },
    payments: { gatewayEnabled: false, provider: null },
    inventory: { defaultReorderLevel: 0, lowStockAlertsEnabled: true },
    uploads: { provider: "url" },
    website: { stats: [], whatsappNumber: null, businessHours: null, productsEnabled: true, sample: false },
    financing: { enabled: false, depositPercent: null, termsMonths: [], monthlyRatePercent: null, approvalTime: null, note: null, sample: false },
    calculator: {
      enabled: false,
      appliances: [],
      inverterHeadroomPercent: 25,
      batteryDepthOfDischargePercent: 80,
      batteryVoltage: 48,
      panelWatts: 550,
      peakSunHours: 4.5,
      generator: { fuelPricePerLitre: 0, litresPerKvaHour: 0, maintenancePerMonth: 0 },
      sample: false,
    },
    updatedAt: null,
    updatedBy: null,
  });
  await expect("support reads settings", "GET", "/admin/settings", { token: support.token }, 200);
  await expect("support cannot write settings", "PUT", "/admin/settings", { token: support.token, body: {} }, 403, FORBIDDEN);
  await expect("bad section", "PUT", "/admin/settings", { body: { business: "x" } }, 400, "business must be an object.");
  await expect("bad email list", "PUT", "/admin/settings", { body: { notifications: { orderEmails: ["nope"] } } }, 400, "Order emails must contain valid email addresses.");
  await expect("bad provider", "PUT", "/admin/settings", { body: { payments: { provider: "stripe" } } }, 400, "Payment provider is not valid.");
  await expect("bad reorder level", "PUT", "/admin/settings", { body: { inventory: { defaultReorderLevel: -1 } } }, 400);

  const updated = (
    await expect("merge settings", "PUT", "/admin/settings", {
      body: {
        business: { phone: "08012345678", website: "https://juwon.test" },
        notifications: { orderEmails: ["Orders@Juwon.test"], lowStockEmails: ["stock@juwon.test"], vacancyEmails: ["hr@juwon.test"] },
        payments: { gatewayEnabled: true, provider: "paystack" },
        inventory: { defaultReorderLevel: 2 },
        unknown: { ignored: true },
      },
    }, 200, "Settings updated.")
  ).body.data;
  assert.equal(updated.business.name, "Juwon Electric");
  assert.equal(updated.business.phone, "08012345678");
  assert.deepEqual(updated.notifications.orderEmails, ["orders@juwon.test"]);
  assert.equal(updated.inventory.lowStockAlertsEnabled, true);
  assert.deepEqual(updated.updatedBy, { id: "static-token", email: "static-token" });
  assert.equal("unknown" in updated, false);
  const again = (await expect("sent arrays replace", "PUT", "/admin/settings", { body: { notifications: { orderEmails: [] } } }, 200)).body.data;
  assert.deepEqual(again.notifications, { orderEmails: [], lowStockEmails: ["stock@juwon.test"], vacancyEmails: ["hr@juwon.test"] });

  const publicView = (await expect("public settings", "GET", "/settings/public", { token: null }, 200, "Settings retrieved.")).body.data;
  assert.deepEqual(publicView, {
    business: { name: "Juwon Electric", phone: "08012345678", email: null, address: null, website: "https://juwon.test" },
    payments: { gatewayEnabled: true },
    website: { stats: [], whatsappNumber: null, businessHours: null, productsEnabled: true, sample: false },
    financing: { enabled: false },
    calculator: { enabled: false },
  });

  // ---- low_stock -----------------------------------------------------------------------------------
  client.emails.length = 0;
  const product = (await expect("product uses the default reorder level", "POST", "/admin/products", { body: { sku: "NOTE-1", name: "Notify Panel", price: 10, stockQuantity: 3 } }, 201)).body.data;
  assert.equal(product.reorderLevel, 2);
  await expect("cross the level", "POST", "/admin/inventory/adjustments", { body: { productId: product.id, change: -1, reason: "damage" } }, 201);
  assert.deepEqual(client.emails.map((email) => email.to), [["stock@juwon.test"]], "lowStockEmails receive the alert");

  // ---- new_order (and orderEmails fallback) ----------------------------------------------------------
  await expect("package", "POST", "/admin/packages", {
    body: { legacyId: 9201, type: "tubular", name: "Notify Kit", kva: 2, load: "Fan", options: [{ name: "Standard", price: 100000, kits: "1 battery" }] },
    project: (body) => ({ message: body?.message }),
  }, 201);
  client.emails.length = 0;
  const order = (
    await expect("place order", "POST", "/order", {
      token: null,
      body: { name: "Notify Customer", phoneNumber: "08099990000", deliveryAddress: "Somewhere", order: [{ id: 9201, quantity: 1, optionName: "Standard" }] },
      project: (body) => ({ message: body?.message }),
    }, 201)
  ).body.data;
  assert.deepEqual(client.emails.map((email) => email.to), [[ALERT_MAILBOX]], "empty orderEmails falls back to the env mailbox");

  // ---- job_assigned ----------------------------------------------------------------------------------
  await expect("require installation", "PUT", `/admin/orders/${order.id}`, { body: { requiresInstallation: true }, project: (body) => ({ message: body?.message }) }, 200);
  await expect("assigned job", "POST", "/admin/jobs", { body: { orderId: order.id, engineerId: engineer.id }, project: (body) => ({ message: body?.message }) }, 201);

  // ---- audience ------------------------------------------------------------------------------------------
  const all = (await expect("superadmin notifications", "GET", "/admin/notifications", { project: summary }, 200, "Notifications retrieved.")).body.data;
  assert.deepEqual(all.items.map((item) => item.type).sort(), ["low_stock", "new_order"], "job_assigned is only for its recipient");
  assert.equal(all.unreadCount, 2);
  assert.deepEqual(Object.keys(all.items[0]).sort(), ["createdAt", "data", "entity", "entityId", "id", "message", "read", "recipientId", "title", "type"]);

  const inventoryView = (await expect("inventory sees low stock and orders", "GET", "/admin/notifications", { token: inventoryUser.token, project: summary }, 200)).body.data;
  assert.deepEqual(inventoryView.items.map((item) => item.type).sort(), ["low_stock", "new_order"]);
  const hrView = (await expect("hr sees neither", "GET", "/admin/notifications", { token: hr.token, project: summary }, 200)).body.data;
  assert.equal(hrView.total, 0);
  const engineerView = (await expect("engineer sees own assignment", "GET", "/admin/notifications", { token: engineer.token, project: summary }, 200)).body.data;
  assert.deepEqual(engineerView.items.map((item) => [item.type, item.recipientId === engineer.id]), [["job_assigned", true]]);

  // ---- read state ------------------------------------------------------------------------------------------
  const lowStock = all.items.find((item) => item.type === "low_stock");
  await expect("not in audience", "POST", `/admin/notifications/${lowStock.id}/read`, { token: hr.token, body: {} }, 404, "Notification not found.");
  await expect("unknown notification", "POST", "/admin/notifications/missing/read", { body: {} }, 404, "Notification not found.");
  const read = (await expect("mark one read", "POST", `/admin/notifications/${lowStock.id}/read`, { body: {} }, 200, "Notification marked as read.")).body.data;
  assert.equal(read.read, true);
  const unread = (await expect("unread only", "GET", "/admin/notifications?unread=true", { project: summary }, 200)).body.data;
  assert.deepEqual(unread.items.map((item) => item.type), ["new_order"]);
  assert.equal(unread.unreadCount, 1);
  const inventoryStill = (await expect("read state is per admin", "GET", "/admin/notifications", { token: inventoryUser.token, project: summary }, 200)).body.data;
  assert.equal(inventoryStill.unreadCount, 2);
  const typed = (await expect("filter by type", "GET", "/admin/notifications?type=new_order", { project: summary }, 200)).body.data;
  assert.equal(typed.total, 1);
  await expect("bad type", "GET", "/admin/notifications?type=weird", {}, 400, "Type is not valid.");

  const cleared = (await expect("mark all read", "POST", "/admin/notifications/read-all", { token: inventoryUser.token, body: {} }, 200, "All notifications marked as read.")).body.data;
  assert.deepEqual(cleared, { unreadCount: 0 });
  const after = (await expect("all read", "GET", "/admin/notifications", { token: inventoryUser.token, project: summary }, 200)).body.data;
  assert.equal(after.unreadCount, 0);
  assert.ok(after.items.every((item) => item.read));

  // ---- vacancy_posted (BE-1's vacancy module calls notify on first publish) ----------------------------
  client.emails.length = 0;
  await expect("open vacancy", "POST", "/admin/vacancies", {
    body: { title: "Solar Installer", status: "open" },
    project: (body) => ({ message: body?.message }),
  }, 201);
  const hrAfter = (await expect("hr sees the vacancy", "GET", "/admin/notifications", { token: hr.token, project: summary }, 200)).body.data;
  assert.deepEqual(hrAfter.items.map((item) => [item.type, item.message]), [["vacancy_posted", '"Solar Installer" is now open.']]);
  assert.deepEqual(client.emails.map((email) => email.to), [["hr@juwon.test"]], "vacancyEmails receive the vacancy email");

  // Alerts disabled: no low-stock email, the notification is still recorded.
  await expect("disable alerts", "PUT", "/admin/settings", { body: { inventory: { lowStockAlertsEnabled: false } } }, 200);
  const quiet = (await expect("second product", "POST", "/admin/products", { body: { sku: "NOTE-2", name: "Quiet Panel", price: 10, stockQuantity: 1, reorderLevel: 0 } }, 201)).body.data;
  client.emails.length = 0;
  await expect("to zero with alerts off", "POST", "/admin/inventory/adjustments", { body: { productId: quiet.id, change: -1, reason: "damage" } }, 201);
  assert.equal(client.emails.length, 0);
  const afterQuiet = (await expect("new low-stock notification is unread", "GET", "/admin/notifications", { token: inventoryUser.token, project: summary }, 200)).body.data;
  assert.equal(afterQuiet.unreadCount, 1);

  return transcript;
};
