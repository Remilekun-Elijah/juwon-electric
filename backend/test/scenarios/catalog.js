// Categories, products and package items (API_CONTRACT_V3 §4). Runtime-agnostic scenario;
// returns the transcript for the parity test.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

export const runCatalogScenario = async (client) => {
  const { transcript, call, expect } = recorder(client);
  const sales = await client.seedAdmin("sales");
  const engineer = await client.seedAdmin("engineer");

  // ---- categories ---------------------------------------------------------------------
  const root = (
    await expect("create root category", "POST", "/admin/categories", {
      body: {
        name: "Inverters & Batteries",
        description: "Power backup",
        attributes: [{ key: "capacity", label: "Capacity", type: "number", unit: "kVA" }],
        unknownField: "ignored",
      },
    }, 201, "Category created.")
  ).body.data;
  assert.deepEqual(Object.keys(root).sort(), [
    "attributes", "createdAt", "description", "id", "imageUrl", "isActive", "name", "parentId", "slug", "sortOrder", "updatedAt",
  ]);
  assert.equal(root.slug, "inverters-and-batteries");
  assert.equal(root.parentId, null);
  assert.equal(root.imageUrl, null);
  assert.deepEqual(root.attributes, [{ key: "capacity", label: "Capacity", type: "number", unit: "kVA" }]);

  const duplicate = (
    await expect("slug collision gets a suffix", "POST", "/admin/categories", { body: { name: "Inverters and Batteries" } }, 201)
  ).body.data;
  assert.equal(duplicate.slug, "inverters-and-batteries-2");

  const child = (
    await expect("create child category", "POST", "/admin/categories", { body: { name: "Hybrid", parentId: root.id } }, 201)
  ).body.data;

  await expect("unknown parent", "POST", "/admin/categories", { body: { name: "X", parentId: "missing" } }, 400, "Parent category not found.");
  await expect("cycle through a child", "PUT", `/admin/categories/${root.id}`, { body: { parentId: child.id } }, 400, "A category cannot be its own ancestor.");
  await expect("own parent", "PUT", `/admin/categories/${root.id}`, { body: { parentId: root.id } }, 400, "A category cannot be its own ancestor.");
  await expect("bad attribute key", "POST", "/admin/categories", { body: { name: "Y", attributes: [{ key: "1bad", label: "B", type: "text" }] } }, 400);
  await expect("duplicate attribute key", "POST", "/admin/categories", {
    body: { name: "Y", attributes: [{ key: "a", label: "A", type: "text" }, { key: "a", label: "B", type: "text" }] },
  }, 400);
  await expect("missing name", "POST", "/admin/categories", { body: {} }, 400, "Name is required.");

  const renamed = (
    await expect("partial update keeps unsent fields", "PUT", `/admin/categories/${duplicate.id}`, { body: { name: "Solar" } }, 200, "Category updated.")
  ).body.data;
  assert.equal(renamed.slug, "inverters-and-batteries-2");
  assert.equal(renamed.name, "Solar");
  const reslugged = (
    await expect("sent slug is made unique", "PUT", `/admin/categories/${duplicate.id}`, { body: { slug: "Hybrid", description: null } }, 200)
  ).body.data;
  assert.equal(reslugged.slug, "hybrid-2");

  await expect("delete category", "DELETE", `/admin/categories/${duplicate.id}`, {}, 200, "Category deleted.");
  await expect("delete again", "DELETE", `/admin/categories/${duplicate.id}`, {}, 404, "Category not found.");
  await expect("delete category with subcategories", "DELETE", `/admin/categories/${root.id}`, {}, 409, "Category has subcategories or products.");

  // ---- products -------------------------------------------------------------------------
  const productBody = {
    sku: "Inv-5KVA-01",
    name: "5kVA Hybrid Inverter",
    categoryId: child.id,
    brand: "Felicity",
    descriptionHtml: '<P onclick="x()">Pure sine wave.</P><script>alert(1)</script><a href="javascript:x()">x</a>',
    attributes: { capacity: 5, phase: "single", wifi: true },
    price: 850000,
    costPrice: 700000,
    images: ["https://cdn.juwon.test/inverter.jpg"],
    tags: ["inverter", "hybrid", "inverter"],
    stockQuantity: 4,
    reorderLevel: 2,
  };
  const product = (await expect("create product", "POST", "/admin/products", { body: productBody }, 201, "Product created.")).body.data;
  assert.deepEqual(Object.keys(product).sort(), [
    "attributes", "brand", "categoryId", "costPrice", "createdAt", "currency", "descriptionHtml", "id", "images", "lowStock",
    "name", "price", "reorderLevel", "sku", "slug", "status", "stockQuantity", "tags", "updatedAt",
  ]);
  assert.equal(product.sku, "Inv-5KVA-01");
  assert.equal(product.slug, "5kva-hybrid-inverter");
  assert.equal(product.descriptionHtml, '<p>Pure sine wave.</p><a rel="noopener noreferrer nofollow" target="_blank">x</a>');
  assert.deepEqual(product.attributes, { capacity: 5, phase: "single", wifi: true });
  assert.deepEqual(product.tags, ["inverter", "hybrid"]);
  assert.equal(product.stockQuantity, 4);
  assert.equal(product.lowStock, false);
  assert.equal(product.currency, "NGN");

  await expect("duplicate SKU ignores case", "POST", "/admin/products", { body: { ...productBody, sku: "INV-5kva-01", name: "Other" } }, 409, "Another product already uses SKU INV-5kva-01.");
  await expect("invalid SKU", "POST", "/admin/products", { body: { ...productBody, sku: "bad sku!" } }, 400, "SKU may only contain letters, numbers, dots, dashes and underscores.");
  await expect("unknown category", "POST", "/admin/products", { body: { ...productBody, sku: "X1", categoryId: "nope" } }, 400, "Category not found.");
  await expect("insecure image", "POST", "/admin/products", { body: { ...productBody, sku: "X2", images: ["http://insecure.test/a.jpg"] } }, 400);
  await expect("too many images", "POST", "/admin/products", { body: { ...productBody, sku: "X3", images: Array(11).fill("https://cdn.juwon.test/a.jpg") } }, 400, "Images can have at most 10 entries.");
  await expect("missing price", "POST", "/admin/products", { body: { ...productBody, sku: "X4", price: undefined } }, 400, "Price must be a number.");
  await expect("zero price", "POST", "/admin/products", { body: { ...productBody, sku: "X5", price: 0 } }, 400, "Price must be greater than 0 and at most 1,000,000,000.");
  await expect("attribute value type", "POST", "/admin/products", { body: { ...productBody, sku: "X6", attributes: { a: [1] } } }, 400);
  await expect("rich text over the limit", "POST", "/admin/products", {
    body: { ...productBody, sku: "X7", descriptionHtml: `<p>${"a".repeat(50001)}</p>` },
  }, 400, "Description must be 50000 characters or fewer.");

  const updated = (
    await expect("partial product update", "PUT", `/admin/products/${product.id}`, { body: { name: "5kVA Inverter Pro", brand: null, stockQuantity: 4 } }, 200, "Product updated.")
  ).body.data;
  assert.equal(updated.name, "5kVA Inverter Pro");
  assert.equal(updated.slug, product.slug);
  assert.equal(updated.brand, null);
  assert.equal(updated.price, 850000);
  assert.equal(updated.categoryId, child.id);
  await expect("stock is not editable", "PUT", `/admin/products/${product.id}`, { body: { stockQuantity: 99 } }, 400, "Use an inventory adjustment to change stock.");
  await expect("admin get by SKU", "GET", "/admin/products/inv-5kva-01", {}, 200, "Product retrieved.");

  const battery = (
    await expect("create second product", "POST", "/admin/products", {
      body: { sku: "BAT-200AH", name: "200Ah Battery", price: 320000, categoryId: root.id, reorderLevel: 5, stockQuantity: 3 },
    }, 201)
  ).body.data;
  assert.equal(battery.lowStock, true);
  await expect("SKU clash on update", "PUT", `/admin/products/${battery.id}`, { body: { sku: "inv-5KVA-01" } }, 409, "Another product already uses SKU inv-5KVA-01.");
  const hidden = (
    await expect("create hidden product", "POST", "/admin/products", {
      body: { sku: "HIDDEN-1", name: "Hidden Panel", price: 1000, status: "hidden", categoryId: root.id },
    }, 201)
  ).body.data;
  assert.equal(hidden.stockQuantity, 0);

  // ---- public catalog --------------------------------------------------------------------
  const page = (await expect("public products", "GET", "/products", { token: null }, 200, "Products retrieved.")).body.data;
  assert.deepEqual(page.items.map((item) => item.sku), ["BAT-200AH", "Inv-5KVA-01"]);
  assert.equal(page.total, 2);
  const publicInverter = page.items[1];
  assert.equal(publicInverter.costPrice, undefined);
  assert.equal(publicInverter.stockQuantity, undefined);
  assert.equal(publicInverter.lowStock, undefined);
  assert.equal(publicInverter.inStock, true);
  assert.deepEqual(publicInverter.category, { id: child.id, slug: "hybrid", name: "Hybrid" });

  const byCategory = (await expect("public products by parent category", "GET", `/products?category=${root.slug}&limit=1`, { token: null }, 200)).body.data;
  assert.equal(byCategory.total, 2);
  assert.equal(byCategory.items.length, 1);
  const search = (await expect("public product search", "GET", "/products?q=hybrid", { token: null }, 200)).body.data;
  assert.deepEqual(search.items.map((item) => item.sku), ["Inv-5KVA-01"]);
  const unknownCategory = (await expect("unknown category filter", "GET", "/products?category=nope", { token: null }, 200)).body.data;
  assert.equal(unknownCategory.total, 0);
  await expect("public page validation", "GET", "/products?page=0", { token: null }, 400, "page must be a whole number from 1 to 100000.");

  await expect("public product by slug", "GET", `/products/${product.slug}`, { token: null }, 200, "Product retrieved.");
  await expect("hidden product is not public", "GET", `/products/${hidden.id}`, { token: null }, 404, "Product not found.");
  const categories = (await expect("public categories", "GET", "/categories", { token: null }, 200, "Categories retrieved.")).body.data;
  assert.deepEqual(categories.map((item) => item.name), ["Inverters & Batteries", "Hybrid"]);
  await expect("public category by slug", "GET", `/categories/${child.slug}`, { token: null }, 200, "Category retrieved.");

  // ---- admin product list ------------------------------------------------------------------
  const hiddenOnly = (await expect("admin products by status", "GET", "/admin/products?status=hidden", {}, 200)).body.data;
  assert.deepEqual(hiddenOnly.items.map((item) => item.sku), ["HIDDEN-1"]);
  // Records written in the same millisecond may tie on updatedAt: compare the set only.
  const sortedSkus = (body) => ({ message: body?.message, skus: body?.data?.items?.map((item) => item.sku).sort() });
  const lowOnly = (await expect("admin products with low stock", "GET", "/admin/products?stock=low", { project: sortedSkus }, 200)).body.data;
  assert.deepEqual(lowOnly.items.map((item) => item.sku).sort(), ["BAT-200AH", "HIDDEN-1"]);
  await expect("admin products bad status", "GET", "/admin/products?status=gone", {}, 400, "status must be one of: active, hidden, archived.");

  // ---- capabilities -------------------------------------------------------------------------
  await expect("sales can read products", "GET", "/admin/products", { token: sales.token, project: sortedSkus }, 200);
  await expect("sales cannot write categories", "POST", "/admin/categories", { token: sales.token, body: { name: "Nope" } }, 403, FORBIDDEN);
  await expect("engineer cannot read categories", "GET", "/admin/categories", { token: engineer.token }, 403, FORBIDDEN);
  await expect("no token", "GET", "/admin/products", { token: null }, 401, "Admin authorization is required.");

  // ---- packages reference products (§4.3) -----------------------------------------------------
  // Express seeds a package catalog and the Worker does not, so package bodies are compared
  // on message and items only.
  const packageParts = (body) => ({ message: body?.message, items: body?.data?.items });
  const packageBody = {
    type: "tubular",
    name: "Starter Kit",
    kva: 5,
    load: "Fridge, TV",
    options: [{ name: "Without solar", price: 1200000, kits: "2 batteries" }],
  };
  const pack = (
    await expect("package with items", "POST", "/admin/packages", {
      body: { ...packageBody, items: [{ productId: product.id, quantity: 1 }, { productId: battery.id, quantity: 2, note: "Tubular" }] },
      project: packageParts,
    }, 201)
  ).body.data;
  assert.deepEqual(pack.items, [
    { productId: product.id, quantity: 1, note: null },
    { productId: battery.id, quantity: 2, note: "Tubular" },
  ]);
  await expect("package item with unknown product", "POST", "/admin/packages", {
    body: { ...packageBody, name: "Broken", items: [{ productId: "missing", quantity: 1 }] },
  }, 400, "Product not found.");
  const plain = (
    await expect("package without items", "POST", "/admin/packages", { body: { ...packageBody, name: "Plain Kit" }, project: packageParts }, 201)
  ).body.data;

  const publicPack = (await expect("public package with items", "GET", `/packages/${pack.id}`, { token: null }, 200)).body.data;
  assert.deepEqual(publicPack.items, [
    { productId: product.id, quantity: 1, note: null, name: "5kVA Inverter Pro", slug: product.slug, sku: "Inv-5KVA-01" },
    { productId: battery.id, quantity: 2, note: "Tubular", name: "200Ah Battery", slug: battery.slug, sku: "BAT-200AH" },
  ]);
  const publicPlain = (await expect("public package without items", "GET", `/packages/${plain.id}`, { token: null }, 200)).body.data;
  assert.deepEqual(Object.keys(publicPlain).sort(), ["_id", "category", "id", "kva", "load", "name", "options", "slug", "type", "volt"]);

  await expect("product used by a package", "DELETE", `/admin/products/${battery.id}`, {}, 409, "Product is used by a package.");
  await expect("delete unused product", "DELETE", `/admin/products/${hidden.id}`, {}, 200, "Product deleted.");
  await call("category still has products", "DELETE", `/admin/categories/${child.id}`);
  assert.equal(transcript.at(-1).status, 409);

  return transcript;
};
