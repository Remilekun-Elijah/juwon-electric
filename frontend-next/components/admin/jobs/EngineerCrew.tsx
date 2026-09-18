"use client";

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { UserSearch, X } from "lucide-react";
import { Avatar, Badge, Button, SearchInput, useFieldControl } from "@/components/ui";
import { FieldContext } from "@/components/ui/fieldContext";
import type { AdminUser, JobEngineer } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** Commerce v3 §1.1. */
export const MAX_CREW = 10;

type Person = { id: string; name: string; email?: string; avatarUrl?: string | null };

const displayName = (person: Person) => person.name || person.email || "Engineer";

/* ---------- Display ---------- */

/** Stacked avatars with the lead's name and "+N", for tables and cards. */
export function CrewStack({
  crew,
  emptyLabel = "Unassigned",
  showAll = false,
  className,
}: {
  crew: readonly Person[];
  emptyLabel?: string;
  /** List every name ("Ada Obi (lead), Tunde Bello") instead of the lead and "+N". */
  showAll?: boolean;
  className?: string;
}) {
  if (!crew.length) return <span className={cn("text-slate-400", className)}>{emptyLabel}</span>;
  const shown = crew.slice(0, 3);
  const [lead, ...others] = crew;
  const all = crew
    .map((person, index) => `${displayName(person)}${index === 0 && crew.length > 1 ? " (lead)" : ""}`)
    .join(", ");
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)} title={all}>
      <span aria-hidden="true" className="flex shrink-0 -space-x-2">
        {shown.map((person) => (
          <Avatar key={person.id} name={displayName(person)} src={person.avatarUrl ?? undefined} size="sm" decorative className="ring-2 ring-white" />
        ))}
      </span>
      {showAll ? (
        <span aria-hidden="true" className="min-w-0 text-slate-700">
          {crew.length > 1 ? all : displayName(lead)}
        </span>
      ) : (
        <span aria-hidden="true" className="min-w-0 truncate text-slate-700">
          {displayName(lead)}
          {others.length > 0 && <span className="text-slate-500"> +{others.length}</span>}
        </span>
      )}
      <span className="sr-only">{all}</span>
    </span>
  );
}

