// v3 commerce and operations routes (BE-2, API_CONTRACT_V3 §4-9). The public router is
// mounted by routes/public.js; the admin router inside routes/admin.js after adminAuth.
// Every admin route is capability-gated (§1.2).
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
import {
  adminAdjustStock,
  adminListInventory,
  adminListMovements,
  adminLowStockCheck,
} from "../controllers/inventory.js";
import { requireCapability as can } from "../middleware/capabilities.js";

export const opsPublicRouter = Router();

opsPublicRouter.get("/categories", listPublicCategories);
opsPublicRouter.get("/categories/:id", getPublicCategory);
opsPublicRouter.get("/products", listPublicProducts);
opsPublicRouter.get("/products/:id", getPublicProduct);

export const opsAdminRouter = Router();

opsAdminRouter.get("/categories", can("products:read"), adminListCategories);
opsAdminRouter.post("/categories", can("products:write"), adminCreateCategory);
opsAdminRouter.put("/categories/:id", can("products:write"), adminUpdateCategory);
opsAdminRouter.delete("/categories/:id", can("products:write"), adminDeleteCategory);

opsAdminRouter.get("/products", can("products:read"), adminListProducts);
opsAdminRouter.post("/products", can("products:write"), adminCreateProduct);
opsAdminRouter.get("/products/:id", can("products:read"), adminGetProduct);
opsAdminRouter.put("/products/:id", can("products:write"), adminUpdateProduct);
opsAdminRouter.delete("/products/:id", can("products:write"), adminDeleteProduct);

opsAdminRouter.get("/inventory", can("inventory:read"), adminListInventory);
opsAdminRouter.post("/inventory/adjustments", can("inventory:adjust"), adminAdjustStock);
opsAdminRouter.get("/inventory/movements", can("inventory:read"), adminListMovements);
opsAdminRouter.post("/inventory/low-stock-check", can("inventory:adjust"), adminLowStockCheck);
