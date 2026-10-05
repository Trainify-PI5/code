import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import LandingPage from "../pages/LandingPage";
import SalesContact from "../pages/SalesContact";

export default function AuthRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetToken = new URLSearchParams(location.search).get("token") || "";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage onGoToLogin={() => navigate("/login")} onContact={() => navigate("/contratar")} />} />
          <Route path="/contratar" element={<SalesContact />} />
          <Route path="/login" element={<Login onNavigate={() => navigate("/forgot-password")} />} />
          <Route path="/forgot-password" element={<ForgotPassword onNavigate={() => navigate("/login")} />} />
          <Route path="/reset-password" element={<ResetPassword key={resetToken} token={resetToken} onNavigate={() => navigate("/login", { replace: true })} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
