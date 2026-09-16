import { createContext, useContext } from "react";

export const AdminContext = createContext({
  loading: false,
  error: "",
  loaded: {},
  refresh: () => {},
});

export const useAdmin = () => useContext(AdminContext);
