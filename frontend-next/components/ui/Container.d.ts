import type { ElementType, ReactElement } from "react";
import type { PolymorphicProps } from "./types";

/** Container. Public site max-width wrapper (replaces MUI Container). Props: as (default "div"), className, children. */
export declare function Container(props: PolymorphicProps<{ as?: ElementType }>): ReactElement;
export default Container;
