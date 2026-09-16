/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
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
import { Avatar, Button } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { ILogoImg } from "../../../utils/icon";
import { adminUserKey, modules, navGroups } from "../constants/adminConstants";

const readAdminUser = () => {
  try {
    return JSON.parse(localStorage.getItem(adminUserKey) || "null") || {};
  } catch {
    return {};
  }
};

const NavItem = ({ module, active, count, onSelect }) => {
  const Icon = module.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(module.id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          active
            ? "bg-brand-50 text-brand-700 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-600"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
        <span className="truncate">{module.label}</span>
        {count > 0 && (
          <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
            {count}
            <span className="sr-only"> {module.id === "orders" ? "pending" : "new"}</span>
          </span>
        )}
      </button>
    </li>
  );
};

const SidebarContent = ({ active, counts, onSelect, onSignOut, onClose }) => (
  <>
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
      <img src={ILogoImg} alt="Juwon Electric" className="h-9 w-auto" />
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
        {navGroups.map((group) => (
          <div key={group.id}>
            <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </h2>
            <ul className="space-y-1">
              {modules
                .filter((module) => module.group === group.id)
                .map((module) => (
                  <NavItem
                    key={module.id}
                    module={module}
                    active={active === module.id}
                    count={counts[module.id]}
                    onSelect={onSelect}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
    <div className="shrink-0 border-t border-slate-100 p-3">
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />
        Sign out
      </button>
    </div>
  </>
);

const UserMenu = ({ onSignOut }) => {
  const admin = readAdminUser();
  const name = admin.name || "Admin";

  return (
    <Menu>
      <MenuButton className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 data-[open]:bg-slate-100">
        <Avatar name={name} size="sm" decorative className="bg-brand-100 text-brand-700" />
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-700 md:block">{name}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="sr-only">Open account menu</span>
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 font-sans text-slate-900 antialiased shadow-elev-4 focus:outline-none"
      >
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          {admin.email && <p className="truncate text-xs text-slate-500">{admin.email}</p>}
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
};

const AdminShell = ({ active, setActive, counts = {}, onRefresh, onSignOut, loading, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef(null);

  const closeDrawer = () => setDrawerOpen(false);
  const selectModule = (id) => {
    setActive(id);
    closeDrawer();
  };

  // Swipe from the left edge to open the drawer, swipe left to close it.
  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, drawerOpen };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = Math.abs(touch.clientY - touchStart.current.y);
    const mostlyHorizontal = Math.abs(deltaX) > 70 && deltaY < 55;

    if (mostlyHorizontal && touchStart.current.drawerOpen && deltaX < 0) closeDrawer();
    if (mostlyHorizontal && !touchStart.current.drawerOpen && touchStart.current.x < 28 && deltaX > 0) {
      setDrawerOpen(true);
    }
    touchStart.current = null;
  };

  return (
    <div
      className="min-h-screen font-sans antialiased text-slate-900 bg-slate-50 [:where(&_*)]:border-slate-200 [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb]:[background:#cbd5e1]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarContent active={active} counts={counts} onSelect={selectModule} onSignOut={onSignOut} />
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
                active={active}
                counts={counts}
                onSelect={selectModule}
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
          <img src={ILogoImg} alt="" aria-hidden="true" className="h-8 w-auto md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              aria-label={loading ? "Refreshing data" : "Refresh data"}
              title="Refresh data"
            >
              <RefreshCw aria-hidden="true" className={cn(loading && "animate-spin")} />
            </Button>
            <UserMenu onSignOut={onSignOut} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div key={active} className="mx-auto w-full max-w-[1320px] motion-safe:animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
