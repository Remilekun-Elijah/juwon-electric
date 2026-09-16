import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names; later Tailwind classes win over conflicting earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
