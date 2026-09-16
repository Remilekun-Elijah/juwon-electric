/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
};

const tints = ["bg-brand-100 text-brand-700", "bg-slate-100 text-slate-700"];

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? "";
  return `${first}${last}`.toUpperCase();
};

const getTint = (name = "") => {
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tints[hash % tints.length];
};

/**
 * Avatar. Props: name (initials + deterministic brand/slate tint), src (image; falls back to initials on error),
 * alt (defaults to name), size (sm|md|lg|xl), className. Pass decorative (aria-hidden) when the name is shown next to it.
 */
export function Avatar({ name, src, alt, size = "md", decorative = false, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const base = cn(
    "inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold",
    sizes[size] ?? sizes.md,
    className
  );

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={decorative ? "" : alt ?? name ?? ""}
        onError={() => setFailed(true)}
        loading="lazy"
        className={cn(base, "bg-slate-100 object-cover")}
      />
    );
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt ?? name}
      aria-hidden={decorative || undefined}
      className={cn(getTint(name), base)}
    >
      {getInitials(name)}
    </span>
  );
}

export default Avatar;
