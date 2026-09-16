import env from "dotenv";
import express from "express";
import { realpathSync } from "fs";
import { pathToFileURL } from "url";
import config from "./config.js";
import { requireJsonBody } from "./middleware/contentType.js";
import { warnIfStaticAdminToken } from "./middleware/adminAuth.js";
import { corsMiddleware, warnIfCorsOpen } from "./middleware/cors.js";
import { WEBHOOK_PATH } from "./middleware/paths.js";
import { requestId } from "./middleware/requestId.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { warnIfTurnstileDisabled } from "./middleware/turnstile.js";
import adminRouter from "./routes/admin.js";
import publicRouter from "./routes/public.js";
import { warnAuthConfig } from "./services/adminAuthService.js";
import { announceCounterStore, ensureCounterIndexes } from "./services/counterStore.js";
import { connectDatabase } from "./services/database.js";
import { ApiError, SERVICE_UNAVAILABLE_MESSAGE } from "./services/errors.js";
import { isMongoMode, waitForPending } from "./services/runtime.js";
import { backupJsonStore, ensureSecurityIndexes } from "./services/store.js";
import mongoose from "mongoose";
import userRouter from "./routes/user.js";

const app = express();
if (app.get("env") === "development") env.config();

app.disable("x-powered-by");

// Only trust X-Forwarded-For when explicitly running behind a proxy, otherwise
// clients could spoof their IP and bypass rate limits.
// TRUST_PROXY accepts a hop count (e.g. "1" on Render) or an Express trust
// proxy string such as "loopback" / "10.0.0.0/8". "true" (trust every hop) is
// not accepted: it lets clients choose their IP, so it is treated as 1.
const parseTrustProxy = (raw) => {
  const value = String(raw || "").trim();
  if (!value || value === "false" || value === "0") return false;
  if (value === "true") {
    console.warn(
      'TRUST_PROXY=true is not supported (it lets clients spoof their IP through X-Forwarded-For). Using TRUST_PROXY=1 (one proxy hop) instead; set the real hop count explicitly.'
    );
    return 1;
  }
  if (/^\d+$/.test(value)) return Number(value);
  return value;
};
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
if (trustProxy !== false) app.set("trust proxy", trustProxy);

let warnedForwardedFor = false;
const warnUntrustedForwardedFor = (req, _res, next) => {
  if (!warnedForwardedFor && trustProxy === false && req.headers["x-forwarded-for"] !== undefined) {
    warnedForwardedFor = true;
    console.warn(
      "Requests carry X-Forwarded-For but TRUST_PROXY is not set: rate limits use the proxy's address. Behind a reverse proxy (e.g. Render) set TRUST_PROXY=1."
    );
  }
  next();
};

const BODY_LIMIT = "100kb";
let shuttingDown = false;

app.use(requestId);
app.use((_req, res, next) => {
  if (shuttingDown) res.set("Connection", "close");
  next();
});
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(warnUntrustedForwardedFor);
app.use(requireJsonBody);

// The inbound reply webhook verifies a signature over the exact raw bytes, so
// it gets the raw body (Buffer); express.json skips requests already parsed.
app.post(WEBHOOK_PATH, express.raw({ type: () => true, limit: BODY_LIMIT }));
app.use(express.json({ limit: BODY_LIMIT, strict: true }));

app.use(publicRouter);
app.use("/api", publicRouter);
app.use("/admin", adminRouter);
app.use("/api/admin", adminRouter);

// Mount user routes (e.g. order, contact)
app.use(userRouter);


app.get("/", (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Juwon Electric API",
    modules: [
      "packages",
      "newsletter",
      "services",
      "portfolio",
      "contact",
      "cart",
      "orders",
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

const MONGO_UNAVAILABLE = /^Mongo(Network|NotConnected|ServerSelection|Timeout)|^MongooseServerSelection/;

app.use((error, req, res, _next) => {
  // body-parser errors
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Request body must be valid JSON." });
  }

  if (MONGO_UNAVAILABLE.test(String(error?.name || ""))) {
    console.error(`[${req.id}] Store unavailable:`, error.name, error.message);
    return res.status(503).json({ success: false, message: SERVICE_UNAVAILABLE_MESSAGE });
  }

  const statusCode = error.statusCode || error.status || 500;
  // Do not leak internal error messages (database, filesystem, etc.) to clients.
  const expose = statusCode < 500 || error instanceof ApiError;
  if (!expose) console.error(`[${req.id}] Unhandled error:`, error?.stack || describeError(error));
  res.status(statusCode).json({
    success: false,
    message: expose && error.message ? error.message : "Something went wrong.",
    details: expose ? error.details : undefined,
  });
});

const describeError = (error) => [error?.name, error?.message].filter(Boolean).join(": ");

const SHUTDOWN_TIMEOUT_MS = 10000;

const start = async () => {
  try {
    const backup = await backupJsonStore();
    if (backup) console.log("JSON store backed up.");
  } catch (error) {
    console.warn("JSON store backup failed:", describeError(error));
  }

  await connectDatabase();
  try {
    await Promise.all([ensureSecurityIndexes(), ensureCounterIndexes()]);
  } catch (error) {
    console.warn("Failed to create security indexes:", error.message);
  }
  announceCounterStore();
  warnIfCorsOpen();
  warnIfTurnstileDisabled();
  warnAuthConfig();
  warnIfStaticAdminToken();

  const server = app.listen(config.port, () => console.log("App started on port", config.port));

  // Graceful shutdown: stop accepting connections, let in-flight requests and
  // tracked background writes (audit, store, email) finish, up to 10 s.
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received: shutting down.`);
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out; exiting.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS + 500);
    forceExit.unref();

    await new Promise((resolve) => {
      server.close(resolve);
      server.closeIdleConnections?.();
      setTimeout(resolve, Math.max(deadline - Date.now(), 0)).unref();
    });
    const left = await waitForPending(Math.max(deadline - Date.now(), 0));
    if (left > 0) console.warn(`Shutdown: ${left} background task(s) did not finish.`);
    if (isMongoMode()) await mongoose.disconnect().catch(() => {});
    console.log("Shutdown complete.");
    process.exit(left > 0 ? 1 : 0);
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
};

export default app;

// Only `node app.js` (or nodemon) starts the server; tests import `app`.
const isEntryPoint =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (isEntryPoint) {
  start().catch((error) => {
    console.error("Failed to start application:", error.message);
    process.exit(1);
  });
}
