import { Router } from "express";
import { contactUs, inboundContactReply } from "../controllers/contact.js";
import { quoteCart, saveCart } from "../controllers/cart.js";
import { subscribe } from "../controllers/newsletter.js";
import { placeOrder } from "../controllers/orders.js";
import { getPackage, listPackages } from "../controllers/packages.js";
import { getPortfolioItem, listPortfolio } from "../controllers/portfolio.js";
import { listServices } from "../controllers/services.js";
import { asyncHandler } from "../services/asyncHandler.js";

const router = Router();

router.get("/packages", asyncHandler(listPackages));
router.get("/packages/:id", asyncHandler(getPackage));
router.get("/services", asyncHandler(listServices));
router.get("/portfolio", asyncHandler(listPortfolio));
router.get("/portfolio/:id", asyncHandler(getPortfolioItem));
router.post("/cart/quote", quoteCart);
router.post("/cart", saveCart);

router.post("/contact", contactUs);
router.post("/webhooks/contact-reply", inboundContactReply);
router.post("/subscribe", subscribe);
router.post("/order", placeOrder);

export default router;
