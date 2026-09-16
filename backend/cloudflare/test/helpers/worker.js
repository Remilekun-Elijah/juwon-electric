// Calls the Worker's default export in-process against the node:sqlite D1 stand-in.
// `request(method, path, { token, body })` resolves { status, body } after every
// ctx.waitUntil task has settled, so audit writes are visible to the next call.
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

  const request = async (method, path, { token, body, headers = {} } = {}) => {
    const pending = [];
    const ctx = { waitUntil: (promise) => pending.push(Promise.resolve(promise).catch(() => {})) };
    const response = await worker.fetch(
      new Request(`http://127.0.0.1${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
      env,
      ctx
    );
    while (pending.length) await Promise.all(pending.splice(0));
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return { env, request };
};
