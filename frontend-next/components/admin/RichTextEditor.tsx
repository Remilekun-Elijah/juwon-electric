"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import "@/app/admin/vacancies/quill-overrides.css";
import { Skeleton } from "@/components/admin/kit";
import { cn } from "@/lib/cn";

// Quill touches `document` on import, so it only ever loads in the browser (D6).
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <Skeleton className="h-[244px] w-full" />,
});

/** Toolbar limited to what the server's rich-text allowlist keeps (API_CONTRACT_V3 §0.5). */
const modules = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike"],
    ["blockquote", { list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const formats = ["header", "bold", "italic", "underline", "strike", "blockquote", "list", "link"];

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
  readOnly?: boolean;
  "aria-describedby"?: string;
  className?: string;
};

/** Empty Quill documents serialise as `<p><br></p>`; treat those as an empty string. */
export const normalizeRichText = (html: string) => (html.replace(/<(.|\n)*?>/g, "").trim() ? html : "");

/**
 * Rich-text field for admin forms (react-quill-new, client-only). The server sanitises the HTML; this editor only
 * limits the formatting offered.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  readOnly,
  className,
  ...aria
}: RichTextEditorProps) {
  return (
    <div
      id={id}
      className={cn(
        "overflow-hidden rounded-lg [&_.ql-container]:text-sm [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg",
        invalid && "ring-2 ring-red-300",
        className
      )}
      aria-invalid={invalid || undefined}
      {...aria}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(html: string) => onChange(normalizeRichText(html))}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
