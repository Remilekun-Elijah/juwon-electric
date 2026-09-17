"use client";

import { Button, Select, useFieldControl } from "@/components/ui";
import { FieldContext } from "@/components/ui/fieldContext";
import { formatDuration } from "@/lib/admin/lagosTime";
import { cn } from "@/lib/cn";

export const DURATION_MIN_MINUTES = 15;
const MAX_HOURS = 24;
const MINUTE_STEPS = [0, 15, 30, 45];

/** Client check matching the backend rule: empty is fine, otherwise at least 15 minutes. */
export const durationError = (minutes: number | null | undefined) =>
  minutes != null && minutes < DURATION_MIN_MINUTES
    ? `Estimated duration must be at least ${DURATION_MIN_MINUTES} minutes.`
    : "";

export type DurationPickerProps = {
  /** Total minutes (`durationEstimateMinutes`), or null when not set. */
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  id?: string;
  "aria-describedby"?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Hours (0–24) and minutes (0, 15, 30, 45) as two selects, with a "2 h 30 min" summary and a Clear button.
 * Emits total minutes or null. Shows its own "at least 15 minutes" message unless the surrounding Field already has
 * an error. Picks up `id`, `aria-describedby` and `invalid` from a surrounding `Field` (the id goes on the hours select).
 */
export function DurationPicker(props: DurationPickerProps) {
  const { id, invalid, "aria-describedby": describedBy, value, onChange, disabled, className } = useFieldControl(props);
  const set = value != null && Number.isFinite(value);
  const hours = set ? Math.floor(value / 60) : null;
  const minutes = set ? value % 60 : null;
  const tooShort = durationError(set ? value : null);
  const messageId = id ? `${id}-duration-hint` : undefined;
  const summary = set ? formatDuration(value) || "0 min" : "";

  const hourOptions = Array.from({ length: MAX_HOURS + 1 }, (_, hour) => ({ value: String(hour), label: `${hour} h` }));
  if (hours !== null && hours > MAX_HOURS) hourOptions.push({ value: String(hours), label: `${hours} h` });
  const minuteOptions = MINUTE_STEPS.map((minute) => ({ value: String(minute), label: `${minute} min` }));
  if (minutes !== null && !MINUTE_STEPS.includes(minutes)) {
    minuteOptions.push({ value: String(minutes), label: `${minutes} min` });
    minuteOptions.sort((a, b) => Number(a.value) - Number(b.value));
  }

  const describe = [describedBy, tooShort && !invalid ? messageId : ""].filter(Boolean).join(" ") || undefined;

  return (
    // The inner selects get their wiring from here, not from the surrounding Field (which would duplicate its id).
    <FieldContext.Provider value={null}>
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center gap-2">
          <Select
            id={id}
            size="lg"
            selectClassName="sm:h-10"
            className="min-w-0 flex-1"
            aria-describedby={describe}
            invalid={invalid || Boolean(tooShort)}
            disabled={disabled}
            placeholder="Hours"
            value={hours === null ? "" : String(hours)}
            options={hourOptions}
            onChange={(event) => onChange(Number(event.target.value) * 60 + (minutes ?? 0))}
          />
          <Select
            id={id ? `${id}-minutes` : undefined}
            aria-label="Minutes"
            size="lg"
            selectClassName="sm:h-10"
            className="min-w-0 flex-1"
            aria-describedby={describe}
            invalid={invalid || Boolean(tooShort)}
            disabled={disabled}
            placeholder="Minutes"
            value={minutes === null ? "" : String(minutes)}
            options={minuteOptions}
            onChange={(event) => onChange((hours ?? 0) * 60 + Number(event.target.value))}
          />
          {set && !disabled && (
            <Button variant="ghost" className="h-11 shrink-0 sm:h-10" onClick={() => onChange(null)}>
              Clear
            </Button>
          )}
        </div>
        {tooShort && !invalid ? (
          <p id={messageId} className="text-sm text-red-600">
            {tooShort}
          </p>
        ) : (
          summary && (
            <p className="text-xs text-slate-500" aria-live="polite">
              About {summary}
            </p>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}
