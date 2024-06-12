const environment = {};

const routes = {
  home: "/",
  services: "/services",
  portfolio: "/portfolio",
  packages: "/packages",
  contact: "/contact",
  cart: "/cart",
};

environment.development = {
  authProps: ["je/token", "je/user"],
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  routes,
  padding: { x: "lg", y: "10rem" },
  socials: {
    fb: "https://www.facebook.com/juwonelectric?mibextid=LQQJ4d",
    insta: "https://www.instagram.com/juwon__electric",
    tt: "https://www.tiktok.com/@juwon_electric",
    x: "https://x.com/juwon_electric?s=21&t=V5eLolxJSbC7bJ7s6X0dVQ",
  },
};

environment.staging = {
  authProps: ["je/token", "je/user"],
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  routes,
  padding: { x: "lg", y: "10rem" },
  socials: {
    fb: "https://www.facebook.com/juwonelectric?mibextid=LQQJ4d",
    insta: "https://www.instagram.com/juwon__electric",
    tt: "https://www.tiktok.com/@juwon_electric",
    x: "https://x.com/juwon_electric?s=21&t=V5eLolxJSbC7bJ7s6X0dVQ",
  },
};

environment.production = {
  authProps: ["je/token", "je/user"],
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  routes,
  padding: { x: "lg", y: "10rem" },
  socials: {
    fb: "https://www.facebook.com/juwonelectric?mibextid=LQQJ4d",
    insta: "https://www.instagram.com/juwon__electric",
    tt: "https://www.tiktok.com/@juwon_electric",
    x: "https://x.com/juwon_electric?s=21&t=V5eLolxJSbC7bJ7s6X0dVQ",
  },
};

export default environment[import.meta.env.MODE || "development"];
