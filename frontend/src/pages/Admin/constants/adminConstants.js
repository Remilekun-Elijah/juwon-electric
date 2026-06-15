import {
  Dashboard,
  Inventory2,
  Mail,
  ShoppingCart,
  Work,
} from "@mui/icons-material";

export const loginTokenKey = "je/admin-session";
export const adminUserKey = "je/admin-user";

export const modules = [
  { id: "dashboard", label: "Dashboard", icon: Dashboard },
  { id: "packages", label: "Packages", icon: Inventory2 },
  { id: "services", label: "Services", icon: Work },
  { id: "portfolio", label: "Portfolio", icon: Work },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "contacts", label: "Contact", icon: Mail },
  { id: "newsletter", label: "Newsletter", icon: Mail },
];

export const packageTypeOptions = [
  { value: "tubular", label: "Tubular" },
  { value: "lithium", label: "Lithium" },
  { value: "hybrid lithium", label: "Hybrid Lithium" },
];

export const emptyPackage = {
  type: "tubular",
  name: "",
  load: "",
  kva: "",
  volt: "",
  options: [
    { name: "Without solar", price: "", kits: "" },
    { name: "With solar", price: "", kits: "" },
  ],
  isActive: true,
};

export const emptyService = {
  title: "",
  subtitle: "",
  image: "",
  ctaLabel: "Let's go",
  ctaUrl: "/packages",
  isActive: true,
};

export const emptyPortfolio = {
  name: "",
  image: "",
  link: "",
  featured: false,
  mobile: true,
  isActive: true,
};
