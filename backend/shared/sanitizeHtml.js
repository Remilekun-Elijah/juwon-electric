// Allowlist HTML sanitiser for rich text fields (product descriptionHtml). Pure JS with
// no dependencies, so Express and the Worker store byte-identical output.
//
// Rules:
// - Only the tags in ALLOWED_TAGS survive; every other tag is dropped but its text is kept.
// - The content of script/style/iframe/object/embed/template/noscript/textarea/title/
//   select/svg/math is dropped entirely, as are comments, doctype and processing
//   instructions.
// - Only the attributes listed per tag survive. <a href> must be http(s), mailto, tel,
//   a site-relative path or a #fragment (checked after entity decoding and removal of
//   whitespace/control characters). Links get rel="noopener noreferrer nofollow", and
//   target="_blank" is the only target kept.
// - Text is re-escaped, stray "<" and ">" become entities, and open tags are closed.

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup", "small",
  "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "hr", "span",
  "ul", "ol", "li", "a",
  "table", "thead", "tbody", "tr", "th", "td",
]);

const VOID_TAGS = new Set(["br", "hr"]);

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "title"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  ol: ["start"],
};

const DROP_CONTENT_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "template", "noscript",
  "textarea", "title", "select", "svg", "math", "noembed", "noframes", "xmp", "plaintext",
]);

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", colon: ":", tab: "\t", newline: "\n" };

const decodeEntities = (value) =>
  value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = parseInt(lower.slice(2), 16);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    if (lower.startsWith("#")) {
      const code = parseInt(lower.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower) ? NAMED_ENTITIES[lower] : match;
  });

const escapeText = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

const cleanHref = (raw) => {
  const decoded = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (!decoded || decoded.length > 2048) return null;
  // Relative paths without a scheme ("page.html") are not allowed: they could hide a scheme.
  return SAFE_HREF.test(decoded) ? decoded : null;
};

const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const cleanAttributes = (tag, source) => {
  const allowed = ALLOWED_ATTRIBUTES[tag];
  const out = [];
  const seen = new Set();
  if (allowed) {
    for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
      const name = match[1].toLowerCase();
      if (!allowed.includes(name) || seen.has(name)) continue;
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (name === "href") {
        const href = cleanHref(value);
        if (href === null) continue;
        seen.add(name);
        out.push(`href="${escapeAttribute(href)}"`);
      } else if (name === "target") {
        if (decodeEntities(value).trim().toLowerCase() !== "_blank") continue;
        seen.add(name);
        out.push('target="_blank"');
      } else if (name === "colspan" || name === "rowspan" || name === "start") {
        const text = decodeEntities(value).trim();
        if (!/^\d{1,4}$/.test(text)) continue;
        seen.add(name);
        out.push(`${name}="${Number(text)}"`);
      } else {
        seen.add(name);
        out.push(`${name}="${escapeAttribute(decodeEntities(value).slice(0, 300))}"`);
      }
    }
  }
  if (tag === "a") out.push('rel="noopener noreferrer nofollow"');
  return out.length ? ` ${out.join(" ")}` : "";
};

// Text between tags: decode then re-escape, so entity tricks cannot survive as markup.
const cleanText = (value) => escapeText(decodeEntities(value));

// Attribute text may contain ">" inside quotes. The alternatives start with different
// characters, so matching stays linear.
const TAG_PATTERN = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/;

export const sanitizeHtml = (input) => {
  const html = String(input ?? "");
  let out = "";
  let position = 0;
  let textStart = 0;
  const stack = [];

  const flushText = (end) => {
    if (end > textStart) out += cleanText(html.slice(textStart, end));
  };

  while (position < html.length) {
    const lt = html.indexOf("<", position);
    if (lt === -1) break;
    const rest = html.slice(lt, lt + 4);

    // Comments, doctype, CDATA and processing instructions are removed.
    if (rest.startsWith("<!--")) {
      flushText(lt);
      const end = html.indexOf("-->", lt + 4);
      position = textStart = end === -1 ? html.length : end + 3;
      continue;
    }
    if (rest.startsWith("<!") || rest.startsWith("<?")) {
      flushText(lt);
      const end = html.indexOf(">", lt + 2);
      position = textStart = end === -1 ? html.length : end + 1;
      continue;
    }

    const match = TAG_PATTERN.exec(html.slice(lt, lt + 4096));
    if (!match) {
      // A "<" that does not start a tag is text; cleanText escapes it.
      position = lt + 1;
      continue;
    }

    flushText(lt);
    const [whole, closing, rawName, attributes] = match;
    const tag = rawName.toLowerCase();
    position = textStart = lt + whole.length;

    if (!closing && DROP_CONTENT_TAGS.has(tag)) {
      const closeTag = `</${tag}`;
      const end = html.toLowerCase().indexOf(closeTag, position);
      if (end === -1) {
        position = textStart = html.length;
      } else {
        const gt = html.indexOf(">", end);
        position = textStart = gt === -1 ? html.length : gt + 1;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      while (stack.length > index) out += `</${stack.pop()}>`;
      continue;
    }

    out += `<${tag}${cleanAttributes(tag, attributes)}>`;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }

  flushText(html.length);
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
};
