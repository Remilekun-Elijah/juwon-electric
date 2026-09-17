// Test kit for the BE-2 module scenarios (catalog, inventory, orders, jobs, settings,
// notifications, dashboard). Scenarios are runtime-agnostic and receive a `client`:
//   { request(method, path, { token, body }), seedAdmin(role, extra?) -> { id, email, token },
//     seedRecord(collection, record) -> stored record (bypasses the API), emails }
// `emails` collects every email the runtime sends as { to: string[], subject, html }.
// Runners: backend/test/<module>.test.js (Express), backend/cloudflare/test/<module>.test.js
// (Worker) and backend/test/parity/<module>.parity.test.js (both, deep-compared after masking).
import assert from "node:assert/strict";

export const STATIC_TOKEN = "static-admin-token-for-ops-tests-0123456789";
export const PASSWORD = "Ops-Strong-Passw0rd-2026";
export const ALERT_MAILBOX = "alerts@juwon.test";

export const OPS_ENV = {
  ADMIN_AUTH_SECRET: "ops-test-signing-secret-0123456789abcdefghij",
  ADMIN_TOKEN: STATIC_TOKEN,
  TURNSTILE_DISABLED: "true",
};

// Express sends through nodemailer when SMTP is configured; the Worker through Resend.
export const EXPRESS_MAIL_ENV = { SMTP_USER: "smtp-user", SMTP_SECRET: "smtp-secret", SMTP_FROM: ALERT_MAILBOX };
export const WORKER_MAIL_ENV = { RESEND_API_KEY: "re_test_key", MAIL_FROM: ALERT_MAILBOX, ADMIN_NOTIFY_EMAIL: ALERT_MAILBOX };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Seeded emails are numbered per client, so both runtimes seed the same addresses.
const emailSequence = () => {
  let seeded = 0;
  return (role) => `${role}.${(seeded += 1)}@ops.juwon.test`;
};

const login = async (request, email) => {
  const response = await request("POST", "/admin/auth/login", { body: { username: email, password: PASSWORD } });
  assert.equal(response.status, 200, `login ${email}: ${JSON.stringify(response.body)}`);
  return response.body.data.token;
};

/** Express client: in-process app (backend/test/helpers/express.js) plus admin seeding and mail capture. */
export const expressOpsClient = async () => {
  const nodemailer = (await import("nodemailer")).default;
  const emails = [];
  nodemailer.createTransport = () => ({
    sendMail: async (packet) => {
      emails.push({ to: toList(packet.to), subject: packet.subject, html: packet.html });
      return { messageId: `test-${emails.length}` };
    },
  });
  const { startExpress } = await import("../helpers/express.js");
  const server = await startExpress({ ...OPS_ENV, ...EXPRESS_MAIL_ENV });
  const store = await import("../../services/store.js");
  const { hashPassword } = await import("../../services/adminAuthService.js");
  const seedEmail = emailSequence();
  return {
    name: "express",
    request: server.request,
    emails,
    close: server.close,
    seedRecord: (collection, record) => store.createCollectionItem(collection, record),
    async seedAdmin(role, extra = {}) {
      const email = seedEmail(role);
      const admin = await store.createCollectionItem("admins", {
        name: `${role} user`,
        email,
        role,
        passwordHash: await hashPassword(PASSWORD),
        isActive: true,
        ...extra,
      });
      return { id: admin.id, email, token: admin.isActive === false ? null : await login(server.request, email) };
    },
  };
};

/** Worker client: default export against the node:sqlite D1 stand-in, with Resend captured. */
export const workerOpsClient = async () => {
  const emails = [];
  const realFetch = globalThis.fetch;
  if (!realFetch.opsCapture) {
    const capture = async (input, init) => {
      const target = typeof input === "string" ? input : input.url;
      if (String(target).startsWith("https://api.resend.com/emails")) {
        const body = JSON.parse(init.body);
        capture.sinks.forEach((sink) => sink.push({ to: toList(body.to), subject: body.subject, html: body.html }));
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }
      return realFetch(input, init);
    };
    capture.opsCapture = true;
    capture.sinks = [];
    globalThis.fetch = capture;
  }
  globalThis.fetch.sinks.push(emails);

  const { createWorkerClient } = await import("../../cloudflare/test/helpers/worker.js");
  const client = createWorkerClient({ ...OPS_ENV, ...WORKER_MAIL_ENV });
  const store = await import("../../cloudflare/src/store.js");
  const { hashPassword } = await import("../../cloudflare/src/auth.js");
  const seedEmail = emailSequence();
  return {
    name: "worker",
    request: client.request,
    env: client.env,
    emails,
    close: async () => {
      globalThis.fetch.sinks = globalThis.fetch.sinks.filter((sink) => sink !== emails);
    },
    // A record's own id is kept (as the Express store does).
    seedRecord: (collection, record) => store.createCollectionItem(client.env, collection, record, { id: record.id }),
    async seedAdmin(role, extra = {}) {
      const email = seedEmail(role);
      const admin = await store.createCollectionItem(client.env, "admins", {
        name: `${role} user`,
        email,
        role,
        passwordHash: await hashPassword(PASSWORD),
        isActive: true,
        ...extra,
      });
      return { id: admin.id, email, token: admin.isActive === false ? null : await login(client.request, email) };
    },
  };
};

/**
 * Records every response for parity. `expect(label, method, path, options, status, message?)`
 * asserts status (and message) and returns the response. `options.project(body)` limits what
 * the transcript keeps (for bodies that depend on runtime seed data, e.g. package sortOrder).
 */
export const recorder = (client) => {
  const transcript = [];
  const call = async (label, method, path, { project, ...options } = {}) => {
    const response = await client.request(method, path, { token: STATIC_TOKEN, ...options });
    const body = project ? project(response.body) : response.body;
    transcript.push({ label, method, path, status: response.status, body });
    return response;
  };
  const expect = async (label, method, path, options, status, message) => {
    const response = await call(label, method, path, options);
    assert.equal(response.status, status, `${label}: ${JSON.stringify(response.body)}`);
    if (message !== undefined) assert.equal(response.body?.message, message, label);
    return response;
  };
  return { transcript, call, expect };
};

// Values that differ between runtimes by construction: ids, timestamps and tokens.
const MASKED = (key) =>
  key === "id" || key === "_id" || key === "doneBy" || key === "token" || /Id$/.test(key) || /Ids$/.test(key) || /At$/.test(key);

export const maskOps = (value, key = "") => {
  // Id lists (engineerIds): each entry is masked under the list's key.
  if (Array.isArray(value)) return value.map((entry) => maskOps(entry, /Ids$/.test(key) ? key : ""));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, maskOps(entry, name)]));
  }
  return MASKED(key) && value !== null && value !== undefined ? `<${key}>` : value;
};

/** Deep-compares two transcripts step by step (status and masked body). */
export const assertParity = (expressTranscript, workerTranscript) => {
  assert.equal(workerTranscript.length, expressTranscript.length, "transcript length");
  expressTranscript.forEach((step, index) => {
    const other = workerTranscript[index];
    assert.equal(other.label, step.label);
    assert.deepEqual(
      { status: other.status, body: maskOps(other.body) },
      { status: step.status, body: maskOps(step.body) },
      `parity mismatch at "${step.label}" (${step.method} ${step.path})`
    );
  });
};
