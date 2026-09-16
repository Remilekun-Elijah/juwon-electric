import { randomUUID } from "crypto";

const INCOMING_ID = /^[A-Za-z0-9-]{8,64}$/;

// Every response carries X-Request-Id: the caller's id when it looks safe,
// otherwise a new one. Server error logs include it.
export const requestId = (req, res, next) => {
  const incoming = req.get("x-request-id");
  req.id = typeof incoming === "string" && INCOMING_ID.test(incoming) ? incoming : randomUUID();
  res.set("X-Request-Id", req.id);
  next();
};
