// Rich text sanitiser (API_CONTRACT_V3 §0.5). Pure JS with no dependencies, no Node
// built-ins and no DOM: Express and the Worker import this file and store
// byte-identical output. It is the security boundary for descriptionHtml fields.
//
// - Allowed tags: p br strong b em i u s blockquote ul ol li h2 h3 h4 a.
// - script style iframe object embed noscript template svg math are removed with
//   their content. Every other tag is unwrapped (its text is kept).
// - Only <a href> survives, and only for https:, http: or mailto: (checked after
//   entity decoding and removal of whitespace/control characters). Links always get
//   rel="noopener noreferrer nofollow" and target="_blank". Every other attribute is
//   removed, including style, class and on*.
// - Comments, doctype, CDATA and processing instructions are removed.
// - Text keeps valid entity references; stray "&", "<" and ">" are escaped, and open
//   tags are closed, so the output is well-formed.
//
// Parsing is linear (review L7): a tag's attribute section is scanned once per input
// position (memoised, so overlapping candidate tags never rescan), quoted values are
// capped, and nesting is capped at MAX_DEPTH (deeper tags are unwrapped, text kept).

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "ul", "ol", "li", "h2", "h3", "h4", "a",
]);

const VOID_TAGS = new Set(["br"]);
const BLOCK_TAGS = new Set(["p", "blockquote", "ul", "ol", "h2", "h3", "h4"]);
const HEADING_TAGS = new Set(["h2", "h3", "h4"]);

const DROP_CONTENT_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math",
]);

export const RICH_TEXT_MAX_LENGTH = 50000;
export const RICH_TEXT_TOO_LONG_MESSAGE = "Description must be 50000 characters or fewer.";

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
  colon: ":", tab: "\t", newline: "\n", sol: "/", lpar: "(", rpar: ")", period: ".",
};

// Entities are decoded only to inspect href values; decoded text is never emitted raw.
const decodeEntities = (value) =>
  value.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});?/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#")) {
      const code = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower) ? NAMED_ENTITIES[lower] : match;
  });

// Text: keep well-formed entity references, escape everything else that is markup.
const ENTITY_REFERENCE = /^&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/i;
const cleanText = (value) => {
  let out = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") out += "&lt;";
    else if (char === ">") out += "&gt;";
    else if (char === "&") {
      const match = ENTITY_REFERENCE.exec(value.slice(index, index + 40));
      out += match ? match[0] : "&amp;";
      if (match) index += match[0].length - 1;
    } else out += char;
  }
  return out;
};

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SAFE_HREF = /^(https?:|mailto:)/i;
const HREF_STRIP = /[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g;
const cleanHref = (raw) => {
  const decoded = decodeEntities(raw).replace(HREF_STRIP, "");
  if (!decoded || decoded.length > 2048) return null;
  return SAFE_HREF.test(decoded) ? decoded : null;
};

const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const linkAttributes = (source) => {
  let href = null;
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    if (match[1].toLowerCase() !== "href") continue;
    href = cleanHref(match[2] ?? match[3] ?? match[4] ?? "");
    break; // the first href wins, like a browser
  }
  const attributes = href === null ? [] : [`href="${escapeAttribute(href)}"`];
  attributes.push('rel="noopener noreferrer nofollow"', 'target="_blank"');
  return ` ${attributes.join(" ")}`;
};

// <name attributes> or </name attributes>. Quoted values may contain ">".
const MAX_NAME_LENGTH = 32;
const MAX_QUOTED_LENGTH = 2048;
const MAX_DEPTH = 100;

