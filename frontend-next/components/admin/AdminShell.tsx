"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ChevronDown, LogOut, Menu as MenuIcon, RefreshCw, X } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { normalizeRole, roleLabels } from "@/lib/admin/capabilities";
import { modules, navGroups, type AdminModule, type ModuleId } from "@/lib/admin/modules";
import { useAdmin } from "./AdminContext";

const LOGO = "/logo.svg";

type Counts = Partial<Record<ModuleId, number | undefined>>;

function NavItem({
  module,
  active,
  count,
  onSelect,
}: {
  module: AdminModule;
  active: boolean;
  count?: number;
  onSelect: () => void;
}) {
  const Icon = module.icon;
  return (
    <li>
      <Link
        href={module.href}
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500",
          active
            ? "bg-brand-50 text-brand-700 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-brand-600"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")}
        />
        <span className="truncate">{module.label}</span>
        {count ? (
          <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
            {count}
            <span className="sr-only"> {module.id === "orders" ? "open" : "new"}</span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function SidebarContent({
  activeId,
  counts,
  onSelect,
  onSignOut,
  onClose,
}: {
  activeId: ModuleId | null;
  counts: Counts;
  onSelect: () => void;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  const { can } = useAdmin();
  const visible = modules.filter((module) => can(module.capability));

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <Image src={LOGO} alt="Juwon Electric" width={88} height={62} className="h-9 w-auto" priority />
        <span className="border-l border-slate-200 pl-3 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
          Admin
        </span>
        {onClose && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close navigation menu" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto p-3">
        <div className="space-y-6">
          {navGroups.map((group) => {
            const items = visible.filter((module) => module.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id}>
                <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2>
                <ul className="space-y-1">
                  {items.map((module) => (
                    <NavItem
                      key={module.id}
                      module={module}
                      active={activeId === module.id}
                      count={counts[module.id]}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
      <div className="shrink-0 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { admin } = useAdmin();
  const name = admin.name || "Admin";
  const role = normalizeRole(admin.role);

  return (
    <Menu>
      <MenuButton className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 data-[open]:bg-slate-100">
        <Avatar name={name} size="sm" decorative className="bg-brand-100 text-brand-700" />
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-700 md:block">{name}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="sr-only">Open account menu</span>
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 font-sans text-slate-900 antialiased shadow-elev-4 focus:outline-hidden"
      >
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          {admin.email && <p className="truncate text-xs text-slate-500">{admin.email}</p>}
          {role && <p className="mt-1 text-xs font-medium text-brand-700">{roleLabels[role]}</p>}
        </div>
        <div className="pt-1">
          <MenuItem>
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 data-[focus]:bg-red-50"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
}

type AdminShellProps = {
  activeId: ModuleId | null;
  counts?: Counts;
  onRefresh: () => void;
  onSignOut: () => void;
  banner?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ activeId, counts = {}, onRefresh, onSignOut, banner, children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number; drawerOpen: boolean } | null>(null);

  const closeDrawer = () => setDrawerOpen(false);

  // Swipe from the left edge to open the drawer, swipe left to close it.
  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, drawerOpen };
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    const mostlyHorizontal = Math.abs(deltaX) > 70 && deltaY < 55;

    if (mostlyHorizontal && start.drawerOpen && deltaX < 0) closeDrawer();
    if (mostlyHorizontal && !start.drawerOpen && start.x < 28 && deltaX > 0) setDrawerOpen(true);
    touchStart.current = null;
  };

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased [:where(&_*)]:border-slate-200 [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb]:[background:#cbd5e1]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-brand-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarContent activeId={activeId} counts={counts} onSelect={closeDrawer} onSignOut={onSignOut} />
      </aside>

      <Transition show={drawerOpen}>
        <Dialog onClose={closeDrawer} className="relative z-50 md:hidden">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div aria-hidden="true" className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" />
          </TransitionChild>
          <TransitionChild
            enter="transform transition ease-[cubic-bezier(0.22,1,0.36,1)] duration-[240ms]"
            enterFrom="-translate-x-[105%]"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-[105%]"
          >
            <DialogPanel
              aria-label="Admin navigation"
              className="fixed inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col bg-white font-sans text-slate-900 antialiased shadow-elev-5"
            >
              <SidebarContent
                activeId={activeId}
                counts={counts}
                onSelect={closeDrawer}
                onSignOut={() => {
                  closeDrawer();
                  onSignOut();
                }}
                onClose={closeDrawer}
              />
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>

      <div className="flex min-h-screen min-w-0 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6 lg:px-8">
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon aria-hidden="true" />
          </Button>
          <Image src={LOGO} alt="" aria-hidden="true" width={88} height={62} className="h-8 w-auto md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh data" title="Refresh data">
              <RefreshCw aria-hidden="true" />
            </Button>
            <UserMenu onSignOut={onSignOut} />
          </div>
        </header>

        <main id="admin-main" className="flex-1 p-4 md:p-6 lg:p-8">
          <div key={activeId ?? "none"} className="mx-auto w-full max-w-[1320px] motion-safe:animate-fade-up">
            {banner}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
