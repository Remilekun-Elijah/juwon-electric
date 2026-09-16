import { Router } from "express";
import { contactUs, inboundContactReply } from "../controllers/contact.js";
import { quoteCart, saveCart } from "../controllers/cart.js";
import { health } from "../controllers/health.js";
import { subscribe } from "../controllers/newsletter.js";
import { placeOrder } from "../controllers/orders.js";
import { getPackage, listPackages } from "../controllers/packages.js";
import { getPortfolioItem, listPortfolio } from "../controllers/portfolio.js";
import { listServices } from "../controllers/services.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { opsPublicRouter } from "./ops.js";

const router = Router();

router.get("/health", asyncHandler(health));
router.get("/packages", asyncHandler(listPackages));
router.get("/packages/:id", asyncHandler(getPackage));
router.get("/services", asyncHandler(listServices));
router.get("/portfolio", asyncHandler(listPortfolio));
router.get("/portfolio/:id", asyncHandler(getPortfolioItem));
router.use(opsPublicRouter);

// Public writes validate the body, then apply their per-route rate limit, then
// verify Turnstile, and only then touch the database (see the controllers).
router.post("/cart/quote", quoteCart);
router.post("/cart", saveCart);
router.post("/contact", contactUs);
router.post("/subscribe", subscribe);
router.post("/order", placeOrder);

// The raw body for this route is captured in app.js (signature verification).
router.post("/webhooks/contact-reply", inboundContactReply);

export default router;
