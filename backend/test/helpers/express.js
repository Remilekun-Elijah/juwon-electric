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

  const request = async (method, path, { token, body, headers = {} } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
