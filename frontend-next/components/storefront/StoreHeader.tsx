"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone } from "lucide-react";
import { Drawer, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { contactTopicPath, isActivePath, primaryPhone, publicPathname, storeDrawerNav, storeNav, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeContainer, storeFocus, storePress } from "@/lib/storefront/styles";
import CartButton from "./cart/CartButton";

/** Hides the Calculator link while the calculator is switched off in Settings. */
const withCalculator = <T extends { href: string }>(items: T[], calculatorEnabled: boolean) =>
  calculatorEnabled ? items : items.filter((item) => item.href !== storeRoutes.calculator);

/** Scroll distance after which the home header turns solid (TEAM_AND_MOTION_V1 §7.2). */
const SOLID_AFTER_PX = 24;

/** Height of the header bar. HomeHero pulls itself up by the same amount (`-mt-16 md:-mt-[72px]`) to sit under it. */
const HEADER_HEIGHT = "h-16 md:h-[72px]";

const quoteHref = contactTopicPath("Quote");

export type StoreHeaderProps = {
  /** Business phone from settings (may hold several numbers; the first is shown). */
  phone: string;
  /** `settings.calculator` is enabled; when it's off the Calculator link is hidden. */
  calculatorEnabled: boolean;
};

/**
 * True while the page is scrolled past the threshold. The one scroll listener the storefront allows (§7.2): passive, and
 * throttled to one check per animation frame. Only attached on the home page.
 */
function useScrolledPast(enabled: boolean, threshold: number) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setPast(window.scrollY >= threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, threshold]);

  return enabled && past;
}

/**
 * Sticky header: logo, main navigation, phone (xl), "Get a quote", cart with live count, and a mobile navigation drawer.
 *
 * On the home page at the top it is transparent over the hero: white nav with a gold underline on the active item, the
 * logo on a white chip, a glass cart and menu button and a gold quote pill. After scrolling 24px, and on every other
 * page, it is the solid white header. Colours, background and shadow transition over 250ms; the bar height never
 * changes, so nothing shifts.
 */
export default function StoreHeader({ phone, calculatorEnabled }: StoreHeaderProps) {
  const navItems = withCalculator(storeNav, calculatorEnabled);
  const drawerLinks = [{ label: "Home", href: storeRoutes.home }, ...withCalculator(storeDrawerNav, calculatorEnabled), { label: "Cart", href: storeRoutes.cart }];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const mainPhone = primaryPhone(phone);
  const isHome = publicPathname(pathname) === "/";
  const scrolled = useScrolledPast(isHome, SOLID_AFTER_PX);
  const overlay = isHome && !scrolled;

  const glassFocus = overlay ? "focus-visible:ring-white focus-visible:ring-offset-slate-900" : "";

  return (
    <header
      data-overlay={overlay ? "true" : undefined}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow,color] duration-[250ms] ease-out",
        overlay
          ? "border-transparent bg-transparent text-white"
          : "border-slate-200 bg-white/95 shadow-elev-2 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      )}
    >
      {/* Soft top shade so white nav text stays legible over bright photos. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/60 to-transparent transition-opacity duration-[250ms]",
          overlay ? "opacity-100" : "opacity-0"
        )}
      />
      <div className={cn(storeContainer, HEADER_HEIGHT, "flex items-center gap-3 lg:gap-4")}>
        <Link
          href={storeRoutes.home}
          className={cn(
            "-ml-2 shrink-0 rounded-lg px-2 py-1 transition-[background-color,box-shadow] duration-[250ms]",
            overlay && "bg-white shadow-elev-2",
            storeFocus,
            glassFocus
          )}
        >
          <Image src="/logo.svg" alt="Juwon Electric home" width={88} height={62} priority className="h-9 w-auto md:h-10" />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-10 items-center rounded-lg px-2.5 text-sm font-medium transition-colors duration-[250ms] xl:px-3",
                      storeFocus,
                      glassFocus,
                      overlay
                        ? cn(
                            "text-white/90 hover:bg-white/10 hover:text-white",
                            active && "text-white after:absolute after:inset-x-2.5 after:bottom-1 after:h-0.5 after:rounded-full after:bg-gold-400 after:content-[''] xl:after:inset-x-3"
                          )
                        : active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
                "hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-[250ms] xl:inline-flex",
                overlay ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                storeFocus,
                glassFocus
              )}
            >
              <Phone aria-hidden="true" className={cn("h-4 w-4", overlay ? "text-gold-400" : "text-brand-700")} />
              <span className="tabular-nums">{mainPhone}</span>
            </a>
          )}
          <Link
            href={quoteHref}
            className={cn(
              "hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[background-color,color,translate] duration-200 lg:inline-flex",
              "motion-safe:hover:-translate-y-0.5",
              overlay ? "bg-gold-400 text-slate-950 hover:bg-gold-300" : "bg-brand-700 text-white hover:bg-brand-800",
              storeFocus,
              glassFocus,
              storePress
            )}
          >
            Get a quote
          </Link>
          <CartButton className={overlay ? cn("border-white/20 bg-white/10 text-white shadow-none backdrop-blur hover:bg-white/20 hover:text-white", glassFocus) : undefined} />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-lg border shadow-xs transition-colors duration-[250ms] lg:hidden",
              overlay
                ? "border-white/20 bg-white/10 text-white shadow-none backdrop-blur hover:bg-white/20"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              storeFocus,
              glassFocus
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
        className="font-sans text-slate-900"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Link href={storeRoutes.packages} onClick={closeMenu} className={buttonClasses({ size: "lg", className: "w-full sm:w-full" })}>
              Shop packages
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href={quoteHref} onClick={closeMenu} className={buttonClasses({ variant: "outline", size: "lg", className: "w-full sm:w-full" })}>
              Get a quote
            </Link>
          </div>
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
