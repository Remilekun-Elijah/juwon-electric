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
};

environment.staging = {
  authProps: ["je/token", "je/user"],
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  routes,
  padding: { x: "lg", y: "10rem" },
};

environment.production = {
  authProps: ["je/token", "je/user"],
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  routes,
  padding: { x: "lg", y: "10rem" },
};

export default environment[import.meta.env.MODE || "development"];
