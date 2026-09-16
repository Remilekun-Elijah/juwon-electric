"use client";

import { ChevronRight, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/admin/kit";
import { JobStatusBadge } from "@/components/admin/orders/orderStatus";
import type { InstallationJob } from "@/lib/api/types";
import { ChecklistProgress } from "./ChecklistProgress";
import { jobAddress, mapsUrl, relativeSchedule, telHref } from "./jobUtils";

const linkClasses =
  "flex min-h-11 items-center justify-center gap-2 px-3 text-base font-medium text-brand-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500";

/** One job in the engineer's list: tap the body to open it; directions and call links underneath. */
export function MyJobCard({ job, onOpen }: { job: InstallationJob; onOpen: () => void }) {
  const address = jobAddress(job);
  const phone = job.order?.phoneNumber;
  const name = job.order?.name || "Customer";

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full min-h-11 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-brand-700">{relativeSchedule(job.scheduledAt)}</span>
          <JobStatusBadge status={job.status} />
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 text-lg font-semibold text-slate-900">{name}</span>
          <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
        </span>
        <span className="mt-0.5 block text-base text-slate-600">{address || "No address"}</span>
        <ChecklistProgress job={job} className="mt-3 block" />
      </button>
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
        {address ? (
          <a
            href={mapsUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
            aria-label={`Directions to ${address} (opens Google Maps)`}
          >
            <MapPin aria-hidden="true" className="h-5 w-5" />
            Directions
          </a>
        ) : (
          <span className={`${linkClasses} text-slate-400 hover:bg-transparent`}>No address</span>
        )}
        {phone ? (
          <a href={telHref(phone)} className={linkClasses} aria-label={`Call ${name} on ${phone}`}>
            <Phone aria-hidden="true" className="h-5 w-5" />
            Call
          </a>
        ) : (
          <span className={`${linkClasses} text-slate-400 hover:bg-transparent`}>No phone</span>
        )}
      </div>
    </Card>
  );
}
