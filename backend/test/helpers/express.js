// Loads the Express app in-process on an ephemeral port with a throwaway JSON store.
// Environment is set before the app is imported (the store path is read at import).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const startExpress = async (vars = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "je-express-test-"));
  Object.assign(process.env, {
    NODE_ENV: "test",
    JSON_STORE_PATH: join(dir, "db.json"),
    UPLOADS_DIR: join(dir, "uploads"),
    ...vars,
  });

  const { default: app } = await import("../../app.js");
  const { connectDatabase } = await import("../../services/database.js");
  const { waitForPending } = await import("../../services/runtime.js");
  await connectDatabase();

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  // `rawBody` sends bytes (or a stream) as-is; `raw: true` resolves { status, headers, bytes, body }.
  const request = async (method, path, { token, body, rawBody, raw = false, headers = {} } = {}) => {
    const isStream = rawBody && typeof rawBody.getReader === "function";
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
      ...(isStream ? { duplex: "half" } : {}),
    });
    if (raw) {
      const bytes = Buffer.from(await response.arrayBuffer());
      await waitForPending(2000);
      const isJson = (response.headers.get("content-type") || "").startsWith("application/json");
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        bytes,
        body: isJson && bytes.length ? JSON.parse(bytes.toString("utf8")) : null,
      };
    }
    const text = await response.text();
    // Background work (audit, invite email) settles before the next call.
    await waitForPending(2000);
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await waitForPending(2000);
    rmSync(dir, { recursive: true, force: true });
  };

  return { base, request, close };
};
