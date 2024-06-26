// eslint-disable-next-line no-unused-vars

import { useEffect } from "react";
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
const { routes } = config;

let navigation = [
  { name: "Home", href: routes.home, current: true },
  { name: "Services", href: routes.services, current: false },
  { name: "Portfolio", href: routes.portfolio, current: false },
  { name: "Packages", href: routes.packages, current: false },
  { name: "Contact", href: routes.contact, current: false },
  { name: "Cart", href: routes.cart, current: false },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { cart } = useSelector(getCartData);

  const handleNavigate = (newPage) => {
    const newNav = navigation.map((page) => {
      if (page.href === newPage) page.current = true;
      else page.current = false;
      return page;
    });
    navigation = newNav;
  };

  function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }
  useEffect(() => {
    handleNavigate(pathname);
  }, []);

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
                  <img className="" src="/logo.svg" alt="Your Company" />
                </div>
                <div className="hidden md:ml-10 lg:ml-20 md:block mt-1">
                  <div className="flex">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className={classNames(
                          item.current
                            ? "border-b-black_color border-b-2 text-white"
                            : "hover:text-gray-200",
                          "capitalize text-sm font-medium mx-5 pb- text-white"
                        )}
                        aria-current={item.current ? "page" : undefined}
                      >
                        {item.name === "Home" ? (
                          <HomeIcon />
                        ) : item.name === "Cart" ? (
                          <div className="relative">
                            <ShoppingCartIcon />
                            <span className="md:block hidden absolute py-[0px] px-[5px] rounded-full left-4 bottom-3 !bg-red !text-white">
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
                <Link className="relative" to={config.routes.cart}>
                  <ShoppingCartIcon />
                  <span className=" absolute py-[0px] px-[5px] rounded-full left-4 bottom-3 !bg-red !text-white">
                    {cart?.length || 0}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation
                .filter((a) => a.name.toLowerCase() != "cart")
                .map((item) => (
                  <DisclosureButton
                    key={item.name}
                    as={Link}
                    to={item.href}
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
