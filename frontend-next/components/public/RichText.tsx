import { cn } from "@/lib/cn";
import { sanitizeRichText } from "@/lib/sanitize";

/**
 * Renders API rich text (already sanitised server-side, contract §0.5) inside the scoped `.prose-je` style,
 * sanitising again on this side before `dangerouslySetInnerHTML` (FE_CONVENTIONS §2). Server-compatible.
 */
export default function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  const clean = sanitizeRichText(html ?? "");
  if (!clean) return null;
  return <div className={cn("prose-je", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
