import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import {
  login,
  logout,
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
import { asyncHandler } from "../services/asyncHandler.js";

const router = Router();

// Limits for these routes are applied inside the handlers, after validation.
router.post("/auth/login", login);
router.post("/auth/request-password-reset", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);

router.use(adminAuth);

router.post("/auth/logout", logout);

router.get("/dashboard", adminDashboard);
router.get("/audit-logs", adminListAuditLogs);

// Per-admin read status (not audited, not rate limited).
router.get("/reads", adminGetReads);
router.post("/reads", adminMarkRead);
router.post("/reads/all", adminMarkAllRead);

router.get("/packages", asyncHandler(adminListPackages));
router.post("/packages", asyncHandler(adminCreatePackage));
router.put("/packages/:id", asyncHandler(adminUpdatePackage));
router.delete("/packages/:id", asyncHandler(adminDeletePackage));

router.get("/services", asyncHandler(adminListServices));
router.post("/services", asyncHandler(adminCreateService));
router.put("/services/:id", asyncHandler(adminUpdateService));
router.delete("/services/:id", asyncHandler(adminDeleteService));
router.post("/services/customer-segments", asyncHandler(adminCreateCustomerSegment));
router.put("/services/customer-segments/:id", asyncHandler(adminUpdateCustomerSegment));
router.delete("/services/customer-segments/:id", asyncHandler(adminDeleteCustomerSegment));

router.get("/portfolio", asyncHandler(adminListPortfolio));
router.post("/portfolio", asyncHandler(adminCreatePortfolioItem));
router.put("/portfolio/:id", asyncHandler(adminUpdatePortfolioItem));
router.delete("/portfolio/:id", asyncHandler(adminDeletePortfolioItem));

router.get("/contacts", adminListMessages);
router.put("/contacts/:id", adminUpdateMessage);
router.delete("/contacts/:id", adminDeleteMessage);
router.post("/contacts/:id/reply", adminReplyMessage);

router.get("/newsletter", adminListSubscribers);
router.put("/newsletter/:id", adminUpdateSubscriber);
router.delete("/newsletter/:id", adminDeleteSubscriber);

router.get("/carts", adminListCarts);

router.get("/orders", adminListOrders);
router.get("/orders/:id", adminGetOrder);
router.put("/orders/:id", adminUpdateOrder);
router.delete("/orders/:id", adminDeleteOrder);

export default router;
