import { asyncHandler } from "../services/asyncHandler.js";
import { ApiError, badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import {
  createPasswordReset,
  loginAdmin,
  resetAdminPassword,
} from "../services/adminAuthService.js";
import { requiredString } from "../services/validators.js";

export const login = asyncHandler(async (req, res) => {
  const result = await loginAdmin({
    username: requiredString(req.body, "username", "Username"),
    password: requiredString(req.body, "password", "Password"),
  });

  if (!result) throw new ApiError(401, "Invalid username or password.");
  ok(res, "Login successful.", result);
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const reset = await createPasswordReset(
    requiredString(req.body, "username", "Username")
  );

  if (!reset) {
    ok(res, "If the account exists, a reset token has been generated.");
    return;
  }

  const data =
    process.env.NODE_ENV === "production"
      ? { email: reset.email, expiresAt: reset.expiresAt }
      : reset;

  created(res, "Password reset token generated.", data);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const password = requiredString(req.body, "password", "New password");
  if (password.length < 8) {
    throw badRequest("Password must be at least 8 characters.");
  }

  const success = await resetAdminPassword({
    username: requiredString(req.body, "username", "Username"),
    token: requiredString(req.body, "token", "Reset token"),
    password,
  });

  if (!success) throw new ApiError(400, "Invalid or expired reset token.");
  ok(res, "Password reset successful.");
});
