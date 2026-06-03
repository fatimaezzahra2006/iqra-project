import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, AuthProvider } from "./utils/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AppLayout from "./components/AppLayout";
import ScrollToTop from "./utils/ScrollToTop";

import Home        from "./pages/Home";
import Contact     from "./pages/Contact";
import Login       from "./pages/Login";
import Signup      from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Profile     from "./pages/Profile";

import Dashboard      from "./pages/SmartModule/Dashboard";
import StudyPlan      from "./pages/SmartModule/StudyPlan";
import VisualLearning from "./pages/SmartModule/VisualLearning";
import CareerAdvisor  from "./pages/SmartModule/CareerAdvisor";

import ProtectedRoute from "./components/ProtectedRoute";
import PageShell      from "./components/PageShell";

// Dashboard & profile use sidebar layout
const SIDEBAR_ROUTES = ['/dashboard', '/profile'];

function AppInner() {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isRTL = ['ar', 'darija'].includes(i18n.language);

  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const isSidebar = isAuthenticated && SIDEBAR_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <>
      <ScrollToTop />
      <Navbar />
      {isSidebar ? (
        <AppLayout>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </AppLayout>
      ) : (
        <>
          <main>
            <Routes>
              {/* Public — accessibles à tous */}
              <Route path="/"            element={<Home />} />
              <Route path="/contact"     element={<Contact />} />
              <Route path="/login"       element={<Login />} />
              <Route path="/signup"      element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Smart pages — accessibles à tous sans restriction */}
              <Route path="/study-plan" element={
                <PageShell pageKey="study" emoji="📚" color="#8e55a1">
                  <StudyPlan onBack={() => window.history.back()} />
                </PageShell>
              } />
              <Route path="/visual-learning" element={
                <PageShell pageKey="visual" emoji="🎥" color="#0ea5e9">
                  <VisualLearning onBack={() => window.history.back()} />
                </PageShell>
              } />
              <Route path="/career-advisor" element={
                <PageShell pageKey="career" emoji="🎯" color="#f59e0b">
                  <CareerAdvisor onBack={() => window.history.back()} />
                </PageShell>
              } />

              {/* Dashboard — seulement connecté */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Legacy redirects */}
              <Route path="/smart"        element={<Navigate to="/dashboard" replace />} />
              <Route path="/smart/study"  element={<Navigate to="/study-plan" replace />} />
              <Route path="/smart/gap"    element={<Navigate to="/visual-learning" replace />} />
              <Route path="/smart/career" element={<Navigate to="/career-advisor" replace />} />
              <Route path="/platform"     element={<Navigate to="/" replace />} />
              <Route path="/about"        element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
}

export default App;
