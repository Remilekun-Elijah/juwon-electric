"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { House, Menu, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart } from "@/lib/cart/store";
import { routes } from "@/lib/site";

const navigation = [
  { name: "Home", href: routes.home },
  { name: "Services", href: routes.services },
  { name: "Portfolio", href: routes.portfolio },
  { name: "Packages", href: routes.packages },
  { name: "Contact", href: routes.contact },
  { name: "Cart", href: routes.cart },
];

// Count bubble on the cart icon: fixed size so 1- and 2-digit counts stay round and centred.
const cartBadge =
  "absolute min-w-[18px] h-[18px] px-[5px] rounded-full text-[11px] leading-[18px] font-semibold text-center bg-brand-500 text-white";

const focusRing = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

/** Port of frontend/src/components/Navbar.jsx (MUI icons → lucide, react-router → next/link). */
export default function Navbar() {
  const pathname = usePathname();
  const cart = useCart();
  const count = cart.length;

  const navItems = navigation.map((page) => ({
    ...page,
    current: page.href === "/" ? pathname === "/" : pathname === page.href || pathname.startsWith(`${page.href}/`),
  }));

  return (
    <Disclosure as="nav" aria-label="Main" className="fixed left-0 right-0 top-0 z-50 bg-navbar_color py-1 text-white shadow-sm">
      {({ open, close }) => (
        <div className="mx-auto w-full max-w-7xl px-0">
          <div className="mx-auto sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
                <DisclosureButton
                  className={cn(
                    "relative inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-700 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white",
                    open && "bg-white text-black outline-hidden ring-2 ring-inset ring-white"
                  )}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">{open ? "Close main menu" : "Open main menu"}</span>
                  {open ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
              </div>

              <div className="flex flex-1 items-center justify-start md:items-center md:justify-center lg:justify-between">
                <Link href={routes.home} className={cn("ml-9 flex shrink-0 items-center rounded-sm sm:ml-0", focusRing)}>
                  <Image src="/logo.svg" alt="Juwon Electric" width={88} height={62} priority />
                </Link>
                <div className="mt-1 hidden md:ml-10 md:block lg:ml-20">
                  <div className="flex items-center">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          item.current ? "border-b-2 border-b-black text-white" : "hover:text-gray-200",
                          "mx-5 inline-flex items-center rounded-sm text-sm font-medium capitalize text-white transition-colors duration-150",
                          focusRing
                        )}
                        aria-current={item.current ? "page" : undefined}
                        aria-label={item.name === "Home" ? "Home" : item.name === "Cart" ? `Cart, ${count} items` : undefined}
                      >
                        {item.name === "Home" ? (
                          <House aria-hidden="true" className="h-6 w-6" fill="currentColor" />
                        ) : item.name === "Cart" ? (
                          <span className="relative">
                            <ShoppingCart aria-hidden="true" className="h-6 w-6" />
                            <span aria-hidden="true" className={cn("bottom-3 left-4 hidden md:block", cartBadge)}>
                              {count}
                            </span>
                          </span>
                        ) : (
                          item.name
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:ml-6 sm:pr-0 md:static md:inset-auto md:hidden">
                <Link
                  className={cn("relative -m-2 inline-flex rounded-md p-2", focusRing)}
                  href={routes.cart}
                  aria-label={`Cart, ${count} items`}
                >
                  <ShoppingCart aria-hidden="true" className="h-6 w-6" />
                  <span aria-hidden="true" className={cn("bottom-5 left-6", cartBadge)}>
                    {count}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navItems
                .filter((item) => item.name !== "Cart")
                .map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => close()}
                    className={cn(
                      item.current ? "bg-gray-900" : "hover:bg-gray-700",
                      "block rounded-md px-3 py-2 text-center text-base font-medium capitalize text-white",
                      focusRing
                    )}
                    aria-current={item.current ? "page" : undefined}
                  >
                    {item.name}
                  </Link>
                ))}
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
