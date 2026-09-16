import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { requireCapability } from "../middleware/capability.js";
import {
  login,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
} from "../controllers/adminAuth.js";
import { adminGetReads, adminMarkAllRead, adminMarkRead } from "../controllers/adminReads.js";
import { adminListAuditLogs } from "../controllers/auditLogs.js";
import { adminListCarts } from "../controllers/cart.js";
import {
  adminDeleteMessage,
  adminListMessages,
  adminReplyMessage,
  adminUpdateMessage,
} from "../controllers/contact.js";
import { adminDashboard } from "../controllers/dashboard.js";
import {
  adminDeleteSubscriber,
  adminListSubscribers,
  adminUpdateSubscriber,
} from "../controllers/newsletter.js";
import {
  adminDeleteOrder,
  adminGetOrder,
  adminListOrders,
  adminUpdateOrder,
} from "../controllers/orders.js";
import {
  adminCreatePackage,
  adminDeletePackage,
  adminListPackages,
  adminUpdatePackage,
} from "../controllers/packages.js";
import {
  adminCreatePortfolioItem,
  adminDeletePortfolioItem,
  adminListPortfolio,
  adminUpdatePortfolioItem,
} from "../controllers/portfolio.js";
import {
  adminCreateCustomerSegment,
  adminCreateService,
  adminDeleteCustomerSegment,
  adminDeleteService,
  adminListServices,
  adminUpdateCustomerSegment,
  adminUpdateService,
} from "../controllers/services.js";
import {
  adminChangeUserRole,
  adminCreateUser,
  adminDeactivateUser,
  adminGetUser,
  adminListUsers,
  adminReactivateUser,
} from "../controllers/adminUsers.js";
import { asyncHandler } from "../services/asyncHandler.js";

const router = Router();

// Limits for these routes are applied inside the handlers, after validation.
router.post("/auth/login", login);
router.post("/auth/request-password-reset", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);

router.use(adminAuth);

// Every route below needs a signed-in admin; capabilities come from
// services/roles.js (mirrored by the Worker). /auth/logout, /auth/me and the
// read-status list need no capability.
const can = requireCapability;

router.post("/auth/logout", logout);
router.get("/auth/me", me);

router.get("/dashboard", can("dashboard:read"), adminDashboard);
router.get("/audit-logs", can("audit:read"), adminListAuditLogs);

// Per-admin read status (not audited, not rate limited). Marking a record read
// needs read access to that record type.
const canReadType = (req, res, next) =>
  ["contacts", "orders"].includes(req.body?.type)
    ? can(`${req.body.type}:read`)(req, res, next)
    : next();
router.get("/reads", adminGetReads);
router.post("/reads", canReadType, adminMarkRead);
router.post("/reads/all", adminMarkAllRead);

router.get("/users", can("users:read"), adminListUsers);
router.post("/users", can("users:write"), adminCreateUser);
router.get("/users/:id", can("users:read"), adminGetUser);
router.put("/users/:id/role", can("users:write"), adminChangeUserRole);
router.post("/users/:id/deactivate", can("users:write"), adminDeactivateUser);
router.post("/users/:id/reactivate", can("users:write"), adminReactivateUser);

const catalogRead = can("catalog:read");
const catalogWrite = can("catalog:write");

router.get("/packages", catalogRead, asyncHandler(adminListPackages));
router.post("/packages", catalogWrite, asyncHandler(adminCreatePackage));
router.put("/packages/:id", catalogWrite, asyncHandler(adminUpdatePackage));
router.delete("/packages/:id", catalogWrite, asyncHandler(adminDeletePackage));

router.get("/services", catalogRead, asyncHandler(adminListServices));
router.post("/services", catalogWrite, asyncHandler(adminCreateService));
router.put("/services/:id", catalogWrite, asyncHandler(adminUpdateService));
router.delete("/services/:id", catalogWrite, asyncHandler(adminDeleteService));
router.post("/services/customer-segments", catalogWrite, asyncHandler(adminCreateCustomerSegment));
router.put("/services/customer-segments/:id", catalogWrite, asyncHandler(adminUpdateCustomerSegment));
router.delete("/services/customer-segments/:id", catalogWrite, asyncHandler(adminDeleteCustomerSegment));

router.get("/portfolio", catalogRead, asyncHandler(adminListPortfolio));
router.post("/portfolio", catalogWrite, asyncHandler(adminCreatePortfolioItem));
router.put("/portfolio/:id", catalogWrite, asyncHandler(adminUpdatePortfolioItem));
router.delete("/portfolio/:id", catalogWrite, asyncHandler(adminDeletePortfolioItem));

router.get("/contacts", can("contacts:read"), adminListMessages);
router.put("/contacts/:id", can("contacts:write"), adminUpdateMessage);
router.delete("/contacts/:id", can("contacts:write"), adminDeleteMessage);
router.post("/contacts/:id/reply", can("contacts:write"), adminReplyMessage);

router.get("/newsletter", can("newsletter:read"), adminListSubscribers);
router.put("/newsletter/:id", can("newsletter:write"), adminUpdateSubscriber);
router.delete("/newsletter/:id", can("newsletter:write"), adminDeleteSubscriber);

router.get("/carts", can("carts:read"), adminListCarts);

router.get("/orders", can("orders:read"), adminListOrders);
router.get("/orders/:id", can("orders:read"), adminGetOrder);
router.put("/orders/:id", can("orders:write"), adminUpdateOrder);
router.delete("/orders/:id", can("orders:write"), adminDeleteOrder);

export default router;
