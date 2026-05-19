import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import SmartModule from "./pages/SmartModule/index.jsx";


function App() {
  return (
    <Router>
      <Navbar />
      <main style={{ minHeight: "60vh" }}>
        <Routes>
          <Route
            path="/"
            element={<Home />}
            
          />
          <Route
            path="/platform"
            element={<Platform />}
          />
          <Route
            path="/about"
            element={<AboutUs/>}
          />
          <Route
            path="/contact"
            element={<Contact />}
          />
          <Route
            path="/smart"
            element={<SmartModule/>}
          />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
