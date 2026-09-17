import type { Tone } from "./types";

export type StatusType = "order" | "payment" | "contact" | "newsletter" | "catalog";
export type StatusMeta = { tone: Tone; label: string };

/** Status → { tone, label } maps used by <StatusBadge>. */
export declare const statusMaps: Record<StatusType, Record<string, StatusMeta>>;
/** Default status when a record has none. */
export declare const defaultStatus: Record<StatusType, string>;
/**
 * Resolve { tone, label } for a status. Booleans map to active/inactive (newsletter) or active/hidden (catalog).
 * Unknown values fall back to a neutral tone with a sentence-cased label.
 */
export declare function getStatusMeta(type: StatusType | string, status?: string | boolean | null): StatusMeta;
