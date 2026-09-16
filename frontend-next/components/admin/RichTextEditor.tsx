"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import "@/app/admin/vacancies/quill-overrides.css";
import { Skeleton } from "@/components/ui";
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
  /** Id the field's `<label for>` points at (from `Field`'s render props). */
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
 * Wires the editable area (`.ql-editor`, created by Quill after mount) to the field: accessible name from the label,
 * description, invalid state, and focusing the editor when the label is clicked (review FE2-4).
 */
function useEditorA11y(
  wrapper: React.RefObject<HTMLDivElement | null>,
  { id, describedBy, invalid, readOnly }: { id?: string; describedBy?: string; invalid?: boolean; readOnly?: boolean }
) {
  useEffect(() => {
    const root = wrapper.current;
    if (!root) return undefined;
    let label: HTMLLabelElement | null = null;
    let editor: HTMLElement | null = null;
    const focusEditor = (event: MouseEvent) => {
      if (!editor) return;
      event.preventDefault();
      editor.focus();
    };

    const apply = () => {
      editor = root.querySelector<HTMLElement>(".ql-editor");
      if (!editor) return false;
      label = id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`) : null;
      if (label) {
        if (!label.id) label.id = `${id}-label`;
        editor.setAttribute("aria-labelledby", label.id);
        label.addEventListener("click", focusEditor);
      }
      editor.setAttribute("role", "textbox");
      editor.setAttribute("aria-multiline", "true");
      if (describedBy) editor.setAttribute("aria-describedby", describedBy);
      else editor.removeAttribute("aria-describedby");
      if (invalid) editor.setAttribute("aria-invalid", "true");
      else editor.removeAttribute("aria-invalid");
      if (readOnly) editor.setAttribute("aria-readonly", "true");
      else editor.removeAttribute("aria-readonly");
      return true;
    };

    let observer: MutationObserver | null = null;
    if (!apply()) {
      observer = new MutationObserver(() => {
        if (apply()) observer?.disconnect();
      });
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      label?.removeEventListener("click", focusEditor);
    };
  }, [wrapper, id, describedBy, invalid, readOnly]);
}

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
  "aria-describedby": describedBy,
}: RichTextEditorProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEditorA11y(wrapper, { id, describedBy, invalid, readOnly });

  return (
    <div
      ref={wrapper}
      id={id}
      className={cn(
        "overflow-hidden rounded-lg [&_.ql-container]:rounded-b-lg [&_.ql-container]:text-sm [&_.ql-toolbar]:rounded-t-lg",
        invalid && "ring-2 ring-red-300",
        className
      )}
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
