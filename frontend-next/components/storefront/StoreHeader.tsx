"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone } from "lucide-react";
import { Drawer, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { contactTopicPath, isActivePath, primaryPhone, storeDrawerNav, storeNav, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeContainer, storeFocus, storePress } from "@/lib/storefront/styles";
import CartButton from "./cart/CartButton";

/** Hides the Calculator link while the calculator is switched off in Settings. */
const withCalculator = <T extends { href: string }>(items: T[], calculatorEnabled: boolean) =>
  calculatorEnabled ? items : items.filter((item) => item.href !== storeRoutes.calculator);

/** Scroll distance after which the home header turns solid (TEAM_AND_MOTION_V1 §7.2). */
const SOLID_AFTER_PX = 24;

/**
 * Height of the header bar. With its 1px bottom border the header is 65px (73px from md), and HomeHero, PageIntro and
 * their loading placeholders pull themselves up by exactly that (`-mt-[65px] md:-mt-[73px]`) to sit under it, with no
 * strip of page background above them.
 */
const HEADER_HEIGHT = "h-16 md:h-[72px]";

const quoteHref = contactTopicPath("Quote");

export type StoreHeaderProps = {
  /** Business phone from settings (may hold several numbers; the first is shown). */
  phone: string;
  /** `settings.calculator` is enabled; when it's off the Calculator link is hidden. */
  calculatorEnabled: boolean;
};

/** Elements that take no space or aren't shown, so a hero after them still starts the page. */
const NON_VISUAL_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "LINK", "META", "NOSCRIPT"]);
const isNonVisual = (element: Element) =>
  NON_VISUAL_TAGS.has(element.tagName) || element.hasAttribute("hidden") || element.classList.contains("sr-only");

/** True when the first shown element of `#store-main` is (or starts with) a `[data-store-hero]` band. */
function pageStartsWithHero() {
  const main = document.getElementById("store-main");
  const hero = main?.querySelector("[data-store-hero]");
  if (!main || !hero) return false;
  for (let node: Element | null = hero; node && node !== main; node = node.parentElement) {
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (!isNonVisual(sibling)) return false;
    }
  }
  return true;
}

/** Re-checks after the page content changes (navigation, a loading placeholder swapping to the page), once a frame. */
function subscribeToPage(onChange: () => void) {
  const main = document.getElementById("store-main");
  if (!main || typeof MutationObserver === "undefined") return () => {};
  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        onChange();
      });
    }
  });
  observer.observe(main, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}

/**
 * Whether the page begins with a dark hero (TEAM_AND_MOTION_V1 §8.1). Every storefront page and loading placeholder
 * does, so the server render (and hydration) assume yes; the browser then checks the DOM, which only differs on the
 * error page.
 */
const usePageHasHero = () => useSyncExternalStore(subscribeToPage, pageStartsWithHero, () => true);

/**
 * True while the page is scrolled past the threshold. The one scroll listener the storefront allows (§7.2): passive, and
 * throttled to one check per animation frame. Only attached on pages that start with a hero.
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
 * At the top of any page that starts with a `[data-store-hero]` band (the home hero and every PageIntro) it is
 * transparent over it. After scrolling 24px, and on a page without a hero, it is a dark glass bar (translucent slate-950
 * with a blur) so the gold logo and white nav stay legible over light and dark content alike. Both states use white nav
 * with a gold underline on the active item, the logo without a chip, a white phone link, a glass cart and menu button
 * and a gold quote pill. Background, border and shadow transition over 250ms; the bar height never changes, so nothing
 * shifts.
 */
export default function StoreHeader({ phone, calculatorEnabled }: StoreHeaderProps) {
  const navItems = withCalculator(storeNav, calculatorEnabled);
  const drawerLinks = [{ label: "Home", href: storeRoutes.home }, ...withCalculator(storeDrawerNav, calculatorEnabled), { label: "Cart", href: storeRoutes.cart }];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const mainPhone = primaryPhone(phone);
  const hasHero = usePageHasHero();
  const scrolled = useScrolledPast(hasHero, SOLID_AFTER_PX);
  const overlay = hasHero && !scrolled;

  const glassFocus = "focus-visible:ring-white focus-visible:ring-offset-slate-900";

  return (
    <header
      data-overlay={overlay ? "true" : undefined}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow,color] duration-[250ms] ease-out",
        overlay
          ? // Without JavaScript the header can't turn solid, so it scrolls away with the dark hero instead of floating
            // transparent over light content.
            "border-transparent bg-transparent text-white [@media(scripting:none)]:relative"
          : "border-white/10 bg-slate-950/90 text-white shadow-elev-2 backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/70"
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
            "-ml-2 shrink-0 rounded-lg px-2 py-1",
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
                      "text-white/90 hover:bg-white/10 hover:text-white",
                      active && "text-white after:absolute after:inset-x-2.5 after:bottom-1 after:h-0.5 after:rounded-full after:bg-gold-400 after:content-[''] xl:after:inset-x-3"
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
                "text-white hover:bg-white/10",
                storeFocus,
                glassFocus
              )}
            >
              <Phone aria-hidden="true" className="h-4 w-4 text-gold-400" />
              <span className="tabular-nums">{mainPhone}</span>
            </a>
          )}
          <Link
            href={quoteHref}
            className={cn(
              "hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[background-color,color,translate] duration-200 lg:inline-flex",
              "motion-safe:hover:-translate-y-0.5",
              "bg-gold-400 text-slate-950 hover:bg-gold-300",
              storeFocus,
              glassFocus,
              storePress
            )}
          >
            Get a quote
          </Link>
          <CartButton className={cn("border-white/20 bg-white/10 text-white shadow-none backdrop-blur hover:bg-white/20 hover:text-white", glassFocus)} />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-lg border shadow-xs transition-colors duration-[250ms] lg:hidden",
              "border-white/20 bg-white/10 text-white shadow-none backdrop-blur hover:bg-white/20",
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
