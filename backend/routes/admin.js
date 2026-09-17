import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { requireCapability } from "../middleware/capabilities.js";
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
import { clients, faqs, teamMembers, testimonials } from "../controllers/content.js";
import { adminDashboard } from "../controllers/dashboard.js";
import {
  adminDeleteSubscriber,
  adminListSubscribers,
  adminUpdateSubscriber,
} from "../controllers/newsletter.js";
import {
  adminCreateOrder,
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
  adminUpdateUser,
} from "../controllers/adminUsers.js";
import {
  adminCreateVacancy,
  adminDeleteVacancy,
  adminGetVacancy,
  adminListVacancies,
  adminPublishVacancy,
  adminUnpublishVacancy,
  adminUpdateVacancy,
} from "../controllers/vacancies.js";
import { adminUploadConfig, adminUploadImage, canUpload } from "../controllers/uploads.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { opsAdminRouter } from "./ops.js";

const router = Router();

// Limits for these routes are applied inside the handlers, after validation.
router.post("/auth/login", login);
router.post("/auth/request-password-reset", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);

router.use(adminAuth);

// Every route below needs a session. Capabilities: API_CONTRACT_V3 §1.2
// (backend/shared/capabilities.js), mirrored by the Worker's handleAdmin.
const can = requireCapability;

router.post("/auth/logout", logout);
router.get("/auth/me", me);

router.get("/dashboard", can("dashboard:read"), adminDashboard);

// Image uploads (UPLOADS_V1 §2): config for any admin; raw image bytes need content:write,
// products:write or staff:write, or for ?purpose=jobs jobs:update-own or jobs:assign (the handler
// narrows by purpose).
router.get("/uploads/config", adminUploadConfig);
router.post("/uploads", canUpload, adminUploadImage);
router.get("/audit-logs", can("audit:read"), adminListAuditLogs);

// Per-admin read status (not audited, not rate limited). No capability, but
// marking a record read needs read access to its type.
const READ_TYPE_CAPABILITY = { contacts: "leads:read", orders: "orders:read" };
const canReadType = (req, res, next) => {
  const type = req.body?.type;
  const capability =
    typeof type === "string" && Object.hasOwn(READ_TYPE_CAPABILITY, type) ? READ_TYPE_CAPABILITY[type] : null;
  return capability ? can(capability)(req, res, next) : next();
};
router.get("/reads", adminGetReads);
router.post("/reads", canReadType, adminMarkRead);
router.post("/reads/all", adminMarkAllRead);

router.get("/users", can("users:read"), adminListUsers);
router.post("/users", can("users:manage"), adminCreateUser);
router.get("/users/:id", can("users:read"), adminGetUser);
router.put("/users/:id", can("users:manage"), adminUpdateUser);
router.post("/users/:id/role", can("users:manage"), adminChangeUserRole);
router.post("/users/:id/deactivate", can("users:manage"), adminDeactivateUser);
router.post("/users/:id/reactivate", can("users:manage"), adminReactivateUser);

const contentRead = can("content:read");
const contentWrite = can("content:write");

router.get("/packages", contentRead, asyncHandler(adminListPackages));
router.post("/packages", contentWrite, asyncHandler(adminCreatePackage));
router.put("/packages/:id", contentWrite, asyncHandler(adminUpdatePackage));
router.delete("/packages/:id", contentWrite, asyncHandler(adminDeletePackage));

router.get("/services", contentRead, asyncHandler(adminListServices));
router.post("/services", contentWrite, asyncHandler(adminCreateService));
router.put("/services/:id", contentWrite, asyncHandler(adminUpdateService));
router.delete("/services/:id", contentWrite, asyncHandler(adminDeleteService));
router.post("/services/customer-segments", contentWrite, asyncHandler(adminCreateCustomerSegment));
router.put("/services/customer-segments/:id", contentWrite, asyncHandler(adminUpdateCustomerSegment));
router.delete("/services/customer-segments/:id", contentWrite, asyncHandler(adminDeleteCustomerSegment));

router.get("/portfolio", contentRead, asyncHandler(adminListPortfolio));
router.post("/portfolio", contentWrite, asyncHandler(adminCreatePortfolioItem));
router.put("/portfolio/:id", contentWrite, asyncHandler(adminUpdatePortfolioItem));
router.delete("/portfolio/:id", contentWrite, asyncHandler(adminDeletePortfolioItem));

// Website content (LANDING_V1 §1, TEAM_AND_MOTION_V1 §1).
for (const [path, handlers] of [
  ["/faqs", faqs],
  ["/testimonials", testimonials],
  ["/clients", clients],
  ["/team", teamMembers],
]) {
  router.get(path, contentRead, handlers.adminList);
  router.post(path, contentWrite, handlers.create);
  router.put(`${path}/:id`, contentWrite, handlers.update);
  router.delete(`${path}/:id`, contentWrite, handlers.remove);
}

router.get("/contacts", can("leads:read"), adminListMessages);
router.put("/contacts/:id", can("leads:write"), adminUpdateMessage);
router.delete("/contacts/:id", can("leads:write"), adminDeleteMessage);
router.post("/contacts/:id/reply", can("leads:write"), adminReplyMessage);

router.get("/newsletter", can("leads:read"), adminListSubscribers);
router.put("/newsletter/:id", can("leads:write"), adminUpdateSubscriber);
router.delete("/newsletter/:id", can("leads:write"), adminDeleteSubscriber);

router.get("/carts", can("orders:read"), adminListCarts);

router.get("/vacancies", can("vacancies:read"), adminListVacancies);
router.post("/vacancies", can("vacancies:write"), adminCreateVacancy);
router.get("/vacancies/:id", can("vacancies:read"), adminGetVacancy);
router.put("/vacancies/:id", can("vacancies:write"), adminUpdateVacancy);
router.post("/vacancies/:id/publish", can("vacancies:write"), adminPublishVacancy);
router.post("/vacancies/:id/unpublish", can("vacancies:write"), adminUnpublishVacancy);
router.delete("/vacancies/:id", can("vacancies:write"), adminDeleteVacancy);

router.get("/orders", can("orders:read"), adminListOrders);
router.post("/orders", can("orders:create"), adminCreateOrder);
router.get("/orders/:id", can("orders:read"), adminGetOrder);
router.put("/orders/:id", can("orders:update"), adminUpdateOrder);
router.delete("/orders/:id", can("orders:delete"), adminDeleteOrder);

// v3 commerce and operations modules (capability-gated).
router.use(opsAdminRouter);

export default router;
