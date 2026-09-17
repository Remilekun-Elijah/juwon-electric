// Shared prop helpers for the UI kit declarations. The kit sources stay .jsx (diffable against Vite);
// these declarations make them type-safe from .tsx with `strict` (FE_CONVENTIONS §1, review FE1-1).
import type { ComponentType, HTMLAttributes, ReactNode, SVGProps } from "react";

/** Props for components rendered through an `as` prop: own props plus any attribute the element accepts. */
export type PolymorphicProps<P> = P &
  Omit<HTMLAttributes<HTMLElement>, keyof P> & {
    className?: string;
    children?: ReactNode;
    // Attributes forwarded to non-default elements (next/link href, <a target>, <label htmlFor>, …).
    [attribute: string]: unknown;
  };

/** A lucide-style icon component. */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