const isLetter = (code) => (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
const isAlphanumeric = (code) => isLetter(code) || (code >= 48 && code <= 57);

/** Sanitises untrusted HTML to the rich-text allowlist. Non-strings become "". */
export const sanitizeRichText = (input) => {
  const html = typeof input === "string" ? input : "";
  const lower = html.toLowerCase();
  const stack = [];
  let out = "";
  let position = 0;
  let textStart = 0;

  const flushText = (end) => {
    if (end > textStart) out += cleanText(html.slice(textStart, end));
  };

  // Where the attribute section starting at `start` ends: the index of the closing ">"
  // (outside quotes), or -1 when there is none. The scan from a position does not depend
  // on which "<" started it, so every position is resolved at most once:
  // memo[i] = 0 unknown, -1 no tag end, otherwise end index + 1.
  const memo = new Int32Array(html.length + 1);
  const attributesEnd = (start) => {
    const visited = [];
    let index = start;
    let result;
    for (;;) {
      if (index >= html.length) {
        result = -1;
        break;
      }
      if (memo[index] !== 0) {
        result = memo[index] - (memo[index] > 0 ? 1 : 0);
        break;
      }
      visited.push(index);
      const code = html.charCodeAt(index);
      if (code === 62) {
        result = index;
        break;
      }
      if (code === 34 || code === 39) {
        const close = html.indexOf(code === 34 ? '"' : "'", index + 1);
        if (close === -1 || close - index - 1 > MAX_QUOTED_LENGTH) {
          result = -1;
          break;
        }
        index = close + 1;
        continue;
      }
      index += 1;
    }
    const stored = result === -1 ? -1 : result + 1;
    for (const position of visited) memo[position] = stored;
    return result;
  };

  // A tag at `lt`, or null: { closing, name, attributes, end } (end = index after ">").
  const readTag = (lt) => {
    let cursor = lt + 1;
    const closing = html.charCodeAt(cursor) === 47;
    if (closing) cursor += 1;
    if (!isLetter(html.charCodeAt(cursor))) return null;
    const nameStart = cursor;
    while (cursor - nameStart < MAX_NAME_LENGTH && isAlphanumeric(html.charCodeAt(cursor))) cursor += 1;
    const gt = attributesEnd(cursor);
    if (gt === -1) return null;
    return { closing, name: html.slice(nameStart, cursor), attributes: html.slice(cursor, gt), end: gt + 1 };
  };

  // Implied end tags, as an HTML parser would apply them, so the stored markup renders
  // exactly as written: a block closes an open <p>, <li> closes the previous <li> of the
  // same list, a heading closes an open heading, and links never nest.
  const closeThrough = (index) => {
    while (stack.length > index) out += `</${stack.pop()}>`;
  };
  const closeImplied = (tag) => {
    const nearest = (names, boundaries = []) => {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (names.includes(stack[index])) return index;
        if (boundaries.includes(stack[index])) return -1;
      }
      return -1;
    };
    if (BLOCK_TAGS.has(tag)) {
      const index = nearest(["p"], ["li", "blockquote"]);
      if (index !== -1) closeThrough(index);
    }
    if (tag === "li") {
      const index = nearest(["li"], ["ul", "ol"]);
      if (index !== -1) closeThrough(index);
    }
    if (HEADING_TAGS.has(tag)) {
      const index = nearest([...HEADING_TAGS], ["li", "blockquote"]);
      if (index !== -1) closeThrough(index);
    }
    if (tag === "a") {
      const index = nearest(["a"]);
      if (index !== -1) closeThrough(index);
    }
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

    const match = readTag(lt);
    if (!match) {
      // A "<" that does not start a tag is text; cleanText escapes it.
      position = lt + 1;
      continue;
    }

    flushText(lt);
    const { closing, name, attributes, end } = match;
    const tag = name.toLowerCase();
    position = textStart = end;

    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!closing) {
        const end = lower.indexOf(`</${tag}`, position);
        const gt = end === -1 ? -1 : html.indexOf(">", end);
        position = textStart = gt === -1 ? html.length : gt + 1;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      closeThrough(index);
      continue;
    }

    closeImplied(tag);
    if (!VOID_TAGS.has(tag) && stack.length >= MAX_DEPTH) continue;
    out += `<${tag}${tag === "a" ? linkAttributes(attributes) : ""}>`;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }

  flushText(html.length);
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
};

// Alias for code written against BE-2's backend/shared/sanitizeHtml.js.
export const sanitizeHtml = sanitizeRichText;
