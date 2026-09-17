// In-memory R2 bucket stand-in for the Worker tests (UPLOADS_V1 §8): put, get, head, delete
// (one key or a list) and list, with httpMetadata, size and httpEtag like R2 objects.
import { createHash } from "node:crypto";

const toBytes = async (value) => {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value && typeof value.getReader === "function") return new Uint8Array(await new Response(value).arrayBuffer());
  throw new TypeError("R2Stub.put: unsupported value");
};

const objectInfo = (key, entry) => ({
  key,
  size: entry.bytes.byteLength,
  etag: entry.etag,
  httpEtag: `"${entry.etag}"`,
  uploaded: entry.uploaded,
  httpMetadata: { ...entry.httpMetadata },
  customMetadata: { ...entry.customMetadata },
});

export class R2Stub {
  constructor() {
    this.objects = new Map();
    this.failPut = false;
  }

  async put(key, value, options = {}) {
    if (this.failPut) throw new Error("R2 put failed");
    const bytes = await toBytes(value);
    const entry = {
      bytes,
      etag: createHash("md5").update(bytes).digest("hex"),
      uploaded: new Date(),
      httpMetadata: options.httpMetadata || {},
      customMetadata: options.customMetadata || {},
    };
    this.objects.set(key, entry);
    return objectInfo(key, entry);
  }

  async head(key) {
    const entry = this.objects.get(key);
    return entry ? objectInfo(key, entry) : null;
  }

  async get(key) {
    const entry = this.objects.get(key);
    if (!entry) return null;
    const bytes = new Uint8Array(entry.bytes);
    return {
      ...objectInfo(key, entry),
      body: new Response(bytes).body,
      arrayBuffer: async () => bytes.buffer.slice(0),
      text: async () => new TextDecoder().decode(bytes),
      writeHttpMetadata: (headers) => {
        if (entry.httpMetadata.contentType) headers.set("Content-Type", entry.httpMetadata.contentType);
      },
    };
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }

  async list({ prefix = "", limit = 1000 } = {}) {
    const keys = [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit);
    return { objects: keys.map((key) => objectInfo(key, this.objects.get(key))), truncated: false, delimitedPrefixes: [] };
  }
}
