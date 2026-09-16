import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { RESEND_EMAIL_ENV, captureWorkerEmails, shapeOf, startRuntimes } from "./helpers/runtimes.js";

const emails = captureWorkerEmails();
const runtimes = await startRuntimes({ workerEnv: RESEND_EMAIL_ENV });
after(async () => {
  emails.restore();
  await Promise.all(runtimes.map((rt) => rt.close()));
});

const results = {};

for (const rt of runtimes) {
  describe(`inventory (${rt.name})`, () => {
    const state = {};
    results[rt.name] = state;

    before(async () => {
      state.inventoryUser = await rt.createAdmin("inventory");
      state.support = await rt.createAdmin("support");
      const product = await rt.api("POST", "/admin/products", {
        body: { sku: "BAT-100", name: "100Ah Battery", price: 250000, stockQuantity: 10, reorderLevel: 3 },
      });
      assert.equal(product.status, 201, JSON.stringify(product.body));
      state.product = product.body.data;
    });

    test("initial stock is recorded as a movement", async () => {
      assert.equal(state.product.stockQuantity, 10);
      const history = await rt.api("GET", `/admin/products/${state.product.id}/stock-movements`);
      assert.equal(history.status, 200);
      assert.equal(history.body.data.total, 1);
      const [movement] = history.body.data.items;
      assert.equal(movement.reason, "initial");
      assert.equal(movement.change, 10);
      assert.equal(movement.quantityBefore, 0);
      assert.equal(movement.quantityAfter, 10);
      assert.equal(movement.createdById, "static-token");
    });

    test("adjustments validate input, update stock and write movements", async () => {
      const bad = [
        [{ quantity: 0, reason: "restock" }, "Quantity must not be 0."],
        [{ quantity: 1.5, reason: "restock" }, "Quantity must be a whole number."],
        [{ quantity: 2 }, "Reason is required."],
        [{ quantity: 2, reason: "initial" }, "Reason must be one of: restock, correction, damage, return, other."],
      ];
      for (const [body, message] of bad) {
        const response = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, { body });
        assert.equal(response.status, 400, JSON.stringify(body));
        assert.equal(response.body.message, message);
      }

      const damage = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, {
        token: state.inventoryUser.token,
        body: { quantity: -4, reason: "damage", note: "Water damage in store" },
      });
      assert.equal(damage.status, 201, JSON.stringify(damage.body));
      assert.equal(damage.body.data.product.stockQuantity, 6);
      assert.equal(damage.body.data.movement.quantityBefore, 10);
      assert.equal(damage.body.data.movement.quantityAfter, 6);
      assert.equal(damage.body.data.movement.createdById, state.inventoryUser.id);
      assert.equal(damage.body.data.movement.note, "Water damage in store");
      state.adjustment = damage.body.data;

      const tooMuch = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, {
        body: { quantity: -7, reason: "correction" },
      });
      assert.equal(tooMuch.status, 409);
      assert.equal(tooMuch.body.message, "Not enough stock for 100Ah Battery (BAT-100): 6 available, 7 needed.");

      const forbidden = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, {
        token: state.support.token,
        body: { quantity: 1, reason: "restock" },
      });
      assert.equal(forbidden.status, 403);

      const missing = await rt.api("POST", "/admin/products/nope/stock-adjustments", { body: { quantity: 1, reason: "restock" } });
      assert.equal(missing.status, 404);
    });

    test("concurrent adjustments never oversell and every change has a movement", async () => {
      const created = await rt.api("POST", "/admin/products", {
        body: { sku: "RACE-1", name: "Race", price: 1, stockQuantity: 5, reorderLevel: 0 },
      });
      const id = created.body.data.id;
      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          rt.api("POST", `/admin/products/${id}/stock-adjustments`, { body: { quantity: -1, reason: "correction" } })
        )
      );
      const statuses = responses.map((response) => response.status);
      assert.equal(statuses.filter((status) => status === 201).length, 5, statuses.join(","));
      assert.ok(statuses.every((status) => status === 201 || status === 409), statuses.join(","));

      const product = await rt.api("GET", `/admin/products/${id}`);
      assert.equal(product.body.data.stockQuantity, 0);
      const history = await rt.api("GET", `/admin/inventory/movements?productId=${id}&reason=correction`);
      assert.equal(history.body.data.total, 5);
      const afters = history.body.data.items.map((item) => item.quantityAfter).sort();
      assert.deepEqual(afters, [0, 1, 2, 3, 4]);
    });

    test("movement listing pages newest first and validates filters", async () => {
      const page = await rt.api("GET", "/admin/inventory/movements?limit=2&page=1");
      assert.equal(page.status, 200);
      assert.equal(page.body.data.items.length, 2);
      assert.equal(page.body.data.limit, 2);
      assert.ok(page.body.data.total >= 7);
      const [first, second] = page.body.data.items;
      assert.ok(first.createdAt >= second.createdAt);

      const badReason = await rt.api("GET", "/admin/inventory/movements?reason=stolen");
      assert.equal(badReason.status, 400);
      const badPage = await rt.api("GET", "/admin/inventory/movements?page=0");
      assert.equal(badPage.status, 400);
    });

    test("low-stock list uses product reorder level or the settings default", async () => {
      const noLevel = await rt.api("POST", "/admin/products", {
        body: { sku: "CABLE-10", name: "Cable", price: 5000, stockQuantity: 5 },
      });
      assert.equal(noLevel.status, 201);
      const archived = await rt.api("POST", "/admin/products", {
        body: { sku: "OLD-1", name: "Old", price: 1, status: "archived" },
      });
      assert.equal(archived.status, 201);

      const low = await rt.api("GET", "/admin/inventory/low-stock", { token: state.inventoryUser.token });
      assert.equal(low.status, 200);
      const bySku = Object.fromEntries(low.body.data.map((item) => [item.sku, item]));
      assert.equal(bySku["CABLE-10"].reorderLevel, 5, "default reorder level is 5");
      assert.equal(bySku["RACE-1"].stockQuantity, 0);
      assert.equal(bySku["BAT-100"], undefined, "6 in stock is above reorder level 3");
      assert.equal(bySku["OLD-1"], undefined, "archived products are not reported");
      state.lowStock = low.body.data[0];
    });

    test("crossing the reorder level sends a low-stock email (Worker via Resend)", async () => {
      emails.sent.length = 0;
      const crossing = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, {
        body: { quantity: -3, reason: "damage" },
      });
      assert.equal(crossing.status, 201);
      assert.equal(crossing.body.data.product.stockQuantity, 3);
      if (rt.name === "worker") {
        assert.equal(emails.sent.length, 1);
        assert.equal(emails.sent[0].subject, "Low stock: 100Ah Battery");
        assert.equal(emails.sent[0].to, "owner@example.com");
        assert.match(emails.sent[0].html, /BAT-100/);
      }

      emails.sent.length = 0;
      const stillLow = await rt.api("POST", `/admin/products/${state.product.id}/stock-adjustments`, {
        body: { quantity: -1, reason: "damage" },
      });
      assert.equal(stillLow.status, 201);
      assert.equal(emails.sent.length, 0, "no second email while already below the level");
    });

    test("manual low-stock report", async () => {
      emails.sent.length = 0;
      const report = await rt.api("POST", "/admin/inventory/low-stock/notify");
      assert.equal(report.status, 200);
      assert.ok(report.body.data.items.length >= 3);
      if (rt.name === "worker") {
        assert.equal(report.body.data.emailed, true);
        assert.equal(report.body.message, "Low-stock report sent.");
        assert.match(emails.sent[0].subject, /^Low stock report: \d+ products$/);
      } else {
        // No SMTP configured in tests.
        assert.equal(report.body.data.emailed, false);
      }
    });
  });
}

test("Express and Worker answer with the same shapes", () => {
  const [express, worker] = runtimes.map((rt) => results[rt.name]);
  for (const key of ["product", "adjustment", "lowStock"]) {
    assert.deepEqual(shapeOf(express[key]), shapeOf(worker[key]), key);
  }
});

test("Worker cron trigger sends the low-stock digest", async () => {
  const worker = runtimes.find((rt) => rt.name === "worker");
  emails.sent.length = 0;
  const pending = [];
  await worker.worker.scheduled({ cron: "0 7 * * *" }, worker.env, { waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.equal(emails.sent.length, 1);
  assert.match(emails.sent[0].subject, /^Low stock report/);
});
