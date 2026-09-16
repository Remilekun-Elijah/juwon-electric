import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { shapeOf, startRuntimes } from "./helpers/runtimes.js";

const runtimes = await startRuntimes();
after(() => Promise.all(runtimes.map((rt) => rt.close())));

const productBody = (overrides = {}) => ({
  sku: "inv-5kva-01",
  name: "5kVA Hybrid Inverter",
  price: 850000,
  costPrice: 700000,
  brand: "Felicity",
  descriptionHtml: '<p>Pure sine wave.</p><script>alert(1)</script><a href="javascript:x()">x</a>',
  attributes: { capacity: "5kVA", phases: 1, warranty: true },
  images: ["https://cdn.example.com/inverter.jpg"],
  tags: ["inverter", "hybrid", "inverter"],
  stockQuantity: 4,
  reorderLevel: 2,
  ...overrides,
});

const results = {};

for (const rt of runtimes) {
  describe(`catalog (${rt.name})`, () => {
    const state = {};
    results[rt.name] = state;

    before(async () => {
      state.sales = await rt.createAdmin("sales");
      state.engineer = await rt.createAdmin("engineer");
    });

    test("category CRUD with slugs and parent validation", async () => {
      const root = await rt.api("POST", "/admin/categories", { body: { name: "Inverters & Batteries" } });
      assert.equal(root.status, 201, JSON.stringify(root.body));
      assert.equal(root.body.data.slug, "inverters-and-batteries");
      assert.equal(root.body.data.parentId, null);
      assert.equal(root.body.data.isActive, true);
      state.root = root.body.data;

      const dup = await rt.api("POST", "/admin/categories", { body: { name: "Inverters and Batteries" } });
      assert.equal(dup.status, 201);
      assert.equal(dup.body.data.slug, "inverters-and-batteries-2");

      const child = await rt.api("POST", "/admin/categories", { body: { name: "Hybrid", parentId: root.body.data.id } });
      assert.equal(child.status, 201);
      state.child = child.body.data;

      const badParent = await rt.api("POST", "/admin/categories", { body: { name: "X", parentId: "missing" } });
      assert.equal(badParent.status, 400);
      assert.equal(badParent.body.message, "Parent category not found.");

      const cycle = await rt.api("PUT", `/admin/categories/${root.body.data.id}`, {
        body: { name: root.body.data.name, parentId: child.body.data.id },
      });
      assert.equal(cycle.status, 400);
      assert.equal(cycle.body.message, "A category cannot be moved under its own subcategory.");

      const self = await rt.api("PUT", `/admin/categories/${root.body.data.id}`, {
        body: { name: root.body.data.name, parentId: root.body.data.id },
      });
      assert.equal(self.status, 400);

      const renamed = await rt.api("PUT", `/admin/categories/${dup.body.data.id}`, {
        body: { name: "Solar", slug: "hybrid" },
      });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.data.slug, "hybrid-2");
      assert.equal(renamed.body.data.parentId, null);

      const removed = await rt.api("DELETE", `/admin/categories/${dup.body.data.id}`);
      assert.equal(removed.status, 200);
      const gone = await rt.api("DELETE", `/admin/categories/${dup.body.data.id}`);
      assert.equal(gone.status, 404);
      assert.equal(gone.body.message, "Category not found.");

      const hasChildren = await rt.api("DELETE", `/admin/categories/${root.body.data.id}`);
      assert.equal(hasChildren.status, 409);
    });

    test("product create sanitises HTML, normalises SKU and enforces uniqueness", async () => {
      const created = await rt.api("POST", "/admin/products", {
        body: productBody({ categoryId: state.child.id }),
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const product = created.body.data;
      state.product = product;
      assert.equal(product.sku, "INV-5KVA-01");
      assert.equal(product.slug, "5kva-hybrid-inverter");
      assert.equal(
        product.descriptionHtml,
        '<p>Pure sine wave.</p><a rel="noopener noreferrer nofollow">x</a>'
      );
      assert.deepEqual(product.attributes, { capacity: "5kVA", phases: "1", warranty: "true" });
      assert.deepEqual(product.tags, ["inverter", "hybrid"]);
      assert.equal(product.status, "active");
      assert.equal(product.isActive, true);
      assert.equal(product.currency, "NGN");
      assert.equal(product.stockQuantity, 4);

      const dupSku = await rt.api("POST", "/admin/products", { body: productBody({ sku: " INV-5kva-01 ", name: "Other" }) });
      assert.equal(dupSku.status, 409);
      assert.equal(dupSku.body.message, "Another product already uses SKU INV-5KVA-01.");

      const badSku = await rt.api("POST", "/admin/products", { body: productBody({ sku: "bad sku!" }) });
      assert.equal(badSku.status, 400);

      const badCategory = await rt.api("POST", "/admin/products", { body: productBody({ sku: "X1", categoryId: "nope" }) });
      assert.equal(badCategory.status, 400);
      assert.equal(badCategory.body.message, "Category not found.");

      const badImage = await rt.api("POST", "/admin/products", { body: productBody({ sku: "X2", images: ["http://insecure"] }) });
      assert.equal(badImage.status, 400);

      const noPrice = await rt.api("POST", "/admin/products", { body: productBody({ sku: "X3", price: undefined }) });
      assert.equal(noPrice.status, 400);
      assert.equal(noPrice.body.message, "Price must be a number.");
    });

    test("product update keeps unsent fields and rejects direct stock edits", async () => {
      const { product } = state;
      const updated = await rt.api("PUT", `/admin/products/${product.id}`, {
        body: { sku: product.sku, name: "5kVA Hybrid Inverter Pro", brand: null, stockQuantity: 4 },
      });
      assert.equal(updated.status, 200, JSON.stringify(updated.body));
      assert.equal(updated.body.data.name, "5kVA Hybrid Inverter Pro");
      assert.equal(updated.body.data.slug, product.slug, "slug is kept when not sent");
      assert.equal(updated.body.data.brand, "");
      assert.equal(updated.body.data.price, 850000);
      assert.equal(updated.body.data.categoryId, state.child.id);

      const stock = await rt.api("PUT", `/admin/products/${product.id}`, {
        body: { sku: product.sku, name: "x", stockQuantity: 99 },
      });
      assert.equal(stock.status, 400);
      assert.equal(stock.body.message, "Use a stock adjustment to change the stock quantity.");

      const second = await rt.api("POST", "/admin/products", { body: productBody({ sku: "BAT-200AH", name: "200Ah Battery" }) });
      assert.equal(second.status, 201);
      const clash = await rt.api("PUT", `/admin/products/${second.body.data.id}`, {
        body: { sku: "inv-5kva-01", name: "200Ah Battery" },
      });
      assert.equal(clash.status, 409);
      state.battery = second.body.data;
    });

    test("public catalog shows only active records and hides internal fields", async () => {
      const hidden = await rt.api("POST", "/admin/products", {
        body: productBody({ sku: "HIDDEN-1", name: "Hidden", status: "hidden", categoryId: state.root.id }),
      });
      assert.equal(hidden.status, 201);
      assert.equal(hidden.body.data.isActive, false);

      const list = await rt.api("GET", "/products", { token: null });
      assert.equal(list.status, 200);
      const skus = list.body.data.map((item) => item.sku).sort();
      assert.deepEqual(skus, ["BAT-200AH", "INV-5KVA-01"]);
      const inverter = list.body.data.find((item) => item.sku === "INV-5KVA-01");
      assert.equal(inverter.costPrice, undefined);
      assert.equal(inverter.stockQuantity, undefined);
      assert.equal(inverter.inStock, true);
      assert.deepEqual(inverter.category, { id: state.child.id, name: "Hybrid", slug: "hybrid" });
      state.publicProduct = inverter;

      // Category filter includes descendants.
      const byRoot = await rt.api("GET", `/products?category=${state.root.slug}`, { token: null });
      assert.deepEqual(byRoot.body.data.map((item) => item.sku), ["INV-5KVA-01"]);
      const unknown = await rt.api("GET", "/products?category=nope", { token: null });
      assert.equal(unknown.status, 404);

      const bySlug = await rt.api("GET", `/products/${inverter.slug}`, { token: null });
      assert.equal(bySlug.status, 200);
      assert.equal(bySlug.body.data.id, inverter.id);
      const hiddenDetail = await rt.api("GET", `/products/${hidden.body.data.id}`, { token: null });
      assert.equal(hiddenDetail.status, 404);
      assert.equal(hiddenDetail.body.message, "Product not found.");

      const categories = await rt.api("GET", "/categories", { token: null });
      assert.equal(categories.status, 200);
      state.publicCategory = categories.body.data[0];
      const category = await rt.api("GET", `/categories/${state.child.slug}`, { token: null });
      assert.equal(category.status, 200);
      assert.equal(category.body.data.parentId, state.root.id);
    });

    test("capabilities gate admin catalog routes", async () => {
      const read = await rt.api("GET", "/admin/products", { token: state.sales.token });
      assert.equal(read.status, 200);
      const write = await rt.api("POST", "/admin/categories", { token: state.sales.token, body: { name: "Nope" } });
      assert.equal(write.status, 403);
      assert.equal(write.body.message, "You do not have permission to perform this action.");
      const engineer = await rt.api("GET", "/admin/categories", { token: state.engineer.token });
      assert.equal(engineer.status, 403);
      const anonymous = await rt.api("GET", "/admin/products", { token: null });
      assert.equal(anonymous.status, 401);
    });

    test("packages reference products as components without changing public /packages", async () => {
      const before = await rt.api("GET", "/packages", { token: null });
      assert.equal(before.status, 200);
      const pack = await rt.api("POST", "/admin/packages", {
        body: {
          type: "tubular",
          name: "Starter",
          kva: 5,
          load: "Fridge, TV",
          options: [{ name: "Without solar", price: 1200000, kits: "2 batteries" }],
          components: [
            { productId: state.product.id, quantity: 1 },
            { productId: state.battery.id, quantity: 2 },
          ],
        },
      });
      assert.equal(pack.status, 201, JSON.stringify(pack.body));
      assert.deepEqual(pack.body.data.components, [
        { productId: state.product.id, quantity: 1 },
        { productId: state.battery.id, quantity: 2 },
      ]);
      state.package = pack.body.data;

      const missing = await rt.api("POST", "/admin/packages", {
        body: {
          type: "tubular",
          name: "Broken",
          kva: 5,
          load: "x",
          options: [{ name: "a", price: 1, kits: "b" }],
          components: [{ productId: "missing" }],
        },
      });
      assert.equal(missing.status, 400);
      assert.equal(missing.body.message, "Component product not found.");

      const publicPack = await rt.api("GET", `/packages/${pack.body.data.id}`, { token: null });
      assert.equal(publicPack.status, 200);
      assert.equal(publicPack.body.data.components, undefined);
      assert.deepEqual(Object.keys(publicPack.body.data).sort(), Object.keys(before.body.data[0] || publicPack.body.data).sort());

      const blocked = await rt.api("DELETE", `/admin/products/${state.battery.id}`);
      assert.equal(blocked.status, 409);

      const blockedCategory = await rt.api("DELETE", `/admin/categories/${state.child.id}`);
      assert.equal(blockedCategory.status, 409);
    });
  });
}

test("Express and Worker answer with the same shapes", () => {
  const [express, worker] = runtimes.map((rt) => results[rt.name]);
  for (const key of ["product", "publicProduct", "publicCategory", "root", "package"]) {
    assert.deepEqual(shapeOf(express[key]), shapeOf(worker[key]), key);
  }
});
