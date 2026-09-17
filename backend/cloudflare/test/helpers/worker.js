// Calls the Worker's default export in-process against the node:sqlite D1 stand-in.
// `request(method, path, { token, body })` resolves { status, body } after every
// ctx.waitUntil task has settled, so audit writes are visible to the next call.
// `rawBody` sends bytes (or a stream) as-is; `raw: true` resolves { status, headers, bytes, body }.
// `scheduled()` runs the cron handler and waits for its tasks.
import { timingSafeEqual } from "node:crypto";
import worker from "../../src/index.js";
import { createD1 } from "./d1.js";

// workerd-only API used by src/security.js.
if (typeof crypto.subtle.timingSafeEqual !== "function") {
  const view = (value) =>
    ArrayBuffer.isView(value)
      ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : new Uint8Array(value);
  crypto.subtle.timingSafeEqual = (a, b) => timingSafeEqual(view(a), view(b));
}

export const createWorkerClient = (vars = {}) => {
  const env = { DB: createD1(), ...vars };

  const context = () => {
    const pending = [];
    const ctx = { waitUntil: (promise) => pending.push(Promise.resolve(promise).catch(() => {})) };
    const settle = async () => {
      while (pending.length) await Promise.all(pending.splice(0));
    };
    return { ctx, settle };
  };

  const request = async (method, path, { token, body, rawBody, raw = false, headers = {} } = {}) => {
    const { ctx, settle } = context();
    const isStream = rawBody && typeof rawBody.getReader === "function";
    const response = await worker.fetch(
      new Request(`http://127.0.0.1${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
        ...(isStream ? { duplex: "half" } : {}),
      }),
      env,
      ctx
    );
    await settle();
    if (raw) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const isJson = (response.headers.get("content-type") || "").startsWith("application/json");
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        bytes,
        body: isJson && bytes.length ? JSON.parse(bytes.toString("utf8")) : null,
      };
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const scheduled = async () => {
    const { ctx, settle } = context();
    await worker.scheduled({ cron: "0 7 * * *", scheduledTime: Date.now() }, env, ctx);
    await settle();
  };

  return { env, request, scheduled };
};
