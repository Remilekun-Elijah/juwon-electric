import { catalogHandlers } from "./_catalog.js";
import { notFound } from "../services/errors.js";
import { ok } from "../services/http.js";
import { getCollectionItem, listCollection } from "../services/store.js";
import {
  LIMITS,
  deriveSlug,
  optionalBoolean,
  optionalSlug,
  optionalUrl,
  requiredString,
  requiredUrl,
  sortOrderField,
} from "../services/validators.js";
import { filterPortfolio, portfolioCaseStudyPayload, serializePortfolio } from "../shared/content.js";

// Update: optional fields that are absent (or blank text) are not written.
const portfolioPayload = (body, { isUpdate }) => {
  const name = requiredString(body, "name", "Name", { max: LIMITS.portfolioName });
  const slug = optionalSlug(body);
  const image = requiredUrl(body, "image", "Image");
  const link = optionalUrl(body, "link", "Link");
  const featured = optionalBoolean(body, "featured", undefined);
  const mobile = optionalBoolean(body, "mobile", undefined);
  const isActive = optionalBoolean(body, "isActive", undefined);
  const sortOrder = sortOrderField(body);

  return {
    name,
    slug: slug ?? (isUpdate ? undefined : deriveSlug(name)),
    image,
    link: link || (isUpdate ? undefined : ""),
    featured: isUpdate ? featured : featured ?? false,
    mobile: isUpdate ? mobile : mobile ?? true,
    isActive: isUpdate ? isActive : isActive ?? true,
    sortOrder,
    // LANDING_V1 §2: category, summary, location, system; every save stores sample: false.
    ...portfolioCaseStudyPayload(body, { isUpdate }),
  };
};

const handlers = catalogHandlers({
  collection: "portfolio",
  entity: "portfolio",
  buildPayload: portfolioPayload,
  slugSource: (item) => item.name,
  serialize: serializePortfolio,
  messages: {
    create: "Portfolio item created.",
    update: "Portfolio item updated.",
    delete: "Portfolio item deleted.",
  },
});

export const listPortfolio = async (req, res) => {
  const items = await listCollection("portfolio");
  ok(res, "Portfolio retrieved.", filterPortfolio(items, req.query));
};

export const getPortfolioItem = async (req, res) => {
  const item = await getCollectionItem("portfolio", req.params.id);
  if (item.isActive === false) throw notFound("portfolio");
  ok(res, "Portfolio item retrieved.", serializePortfolio(item));
};

export const adminListPortfolio = async (_req, res) => {
  const items = await listCollection("portfolio", { includeInactive: true });
  ok(res, "Portfolio retrieved.", items.map(serializePortfolio));
};

export const adminCreatePortfolioItem = handlers.create;
export const adminUpdatePortfolioItem = handlers.update;
export const adminDeletePortfolioItem = handlers.remove;
