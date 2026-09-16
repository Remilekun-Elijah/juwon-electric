import { checkStoreHealth } from "../services/store.js";

// GET /health: store reachability only (no version or environment details).
export const health = async (_req, res) => {
  if (await checkStoreHealth()) {
    res.status(200).json({ success: true, status: "ok" });
  } else {
    res.status(503).json({ success: false, status: "unavailable" });
  }
};
