// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/Home/LandingPage";
import config from "./utils/config";
import Services from "./pages/Services/Services";
import Portfolio from "./pages/Portfolio";
import Packages from "./pages/Packages/Packages";
import Contact from "./pages/Contact";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={config.routes.home} element={<LandingPage />} />
        <Route path={config.routes.services} element={<Services />} />
        <Route path={config.routes.portfolio} element={<Portfolio />} />
        <Route path={config.routes.packages} element={<Packages />} />
        <Route path={config.routes.contact} element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
