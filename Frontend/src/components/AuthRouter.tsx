import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import LandingPage from "../pages/LandingPage";

type AuthPage = "landing" | "login" | "forgot-password";

export default function AuthRouter() {
  const [page, setPage] = useState<AuthPage>("landing");

  const navigate = (target: AuthPage) => setPage(target);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {page === "landing" && (
          <LandingPage onGoToLogin={() => navigate("login")} />
        )}
        {page === "login" && (
          <Login onNavigate={(p) => navigate(p as AuthPage)} />
        )}
        {page === "forgot-password" && (
          <ForgotPassword onNavigate={(p) => navigate(p as AuthPage)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
