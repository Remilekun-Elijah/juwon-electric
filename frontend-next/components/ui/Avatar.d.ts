import type { ReactElement } from "react";

/**
 * Avatar. Props: name (initials + deterministic brand/slate tint), src (image; falls back to initials on error),
 * alt (defaults to name), size (sm|md|lg|xl), className. Pass decorative (aria-hidden) when the name is shown next to it.
 */
export declare function Avatar(props: {
  name?: string;
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  decorative?: boolean;
  className?: string;
}): ReactElement;

export default Avatar;
