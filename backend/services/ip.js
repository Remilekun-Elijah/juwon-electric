// Client IP helpers shared by rate limits, lockouts, audit logs and Turnstile.
import { isIP } from "net";

const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** Full client IP, normalized: IPv4-mapped IPv6 unwrapped, IPv6 lowercased. null when unknown. */
export const normalizeIp = (value) => {
  if (typeof value !== "string") return null;
  let ip = value.trim().toLowerCase();
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  const mapped = ip.match(MAPPED_IPV4);
  if (mapped) ip = mapped[1];
  return isIP(ip) ? ip : null;
};

// Expands an IPv6 address into its 8 hextets (numbers).
const ipv6Hextets = (ip) => {
  let text = ip;
  // Embedded IPv4 tail (e.g. ::ffff:1.2.3.4 that is not a plain mapped address).
  const v4 = text.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    text = `${text.slice(0, v4.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail === undefined ? [] : tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  const parts = tail === undefined ? headParts : [...headParts, ...Array(missing).fill("0"), ...tailParts];
  return parts.map((part) => parseInt(part || "0", 16));
};

/** Rate-limit key part: IPv4 as-is, IPv6 as its /64 prefix ("2001:db8:0:0::/64"), "unknown" otherwise. */
export const ipPrefix = (value) => {
  const ip = normalizeIp(value);
  if (!ip) return "unknown";
  if (isIP(ip) === 4) return ip;
  const hextets = ipv6Hextets(ip);
  return `${hextets.slice(0, 4).map((part) => part.toString(16)).join(":")}::/64`;
};

export const requestIp = (req) => normalizeIp(req?.ip || req?.socket?.remoteAddress || "");
export const requestIpPrefix = (req) => ipPrefix(req?.ip || req?.socket?.remoteAddress || "");
