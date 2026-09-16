// Rich-text sanitiser (API_CONTRACT_V3 §0.5, decision D6). Pure JS with no Node built-ins
// and no DOM, imported by Express and the Worker so both store identical output.
// Fixtures: backend/shared/__fixtures__/richText.json (run by both test suites).
//
// - Allowed tags: p br strong b em i u s blockquote ul ol li h2 h3 h4 a.
// - script style iframe object embed noscript template svg math are removed with their
//   content. Every other tag is unwrapped (its text is kept). Comments, doctype and
//   processing instructions are removed.
// - Every attribute is removed except href on <a>. href must be https:, http: or mailto:
//   (checked after entity decoding and removal of whitespace and control characters),
//   otherwise it is dropped. Links always get rel="noopener noreferrer nofollow" and
//   target="_blank".
// - Text keeps valid entities, and bare "&", "<" and ">" are escaped. Open tags are
//   closed at the end, so the output is well-formed.

const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "ul", "ol", "li", "h2", "h3", "h4", "a"]);
const VOID_TAGS = new Set(["br"]);
const REMOVE_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "noscript", "template", "svg", "math"]);
// Removed like REMOVE_WITH_CONTENT, but these never have content or a closing tag.
const REMOVE_VOID = new Set(["embed"]);

const LINK_ATTRIBUTES = 'rel="noopener noreferrer nofollow" target="_blank"';
const SAFE_SCHEME = /^(https?:|mailto:)/i;

// A complete character reference: &name; &#123; &#x1f;
const ENTITY_AT = /^&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});/;

const escapeText = (value) => {
  let out = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") out += "&lt;";
    else if (char === ">") out += "&gt;";
    else if (char === "&") out += ENTITY_AT.test(value.slice(index, index + 40)) ? "&" : "&amp;";
    else out += char;
  }
  return out;
};

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t", newline: "\n", sol: "/", lpar: "(", rpar: ")" };

const codePoint = (code) => (Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "");

// Decodes character references (with or without the trailing ";", as browsers do in attributes).
const decodeEntities = (value) =>
  value.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);?/g, (match, entity) => {
    if (entity[0] === "#") {
      return entity[1] === "x" || entity[1] === "X"
        ? codePoint(parseInt(entity.slice(2), 16))
        : codePoint(parseInt(entity.slice(1), 10));
    }
    const named = NAMED[entity.toLowerCase()];
    return named === undefined ? match : named;
  });

// Removes ASCII whitespace, C0/C1 control characters and DEL, which browsers ignore
// inside URL schemes ("java\tscript:").
const withoutControls = (value) =>
  [...value]
    .filter((char) => {
      const code = char.codePointAt(0);
      return code > 0x20 && (code < 0x7f || code > 0x9f);
    })
    .join("");

const cleanHref = (raw) => {
  const decoded = decodeEntities(raw).trim();
  if (!decoded || decoded.length > 2048) return null;
  return SAFE_SCHEME.test(withoutControls(decoded)) ? decoded : null;
};

// Attribute text may contain ">" inside quotes. The alternatives start with different
// characters, so matching stays linear.
const TAG_PATTERN = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/;
const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const linkAttributes = (source) => {
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    if (match[1].toLowerCase() !== "href") continue;
    const href = cleanHref(match[2] ?? match[3] ?? match[4] ?? "");
    return href === null ? ` ${LINK_ATTRIBUTES}` : ` href="${escapeAttribute(href)}" ${LINK_ATTRIBUTES}`;
  }
  return ` ${LINK_ATTRIBUTES}`;
};

export const sanitizeRichText = (input) => {
  const html = typeof input === "string" ? input : String(input ?? "");
  const stack = [];
  let out = "";
  let position = 0;
  let textStart = 0;

  const flushText = (end) => {
    if (end > textStart) out += escapeText(html.slice(textStart, end));
  };

  while (position < html.length) {
    const lt = html.indexOf("<", position);
    if (lt === -1) break;

    if (html.startsWith("<!--", lt)) {
      flushText(lt);
      const end = html.indexOf("-->", lt + 4);
      position = textStart = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      flushText(lt);
      const end = html.indexOf(">", lt + 2);
      position = textStart = end === -1 ? html.length : end + 1;
      continue;
    }

    const match = TAG_PATTERN.exec(html.slice(lt, lt + 8192));
    if (!match) {
      // Not a tag: the "<" stays text and is escaped when flushed.
      position = lt + 1;
      continue;
    }

    flushText(lt);
    const [whole, closing, rawName, attributes] = match;
    const tag = rawName.toLowerCase();
    position = textStart = lt + whole.length;

    if (REMOVE_WITH_CONTENT.has(tag)) {
      if (closing) continue;
      // Case-insensitive search on the original string (toLowerCase can change lengths).
      const closer = new RegExp(`</${tag}`, "ig");
      closer.lastIndex = position;
      const end = closer.exec(html)?.index ?? -1;
      const gt = end === -1 ? -1 : html.indexOf(">", end);
      position = textStart = gt === -1 ? html.length : gt + 1;
      continue;
    }

    if (REMOVE_VOID.has(tag) || !ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      while (stack.length > index) out += `</${stack.pop()}>`;
      continue;
    }

    out += tag === "a" ? `<a${linkAttributes(attributes)}>` : `<${tag}>`;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }

  flushText(html.length);
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
};
