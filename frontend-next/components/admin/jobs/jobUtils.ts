/** Helpers shared by the admin installation jobs screen and the engineer's mobile view. */
import { errorMessage } from "@/lib/admin/format";
import { ApiError } from "@/lib/api/admin";
import type { InstallationJob, InstallationJobSummary, JobEngineer, JobStatus } from "@/lib/api/types";

export const isClosedJob = (status: JobStatus) => status === "completed" || status === "cancelled";

export const checklistProgress = (job: Pick<InstallationJob, "checklist">) => {
  const total = job.checklist.length;
  const done = job.checklist.filter((item) => item.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
};

/** Commerce v3 §1: crew ids, lead first (older responses only have `engineerId`). */
export const jobEngineerIds = (job: Pick<InstallationJob | InstallationJobSummary, "engineerId" | "engineerIds">) =>
  job.engineerIds ?? (job.engineerId ? [job.engineerId] : []);

/** The crew as people, lead first. Falls back to the lead-only `engineer` from older responses. */
export const jobCrew = (job: Pick<InstallationJob, "engineer" | "engineers">): JobEngineer[] =>
  job.engineers ?? (job.engineer ? [job.engineer] : []);

/** "With: Ada Obi (lead), Tunde Bello" for an engineer's own job: the rest of the crew, or "" when working alone. */
export const crewmatesText = (job: Pick<InstallationJob, "engineer" | "engineers">, selfId: string | undefined) => {
  const crew = jobCrew(job);
  const others = crew
    .map((person, index) => ({ person, lead: index === 0 && crew.length > 1 }))
    .filter(({ person }) => person.id !== selfId);
  if (!others.length) return "";
  return `With: ${others.map(({ person, lead }) => `${person.name || person.email}${lead ? " (lead)" : ""}`).join(", ")}`;
};

/** The job address, falling back to the order's delivery address. */
export const jobAddress = (job: InstallationJob) => job.address || job.order?.deliveryAddress || "";

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "Today, 1:00 pm", "Tomorrow, 9:30 am", "Friday, 2:00 pm" or "Mon 12 Oct, 8:00 am". */
export const relativeSchedule = (value: string | null | undefined) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  const time = date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  let day: string;
  if (days === 0) day = "Today";
  else if (days === 1) day = "Tomorrow";
  else if (days === -1) day = "Yesterday";
  else if (days > 1 && days < 7) day = date.toLocaleDateString("en-NG", { weekday: "long" });
  else day = date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
};

/** Local `YYYY-MM-DD` from a date input → ISO at the start (or end) of that local day. */
export const dayBoundary = (value: string, end = false) => {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/** A server validation error (400) belongs in the form; anything else is a toast. */
export const isValidationError = (error: unknown) => error instanceof ApiError && error.status === 400;

export { errorMessage };
