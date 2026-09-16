const routes = {
  home: "/",
  services: "/services",
  portfolio: "/portfolio",
  packages: "/packages",
  contact: "/contact",
  cart: "/cart",
};

const shared = {
  routes,
  padding: { x: "lg", y: "10rem" },
  socials: {
    fb: "https://www.facebook.com/juwonelectric?mibextid=LQQJ4d",
    insta: "https://www.instagram.com/juwon__electric",
    tt: "https://www.tiktok.com/@juwon_electric",
    x: "https://x.com/juwon_electric?s=21&t=V5eLolxJSbC7bJ7s6X0dVQ",
  },
};

const environment = {
  development: {
    ...shared,
    backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:9000",
  },
  staging: {
    ...shared,
    backendUrl:
      import.meta.env.VITE_BACKEND_URL || "https://juwon-electric.onrender.com",
  },
  production: {
    ...shared,
    backendUrl: import.meta.env.VITE_BACKEND_URL,
  },
};

export default environment[import.meta.env.MODE || "development"];
