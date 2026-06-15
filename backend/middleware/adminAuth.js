import { ApiError } from "../services/errors.js";
import { verifyAdminToken } from "../services/adminAuthService.js";

export const adminAuth = async (req, _res, next) => {
  try {
    const expectedToken = process.env.ADMIN_TOKEN;
    const token = req.get("x-admin-token") || req.get("authorization")?.replace("Bearer ", "");

    if (expectedToken && token === expectedToken) return next();

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return next(new ApiError(401, "Admin authorization is required."));
    }

    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
};
