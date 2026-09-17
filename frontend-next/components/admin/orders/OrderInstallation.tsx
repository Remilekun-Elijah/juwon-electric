"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardPlus, HardHat } from "lucide-react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { DetailList } from "@/components/admin/DetailList";
import { Button, Field, Select, Switch } from "@/components/ui";
import { formatDateTime } from "@/lib/admin/format";
import { assignOrderEngineer, getEngineers, setRequiresInstallation } from "@/lib/api/admin";
import type { AdminUser, Order } from "@/lib/api/types";
import { CreateJobDialog } from "./CreateJobDialog";
import { JobStatusBadge, orderFulfillment } from "./orderStatus";
import { useOrderAction } from "./useOrderAction";

type Props = {
  order: Order;
  canUpdate: boolean;
  canAssignJobs: boolean;
  onChange: (order: Order) => void;
  onReload: () => Promise<void>;
};

const linkClasses = "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4";

export function OrderInstallation({ order, canUpdate, canAssignJobs, onChange, onReload }: Props) {
  const { busy, run } = useOrderAction(onChange, onReload);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const engineersQuery = useAdminQuery<AdminUser[]>("order-engineers", getEngineers, {
    enabled: order.requiresInstallation,
  });
  const engineers = engineersQuery.data ?? [];
  const jobs = order.jobs ?? [];
  const cancelled = orderFulfillment(order) === "cancelled";

  const engineerName = (engineerId: string | null) => {
    if (!engineerId) return "Not assigned";
    const engineer = engineers.find((item) => item.id === engineerId);
    return engineer ? engineer.name || engineer.email : "Engineer not listed";
  };

  const engineerOptions = [
    { value: "", label: "Not assigned" },
    ...engineers.map((engineer) => ({ value: engineer.id, label: engineer.name || engineer.email })),
    ...(order.assignedEngineerId && !engineers.some((item) => item.id === order.assignedEngineerId)
      ? [{ value: order.assignedEngineerId, label: "Current engineer (inactive or not listed)" }]
      : []),
  ];

  const toggleInstallation = (value: boolean) =>
    run(
      "installation",
      () => setRequiresInstallation(order, value),
      value ? "Order marked as needing installation" : "Order no longer needs installation"
    );

  const assignEngineer = (engineerId: string) =>
    run(
      "engineer",
      () => assignOrderEngineer(order, engineerId || null),
      engineerId ? `${engineerName(engineerId)} assigned` : "Engineer unassigned"
    );

  return (
    <section aria-labelledby="order-installation-heading" className="space-y-3">
      <h3 id="order-installation-heading" className="text-sm font-semibold text-slate-900">
        Installation
      </h3>

      {canUpdate ? (
        <Switch
          checked={order.requiresInstallation}
          disabled={Boolean(busy)}
          onChange={toggleInstallation}
          label="Requires installation"
          description="Turn this on when an engineer needs to install the system on site."
        />
      ) : (
        <p className="text-sm text-slate-600">
          {order.requiresInstallation ? "This order requires installation." : "This order doesn’t require installation."}
        </p>
      )}

      {order.requiresInstallation && (
        <>
          {canUpdate ? (
            <Field
              label="Assigned engineer"
              helper={
                engineersQuery.error
                  ? `Couldn’t load engineers. ${engineersQuery.error}`
                  : "Assigning an engineer doesn’t create a job. Create one below to schedule the visit."
              }
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={order.assignedEngineerId || ""}
                  options={engineerOptions}
                  disabled={Boolean(busy) || engineersQuery.initialLoading}
                  onChange={(event) => void assignEngineer(event.target.value)}
                />
              )}
            </Field>
          ) : (
            <DetailList
              items={[{ label: "Assigned engineer", icon: HardHat, value: engineerName(order.assignedEngineerId), full: true }]}
            />
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Installation jobs <span className="font-normal">({jobs.length})</span>
              </h4>
              {canAssignJobs && !cancelled && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ClipboardPlus aria-hidden="true" />}
                  onClick={() => setJobDialogOpen(true)}
                >
                  Create installation job
                </Button>
              )}
            </div>

            {jobs.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {jobs.map((job) => (
                  <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 text-sm text-slate-700">
                        <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                        {job.scheduledAt ? formatDateTime(job.scheduledAt) : "Not scheduled"}
                      </p>
                      <p className="text-xs text-slate-500">{engineerName(job.engineerId)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <JobStatusBadge status={job.status} />
                      <Link href="/admin/installations" className={`text-sm font-medium ${linkClasses}`}>
                        View<span className="sr-only"> installation job</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No installation jobs yet.</p>
            )}
          </div>

          {canAssignJobs && (
            <CreateJobDialog
              open={jobDialogOpen}
              order={order}
              engineers={engineers}
              onClose={() => setJobDialogOpen(false)}
              onCreated={() => {
                setJobDialogOpen(false);
                void onReload();
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
