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
import {
  adminAssignJob,
  adminCreateJob,
  adminDeleteJob,
  adminGetJob,
  adminGetStaff,
  adminJobStatus,
  adminListJobs,
  adminListStaff,
  adminUpdateJob,
  adminUpdateStaff,
  myGetJob,
  myJobStatus,
  myListJobs,
  myUpdateJob,
} from "../controllers/jobs.js";
import { adminAssignOrderEngineer, adminMarkOrderPaid, adminOrderFulfillment } from "../controllers/orders.js";
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

// Orders and fulfilment (§6.4). GET/PUT/DELETE /orders[/:id] stay on routes/admin.js.
opsAdminRouter.post("/orders/:id/fulfillment", can("orders:update"), adminOrderFulfillment);
opsAdminRouter.post("/orders/:id/mark-paid", can("orders:update"), adminMarkOrderPaid);
opsAdminRouter.post("/orders/:id/assign-engineer", can("orders:update"), adminAssignOrderEngineer);

// Installation jobs (§7.2), engineer-scoped jobs (§7.3) and staff (§7.4).
opsAdminRouter.get("/jobs", can("jobs:read"), adminListJobs);
opsAdminRouter.post("/jobs", can("jobs:assign"), adminCreateJob);
opsAdminRouter.get("/jobs/:id", can("jobs:read"), adminGetJob);
opsAdminRouter.put("/jobs/:id", can("jobs:assign"), adminUpdateJob);
opsAdminRouter.delete("/jobs/:id", can("jobs:assign"), adminDeleteJob);
opsAdminRouter.post("/jobs/:id/assign", can("jobs:assign"), adminAssignJob);
opsAdminRouter.post("/jobs/:id/status", can("jobs:assign"), adminJobStatus);

opsAdminRouter.get("/me/jobs", can("jobs:update-own"), myListJobs);
opsAdminRouter.get("/me/jobs/:id", can("jobs:update-own"), myGetJob);
opsAdminRouter.put("/me/jobs/:id", can("jobs:update-own"), myUpdateJob);
opsAdminRouter.post("/me/jobs/:id/status", can("jobs:update-own"), myJobStatus);

opsAdminRouter.get("/staff", can("staff:read"), adminListStaff);
opsAdminRouter.get("/staff/:id", can("staff:read"), adminGetStaff);
opsAdminRouter.put("/staff/:id", can("staff:write"), adminUpdateStaff);
