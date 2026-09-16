import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import HomeIcon from "@mui/icons-material/Home";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Container } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import config from "../utils/config";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useSelector } from "react-redux";
import { getCartData } from "../features/cart";
import { ILogoImg } from "../utils/icon";
const { routes } = config;

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
  "absolute min-w-[18px] h-[18px] px-[5px] rounded-full text-[11px] leading-[18px] font-semibold text-center";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { cart } = useSelector(getCartData);

  const navItems = navigation.map((page) => ({
    ...page,
    current: page.href === pathname,
  }));

  return (
    <Disclosure
      as="nav"
      className="bg-navbar_color text-white fixed top-0 py-1 right-0 left-0 shadow z-50"
    >
      {({ open }) => (
        <Container className="px-0">
          <div className="mx-auto sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
                {/* Mobile menu button*/}
                <DisclosureButton
                  className={`relative inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white ${
                    open &&
                    "outline-none ring-2 bg-white ring-inset ring-white text-black"
                  }`}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
              </div>

              <div className="flex flex-1 items-center justify-start md:items-center md:justify-center lg:justify-between">
                <div className="flex flex-shrink-0 items-center sm:ml-0 ml-9">
                  <img src={ILogoImg} alt="Juwon Electric" width={88} height={62} />
                </div>
                <div className="hidden md:ml-10 lg:ml-20 md:block mt-1">
                  <div className="flex items-center">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          item.current
                            ? "border-b-black_color border-b-2 text-white"
                            : "hover:text-gray-200",
                          "capitalize text-sm font-medium mx-5 text-white inline-flex items-center transition-colors duration-150"
                        )}
                        aria-current={item.current ? "page" : undefined}
                      >
                        {item.name === "Home" ? (
                          <HomeIcon />
                        ) : item.name === "Cart" ? (
                          <div className="relative">
                            <ShoppingCartIcon />
                            <span className={`md:block hidden ${cartBadge} left-4 bottom-3 !bg-brand-500 !text-white`}>
                              {cart?.length || 0}
                            </span>
                          </div>
                        ) : (
                          item.name
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute md:hidden inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto sm:ml-6 sm:pr-0">
                <Link className="relative inline-flex p-2 -m-2" to={routes.cart} aria-label="Cart">
                  <ShoppingCartIcon />
                  <span className={`${cartBadge} left-6 bottom-5 !bg-brand-500 !text-white`}>
                    {cart?.length || 0}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navItems
                .filter((a) => a.name.toLowerCase() !== "cart")
                .map((item) => (
                  <DisclosureButton
                    key={item.name}
                    as={"a"}
                    href={item.href}
                    className={classNames(
                      item.current
                        ? "bg-gray-900 !text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:!text-white",
                      "capitalize block rounded-md px-3 !text-white text-center py-2 text-base font-medium"
                    )}
                    aria-current={item.current ? "page" : undefined}
                  >
                    {item.name}
                  </DisclosureButton>
                ))}
            </div>
          </DisclosurePanel>
        </Container>
      )}
    </Disclosure>
  );
}
