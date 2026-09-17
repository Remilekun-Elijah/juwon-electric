// Query parameters with Express semantics (review L2): Express parses a repeated
// parameter (?role=a&role=b) into an array, so validators reject it. URLSearchParams.get
// would silently take the first value; these helpers pass the array through instead.
import { badRequest } from "./http.js";
import { pageParams } from "./validation.js";

/** undefined when absent, the string when given once, an array when repeated. */
export const queryValue = (params, name) => {
  const values = params.getAll(name);
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
};

/** pageParams, with a repeated page/limit rejected like Express does. */
export const pageQuery = (params) => {
  if (params.getAll("page").length > 1) badRequest("page must be a whole number from 1 to 100000.");
  if (params.getAll("limit").length > 1) badRequest("limit must be a positive whole number.");
  return pageParams(params);
};
