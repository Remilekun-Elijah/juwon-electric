import type { ElementType, ReactElement, ReactNode } from "react";

/**
 * PageHeader. Props: eyebrow (small uppercase brand label), title, description, actions (right-side slot),
 * titleAs (default "h1"), className.
 */
export declare function PageHeader(props: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: ElementType;
  className?: string;
}): ReactElement;

export default PageHeader;
