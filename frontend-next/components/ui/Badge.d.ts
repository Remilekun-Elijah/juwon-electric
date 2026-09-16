import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { StatusType } from "./statusMaps";
import type { Tone } from "./types";

type SpanProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/**
 * Badge / pill. Props: tone (neutral|brand|success|warning|danger|info; `variant` is accepted as an alias),
 * dot (leading current-color dot), className, children.
 */
export declare function Badge(
  props: SpanProps & { tone?: Tone; variant?: Tone; dot?: boolean; children?: ReactNode }
): ReactElement;

/**
 * StatusBadge. Props: type ("order"|"payment"|"contact"|"newsletter"|"catalog"), status (string or boolean for
 * newsletter/catalog isActive; empty uses the type's default), label (override), dot, className.
 */
export declare function StatusBadge(
  props: SpanProps & { type: StatusType; status?: string | boolean | null; label?: ReactNode; dot?: boolean }
): ReactElement;

export default Badge;
