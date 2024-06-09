const environment = {};

const routes = {
  home: "/",
  services: "/",
  portfolio: "/",
  packages: "/",
  contact: "/",
  cart: "/",
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
// DO NOT REMOVE
// console.log(process.env.REACT_APP_ENV);
console.log(import.meta.env.VITE_BACKEND_URL);
// console.log(process.env.REACT_APP_TYPE);
console.log(import.meta.env);

export default environment[import.meta.env.MODE || "development"];
