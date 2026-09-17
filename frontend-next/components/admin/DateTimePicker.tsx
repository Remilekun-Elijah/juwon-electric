"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button, Select, useFieldControl } from "@/components/ui";
import { FieldContext } from "@/components/ui/fieldContext";
import { fieldClasses, invalidFieldClasses } from "@/components/ui/fieldStyles";
import {
  MONTHS_LONG,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  addMonths,
  dayNumber,
  daysInMonth,
  formatLagosDateTime,
  fromDayNumber,
  fromLagosParts,
  lagosToday,
  longDayLabel,
  sameDay,
  timeLabel,
  toLagosParts,
  weekdayOf,
  type CalendarDay,
} from "@/lib/admin/lagosTime";
import { cn } from "@/lib/cn";

const STEP_MINUTES = 15;
/** Weeks start on Monday. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export type DateTimePickerProps = {
  /** ISO string, or null/"" when not set. */
  value: string | null | undefined;
  /** Emits an ISO string, or null when cleared. */
  onChange: (value: string | null) => void;
  id?: string;
  "aria-describedby"?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Time used when a day is picked before a time, in minutes after midnight. Defaults to 9:00 AM. */
  defaultTime?: number;
  className?: string;
};

/**
 * Date and time picker in Lagos time. The trigger shows "Thu 18 Sep 2026, 10:30 AM"; the popover has a month grid
 * (previous and next month, today outlined, past days muted but selectable) and a 15-minute time list. Keyboard: arrow
 * keys move by day or week, Page Up and Page Down by month, Home and End to the week's start and end, Enter or Space
 * picks, Esc closes. Picks up `id`, `aria-describedby` and `invalid` from a surrounding `Field`.
 */
export function DateTimePicker(props: DateTimePickerProps) {
  const {
    id,
    invalid,
    required,
    "aria-describedby": describedBy,
    value,
    onChange,
    disabled,
    placeholder = "Not scheduled",
    defaultTime = 9 * 60,
    className,
  } = useFieldControl(props);
  const valueId = `${useId().replace(/:/g, "")}-value`;
  const display = formatLagosDateTime(value);

  return (
    <Popover className={cn("relative flex w-full items-center gap-2", className)}>
      <PopoverButton
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={[valueId, describedBy].filter(Boolean).join(" ")}
        className={cn(
          fieldClasses,
          "h-11 min-w-0 flex-1 items-center gap-2 text-left sm:h-10",
          invalid && invalidFieldClasses
        )}
      >
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
        <span id={valueId} className={cn("truncate", display ? "text-slate-900" : "text-slate-400")}>
          {display || placeholder}
        </span>
      </PopoverButton>
      {display && !disabled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
          aria-label="Clear date and time"
          title="Clear"
          onClick={() => onChange(null)}
        >
          <X aria-hidden="true" />
        </Button>
      )}
      <PopoverPanel
        anchor={{ to: "bottom start", gap: 8, padding: 16 }}
        className="z-[60] w-[min(21rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-elev-4 focus:outline-hidden"
      >
        {({ close }) => (
          // The panel's own controls must not pick up the surrounding Field's id and messages.
          <FieldContext.Provider value={null}>
            <CalendarPanel value={value} defaultTime={defaultTime} onChange={onChange} onDone={() => close()} />
          </FieldContext.Provider>
        )}
      </PopoverPanel>
    </Popover>
  );
}

type PanelProps = {
  value: string | null | undefined;
  defaultTime: number;
  onChange: (value: string | null) => void;
  onDone: () => void;
};