/** One row per engineer, lead first, with a Lead badge. */
export function CrewList({ crew, emptyLabel = "Unassigned" }: { crew: readonly Person[]; emptyLabel?: string }) {
  if (!crew.length) return <span className="text-slate-500">{emptyLabel}</span>;
  return (
    <ul className="space-y-1.5">
      {crew.map((person, index) => (
        <li key={person.id} className="flex min-w-0 items-center gap-2">
          <Avatar name={displayName(person)} src={person.avatarUrl ?? undefined} size="sm" decorative />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="truncate font-medium text-slate-900">{displayName(person)}</span>
              {index === 0 && crew.length > 1 && <Badge tone="brand">Lead</Badge>}
            </span>
            {person.email && person.name && <span className="block truncate text-xs text-slate-500">{person.email}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Multi-select ---------- */

export type EngineerCrewPickerProps = {
  /** Engineer ids, lead first. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Active engineers to choose from. */
  engineers: readonly AdminUser[];
  /** People already on the job, so members who are no longer listed (for example, deactivated) keep their name. */
  known?: readonly JobEngineer[];
  loading?: boolean;
  /** Load error for the engineers list. */
  error?: string;
  onRetry?: () => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  invalid?: boolean;
  className?: string;
};

/**
 * Crew multi-select: search active engineers (focus lists them all), add them as chips and remove them. The first chip
 * is the lead; any other chip can be made lead. Arrow keys and Enter pick from the list and Esc closes it. The `Field` id
 * goes on the search box.
 */
export function EngineerCrewPicker(props: EngineerCrewPickerProps) {
  const {
    id,
    invalid,
    "aria-describedby": describedBy,
    value,
    onChange,
    engineers,
    known = [],
    loading,
    error,
    onRetry,
    disabled,
    className,
  } = useFieldControl(props);
  const baseId = useId().replace(/:/g, "");
  const listId = `${baseId}-engineers`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const people = new Map<string, Person>();
  known.forEach((person) => people.set(person.id, person));
  engineers.forEach((person) => people.set(person.id, { id: person.id, name: person.name, email: person.email }));
  const chips = value.map((engineerId) => people.get(engineerId) ?? { id: engineerId, name: "Engineer not listed" });

  const full = value.length >= MAX_CREW;
  const term = search.trim().toLowerCase();
  const options = engineers.filter(
    (person) =>
      !value.includes(person.id) &&
      (!term || person.name.toLowerCase().includes(term) || person.email.toLowerCase().includes(term))
  );
  const showList = open && !full && options.length > 0;
  const activeIndex = showList && active < options.length ? active : -1;

  const add = (engineerId: string) => {
    if (value.includes(engineerId) || full) return;
    onChange([...value, engineerId]);
    setSearch("");
    setActive(-1);
  };

  const remove = (engineerId: string) => {
    onChange(value.filter((item) => item !== engineerId));
    inputRef.current?.focus();
  };

  const makeLead = (engineerId: string) => onChange([engineerId, ...value.filter((item) => item !== engineerId)]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        setOpen(true);
        if (!options.length) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive(
          activeIndex < 0 ? (step === 1 ? 0 : options.length - 1) : (activeIndex + step + options.length) % options.length
        );
        return;
      }
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0) add(options[activeIndex].id);
        else if (term && options.length === 1) add(options[0].id);
        return;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        setActive(-1);
        return;
      default:
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setOpen(false);
    setActive(-1);
  };

  const status = () => {
    if (!open || full) return null;
    if (loading && !engineers.length) return <p className="px-1 text-sm text-slate-500">Loading engineers…</p>;
    if (error && !engineers.length) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>Engineers couldn’t be loaded. {error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      );
    }
    if (!options.length) {
      return (
        <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <UserSearch aria-hidden="true" className="h-4 w-4 text-slate-400" />
          {term
            ? `No active engineers match “${search.trim()}”.`
            : engineers.length
              ? "Every active engineer is on this job."
              : "There are no active engineers."}
        </p>
      );
    }
    return null;
  };

  return (
    <FieldContext.Provider value={null}>
      <div className={cn("space-y-2", className)} onBlur={onBlur}>
        {chips.length > 0 && (
          <ul aria-label="Engineers on this job" className="flex flex-wrap gap-2">
            {chips.map((person, index) => {
              const name = displayName(person);
              return (
                <li
                  key={person.id}
                  className={cn(
                    "flex min-h-11 max-w-full items-center gap-1.5 rounded-full border py-1 pl-1 pr-1 sm:min-h-9",
                    index === 0 ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
                  )}
                >
                  <Avatar name={name} src={person.avatarUrl ?? undefined} size="sm" decorative className="h-7 w-7" />
                  <span className="min-w-0 truncate text-sm font-medium text-slate-900">{name}</span>
                  {index === 0 ? (
                    <Badge tone="brand" className="shrink-0">
                      Lead
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 shrink-0 px-2 sm:h-7"
                      aria-label={`Make ${name} lead`}
                      disabled={disabled}
                      onClick={() => makeLead(person.id)}
                    >
                      Make lead
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-11 w-11 shrink-0 rounded-full hover:bg-red-50 hover:text-red-700 sm:h-7 sm:w-7"
                    aria-label={`Remove ${name}`}
                    title="Remove"
                    disabled={disabled}
                    onClick={() => remove(person.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {full ? (
          <p className="text-xs text-slate-500">A job can have up to {MAX_CREW} engineers.</p>
        ) : (
          <SearchInput
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            aria-describedby={describedBy}
            invalid={invalid}
            autoComplete="off"
            size="lg"
            className="sm:h-10"
            placeholder={chips.length ? "Add another engineer" : "Search engineers by name or email"}
            disabled={disabled}
            value={search}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
          />
        )}

        {status()}

        <ul
          id={listId}
          role="listbox"
          aria-label="Active engineers"
          hidden={!showList}
          className="max-h-60 divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-elev-1"
        >
          {showList &&
            options.map((person, index) => (
              <li
                key={person.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (active !== index) setActive(index);
                }}
                onClick={() => add(person.id)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2",
                  index === activeIndex && "bg-brand-50"
                )}
              >
                <Avatar name={person.name || person.email} src={person.profile?.avatarUrl ?? undefined} size="sm" decorative />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{person.name || person.email}</span>
                  <span className="block truncate text-xs text-slate-500">{person.email}</span>
                </span>
                <span className="ml-auto shrink-0 text-xs font-medium text-brand-700">
                  {value.length ? "Add" : "Add as lead"}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </FieldContext.Provider>
  );
}
