"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone } from "lucide-react";
import { Drawer, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isActivePath, primaryPhone, storeNav, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeContainer, storeFocus } from "@/lib/storefront/styles";
import CartButton from "./cart/CartButton";

const drawerLinks = [{ label: "Home", href: storeRoutes.home }, ...storeNav, { label: "Cart", href: storeRoutes.cart }];

export type StoreHeaderProps = {
  /** Business phone from settings (may hold several numbers; the first is shown). */
  phone: string;
};

/** Sticky white header: logo, main navigation, phone (desktop), cart with live count, and a mobile navigation drawer. */
export default function StoreHeader({ phone }: StoreHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const mainPhone = primaryPhone(phone);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className={cn(storeContainer, "flex h-16 items-center gap-4 md:h-[72px]")}>
        <Link href={storeRoutes.home} className={cn("-ml-1 shrink-0 rounded-md p-1", storeFocus)}>
          <Image src="/logo.svg" alt="Juwon Electric home" width={88} height={62} priority className="h-10 w-auto md:h-11" />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {storeNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                      storeFocus,
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {mainPhone && (
            <a
              href={telHref(mainPhone)}
              className={cn(
                "hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 xl:inline-flex",
                storeFocus
              )}
            >
              <Phone aria-hidden="true" className="h-4 w-4 text-brand-700" />
              <span className="tabular-nums">{mainPhone}</span>
            </a>
          )}
          <CartButton />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 lg:hidden",
              storeFocus
            )}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        title="Menu"
        className="font-sans"
        footer={
          <Link
            href={storeRoutes.packages}
            onClick={closeMenu}
            className={buttonClasses({ size: "lg", className: "w-full sm:w-full" })}
          >
            Shop packages
            <ArrowRight aria-hidden="true" />
          </Link>
        }
      >
        <nav aria-label="Menu">
          <ul className="-mx-2 space-y-1">
            {drawerLinks.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors",
                      storeFocus,
                      active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {mainPhone && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Talk to an engineer</p>
            <a
              href={telHref(mainPhone)}
              className={cn("mt-1 inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-slate-900", storeFocus)}
            >
              <Phone aria-hidden="true" className="h-4 w-4 text-brand-700" />
              <span className="tabular-nums">{mainPhone}</span>
            </a>
          </div>
        )}
      </Drawer>
    </header>
  );
}
