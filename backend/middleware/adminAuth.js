import { ApiError } from "../services/errors.js";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  getSigningKey,
  getStaticAdminToken,
  safeEqual,
  verifyAdminToken,
} from "../services/adminAuthService.js";

let warnedStaticToken = false;
export const warnIfStaticAdminToken = () => {
  if (!getStaticAdminToken() || warnedStaticToken) return;
  warnedStaticToken = true;
  console.warn(
    "ADMIN_TOKEN is set: this static admin token never expires and cannot be revoked. Remove it once scripts use session logins."
  );
};

export const adminAuth = async (req, _res, next) => {
  try {
    const expectedToken = getStaticAdminToken();
    const header = req.get("authorization") || "";
    const token =
      req.get("x-admin-token") || (header.startsWith("Bearer ") ? header.slice(7) : header);

    if (expectedToken && safeEqual(token, expectedToken)) {
      warnIfStaticAdminToken();
      req.adminStaticToken = true;
      return next();
    }

    // Session tokens need the signing key; a usable static token does not.
    if (!getSigningKey()) throw new ApiError(500, AUTH_NOT_CONFIGURED_MESSAGE);

    const result = await verifyAdminToken(token);
    if (!result) {
      return next(new ApiError(401, "Admin authorization is required."));
    }

    req.admin = result.admin;
    req.adminSession = result.session;
    return next();
  } catch (error) {
    return next(error);
  }
};
