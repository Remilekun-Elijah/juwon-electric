import { Router } from "express";
import { contactUs, order, subscribe } from "../controllers/user.js";
const API = Router();

API.post("/contact", contactUs);
API.post("/subscribe", subscribe);
API.post("/order", order);

export default API;
