// v3 commerce and operations routes (BE-2). The admin router is mounted inside
// routes/admin.js after adminAuth; every route is capability-gated.
import { Router } from "express";
import {
  adminCreateCategory,
  adminCreateProduct,
  adminDeleteCategory,
  adminDeleteProduct,
  adminGetProduct,
  adminListCategories,
  adminListProducts,
  adminUpdateCategory,
  adminUpdateProduct,
  getPublicCategory,
  getPublicProduct,
  listPublicCategories,
  listPublicProducts,
} from "../controllers/catalog.js";
import { requireCapability as can } from "../middleware/capabilities.shim.js";

export const opsPublicRouter = Router();

opsPublicRouter.get("/categories", listPublicCategories);
opsPublicRouter.get("/categories/:id", getPublicCategory);
opsPublicRouter.get("/products", listPublicProducts);
opsPublicRouter.get("/products/:id", getPublicProduct);

export const opsAdminRouter = Router();

opsAdminRouter.get("/categories", can("catalog:read"), adminListCategories);
opsAdminRouter.post("/categories", can("catalog:write"), adminCreateCategory);
opsAdminRouter.put("/categories/:id", can("catalog:write"), adminUpdateCategory);
opsAdminRouter.delete("/categories/:id", can("catalog:write"), adminDeleteCategory);

opsAdminRouter.get("/products", can("catalog:read"), adminListProducts);
opsAdminRouter.post("/products", can("catalog:write"), adminCreateProduct);
opsAdminRouter.get("/products/:id", can("catalog:read"), adminGetProduct);
opsAdminRouter.put("/products/:id", can("catalog:write"), adminUpdateProduct);
opsAdminRouter.delete("/products/:id", can("catalog:write"), adminDeleteProduct);