function CalendarPanel({ value, defaultTime, onChange, onDone }: PanelProps) {
  const headingId = `${useId().replace(/:/g, "")}-month`;
  const today = lagosToday();
  const selected = toLagosParts(value);
  const selectedDay: CalendarDay | null = selected && { year: selected.year, month: selected.month, day: selected.day };
  const selectedTime = selected ? selected.hour * 60 + selected.minute : null;

  const [focused, setFocused] = useState<CalendarDay>(() => selectedDay ?? today);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(true);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  }, [focused]);

  const emit = (day: CalendarDay, minutes: number) =>
    onChange(fromLagosParts({ ...day, hour: Math.floor(minutes / 60), minute: minutes % 60 }));

  const pickDay = (day: CalendarDay) => {
    setFocused(day);
    emit(day, selectedTime ?? defaultTime);
  };

  const goTo = (day: CalendarDay, focus: boolean) => {
    moveFocus.current = focus;
    setFocused(day);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = dayNumber(focused);
    const offset = (weekdayOf(focused) + 6) % 7; // Monday = 0
    let next: CalendarDay | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = fromDayNumber(current - 1);
        break;
      case "ArrowRight":
        next = fromDayNumber(current + 1);
        break;
      case "ArrowUp":
        next = fromDayNumber(current - 7);
        break;
      case "ArrowDown":
        next = fromDayNumber(current + 7);
        break;
      case "Home":
        next = fromDayNumber(current - offset);
        break;
      case "End":
        next = fromDayNumber(current + (6 - offset));
        break;
      case "PageUp":
        next = addMonths(focused, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focused, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    goTo(next, true);
  };

  const { year, month } = focused;
  const leading = (weekdayOf({ year, month, day: 1 }) + 6) % 7;
  const total = daysInMonth(year, month);
  const cells: (CalendarDay | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, index) => ({ year, month, day: index + 1 })),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  const timeOptions = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) => {
    const minutes = index * STEP_MINUTES;
    return { value: String(minutes), label: timeLabel(minutes) };
  });
  if (selectedTime !== null && selectedTime % STEP_MINUTES) {
    timeOptions.push({ value: String(selectedTime), label: timeLabel(selectedTime) });
    timeOptions.sort((a, b) => Number(a.value) - Number(b.value));
  }

  const todayNumber = dayNumber(today);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-9 sm:w-9"
          aria-label="Previous month"
          onClick={() => goTo(addMonths(focused, -1), false)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p id={headingId} aria-live="polite" className="text-sm font-semibold text-slate-900">
          {MONTHS_LONG[month]} {year}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-9 sm:w-9"
          aria-label="Next month"
          onClick={() => goTo(addMonths(focused, 1), false)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <div ref={gridRef} role="grid" aria-labelledby={headingId} onKeyDown={onGridKeyDown} className="space-y-1">
        <div role="row" className="grid grid-cols-7">
          {WEEK_ORDER.map((weekday) => (
            <span
              key={weekday}
              role="columnheader"
              aria-label={WEEKDAYS_LONG[weekday]}
              className="py-1 text-center text-xs font-medium text-slate-500"
            >
              {WEEKDAYS_SHORT[weekday].slice(0, 2)}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-0.5">
            {week.map((day, dayIndex) => {
              if (!day) return <span key={`blank-${dayIndex}`} role="gridcell" aria-hidden="true" />;
              const isSelected = sameDay(day, selectedDay);
              const isToday = sameDay(day, today);
              const isPast = dayNumber(day) < todayNumber;
              const isFocused = sameDay(day, focused);
              return (
                <span key={day.day} role="gridcell" aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={isFocused ? 0 : -1}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${longDayLabel(day)}${isToday ? ", today" : isPast ? ", past" : ""}`}
                    onClick={() => pickDay(day)}
                    onFocus={() => {
                      if (!isFocused) setFocused(day);
                    }}
                    className={cn(
                      "flex h-11 w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-9",
                      isSelected
                        ? "bg-brand-600 font-semibold text-white hover:bg-brand-700"
                        : cn(
                            "hover:bg-slate-100",
                            isPast ? "text-slate-400" : "text-slate-800",
                            isToday && "font-semibold text-brand-700 ring-1 ring-inset ring-brand-300"
                          )
                    )}
                  >
                    {day.day}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <label htmlFor={`${headingId}-time`} className="block text-xs font-medium text-slate-600">
          Time (Lagos)
        </label>
        <Select
          id={`${headingId}-time`}
          size="lg"
          selectClassName="sm:h-10"
          value={selectedTime === null ? "" : String(selectedTime)}
          placeholder="Choose a time"
          options={timeOptions}
          onChange={(event) => emit(selectedDay ?? focused, Number(event.target.value))}
        />
        {!selectedDay && <p className="text-xs text-slate-500">Choosing a time uses the highlighted day.</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="h-11 sm:h-9"
          disabled={!value}
          onClick={() => {
            onChange(null);
            onDone();
          }}
        >
          Clear
        </Button>
        <Button className="h-11 sm:h-9" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
