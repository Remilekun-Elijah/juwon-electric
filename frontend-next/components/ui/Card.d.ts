import type { ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";
import type { PolymorphicProps } from "./types";

type DivProps = HTMLAttributes<HTMLDivElement>;

/** Card. Props: as (default "div"), className, children. White, rounded-xl, 1px slate border, elev-1 shadow. */
export declare function Card(props: PolymorphicProps<{ as?: ElementType }>): ReactElement;
/** CardHeader. Props: className, children. p-6 column with gap-1.5. */
export declare function CardHeader(props: DivProps): ReactElement;
/** CardTitle. Props: as (default "h3"), className, children. */
export declare function CardTitle(props: PolymorphicProps<{ as?: ElementType }>): ReactElement;
/** CardDescription. Props: className, children. */
export declare function CardDescription(props: HTMLAttributes<HTMLParagraphElement>): ReactElement;
/** CardContent. Props: className, children. p-6 pt-0 (add pt-6 when there is no header). */
export declare function CardContent(props: DivProps): ReactElement;
/** CardFooter. Props: className, children. */
export declare function CardFooter(props: DivProps): ReactElement;

/**
 * ListCardHeader. Divided header for list/table cards. Props: title, count (shown as "(n)"), description,
 * actions (right-side slot), titleAs (default "h2"), className, children (extra content under the title row, e.g. filters).
 */
export declare function ListCardHeader(props: {
  title: ReactNode;
  count?: number | null;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: ElementType;
  className?: string;
  children?: ReactNode;
}): ReactElement;

export default Card;
