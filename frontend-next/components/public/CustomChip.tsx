import { ChevronDown } from "lucide-react";

/** Section label pill. Port of frontend/src/components/CustomChip.jsx. */
export default function CustomChip({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <span className="inline-flex items-center rounded-full bg-deep_red px-1 py-2 text-white">
        <span className="inter-bold rounded-full bg-offWhite px-4 py-2 text-deep_red">{text}</span>
        <ChevronDown aria-hidden="true" className="h-6 w-6" />
      </span>
    </div>
  );
}
