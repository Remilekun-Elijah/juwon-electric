import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { created, ok } from "../services/http.js";
import {
  normalizeSlug,
  optionalBoolean,
  optionalNumber,
  optionalString,
  requiredString,
} from "../services/validators.js";

const portfolioPayload = (body, existing = {}) => {
  const name = requiredString(body, "name");

  return {
    name,
    slug: body.slug || existing.slug || normalizeSlug(name),
    image: requiredString(body, "image"),
    link: optionalString(body, "link") || existing.link || "",
    featured: optionalBoolean(body, "featured", existing.featured ?? false),
    mobile: optionalBoolean(body, "mobile", existing.mobile ?? true),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

export const listPortfolio = async (req, res) => {
  const items = await listCollection("portfolio");
  const data = req.query.featured === "true" ? items.filter((item) => item.featured) : items;
  ok(res, "Portfolio retrieved.", data);
};

export const getPortfolioItem = async (req, res) => {
  const item = await getCollectionItem("portfolio", req.params.id);
  ok(res, "Portfolio item retrieved.", item);
};

export const adminListPortfolio = async (_req, res) => {
  const items = await listCollection("portfolio", { includeInactive: true });
  ok(res, "Portfolio retrieved.", items);
};

export const adminCreatePortfolioItem = async (req, res) => {
  const item = await createCollectionItem("portfolio", portfolioPayload(req.body));
  created(res, "Portfolio item created.", item);
};

export const adminUpdatePortfolioItem = async (req, res) => {
  const existing = await getCollectionItem("portfolio", req.params.id);
  const item = await updateCollectionItem("portfolio", req.params.id, portfolioPayload(req.body, existing));
  ok(res, "Portfolio item updated.", item);
};

export const adminDeletePortfolioItem = async (req, res) => {
  const item = await deleteCollectionItem("portfolio", req.params.id);
  ok(res, "Portfolio item deleted.", item);
};
