import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./pages/Home/LandingPage";
import config from "./utils/config";
import Services from "./pages/Services/Services";
import Portfolio from "./pages/Portfolio";
import Packages from "./pages/Packages/Packages";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart/Cart";
import AdminApp from "./pages/Admin/AdminApp";
import { Toaster } from "./components/ui";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={config.routes.home} element={<LandingPage />} />
        <Route path={config.routes.services} element={<Services />} />
        <Route path={config.routes.portfolio} element={<Portfolio />} />
        <Route path={config.routes.packages} element={<Packages />} />
        <Route path={config.routes.contact} element={<Contact />} />
        <Route path={config.routes.cart} element={<Cart />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
      <ScrollToTop />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
