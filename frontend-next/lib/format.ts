// Port of frontend/src/utils/helper.js formatting helpers.

/** Grouped number without a currency sign, e.g. 1150000 → "1,150,000". Uses en-NG so server and client agree. */
export const getAmount = (num: number | string) => new Intl.NumberFormat("en-NG").format(Number(num) || 0);

export const slugify = (value: string | number) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
