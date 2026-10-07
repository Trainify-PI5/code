import { useState, useEffect, Suspense, lazy } from "react";
import { cn } from "./lib/utils";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AuthRouter from "./components/AuthRouter";
const Home = lazy(() => import("./pages/Home"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseBuilder = lazy(() => import("./pages/CourseBuilder"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Analytics = lazy(() => import("./pages/Analytics"));
const IAAssistant = lazy(() => import("./pages/IAAssistant"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CourseAssessment = lazy(() => import("./pages/CourseAssessment"));
const Certifications = lazy(() => import("./pages/Certifications"));
const Support = lazy(() => import("./pages/Support"));
const Users = lazy(() => import("./pages/Users"));
const LessonPlayer = lazy(() => import("./pages/LessonPlayer"));
const Forum = lazy(() => import("./pages/Forum"));
const TenantSettings = lazy(() => import("./pages/TenantSettings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const SalesRequests = lazy(() => import("./pages/SalesRequests"));
const Companies = lazy(() => import("./pages/Companies"));
const Invitations = lazy(() => import("./pages/Invitations"));
const AcceptInvitation = lazy(() => import("./pages/auth/AcceptInvitation"));
const SalesContact = lazy(() => import("./pages/SalesContact"));
const CourseResults = lazy(() => import("./pages/CourseResults"));
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";
import AIChatWidget from "./components/AIChatWidget";
import CommandPalette from "./components/CommandPalette";
import api from "./services/api";
import { CompanyBrandingProvider } from "./contexts/CompanyBrandingContext";


function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user) {
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const canAccess = allowedRoles.includes(user.role) || (isSuperAdmin && allowedRoles.includes("ADMIN"));
    if (!canAccess) return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, token, updateUser, user } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api.get('/users/me').then(({ data }) => {
      if (!cancelled) updateUser({ name: data.name, bio: data.bio, avatar: data.avatar });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated, token, updateUser]);

  // Ctrl+K no Windows e Linux, Cmd+K no Mac. O preventDefault e necessario
  // porque Cmd+K e atalho nativo do navegador para a barra de endereco.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && typeof e.key === "string" && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAberta((aberta) => !aberta);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  if (location.pathname === "/accept-invitation") {
    return <Suspense fallback={<p role="status">Carregando...</p>}><AcceptInvitation key={location.hash} /></Suspense>;
  }

  if (location.pathname === "/contratar") {
    return <Suspense fallback={<p role="status">Carregando...</p>}><SalesContact /></Suspense>;
  }

  if (!isAuthenticated) {
    return <AuthRouter />;
  }

  const activeTab = location.pathname.split("/")[1] || "home";

  return (
    <CompanyBrandingProvider key={user?.tenantId || user?.id} enabled={!!user && user.role !== "SUPER_ADMIN"}>
    <div className="flex h-screen w-full bg-surface-bright transition-colors duration-200 overflow-hidden relative">
      {/* Overlay para mobile quando a sidebar estiver expandida */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          navigate(`/${tab === "home" ? "" : tab}`);
          if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
        }}
        isCollapsed={isSidebarCollapsed}
      />

      <div
        className={cn(
          "flex flex-col transition-all duration-300 h-full w-full overflow-hidden",
          isSidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[260px]"
        )}
      >
        <TopBar
          onNotify={() => navigate("/notifications")}
          onSupport={() => navigate("/support")}
          onSettings={() => navigate("/settings")}
          onProfile={() => navigate("/profile")}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onOpenSearch={() => setPaletaAberta(true)}
        />

        <main className="flex-1 overflow-y-auto w-full relative flex flex-col">
          <div className="p-4 sm:p-6 lg:p-8 w-full flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                className="flex-1 flex flex-col w-full"
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center animate-pulse">...</div></div>}>
                  <Routes location={location} key={location.pathname}>
                    <Route path="/sales-requests" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><SalesRequests /></ProtectedRoute>} />
                    <Route path="/companies" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><Companies /></ProtectedRoute>} />
                    <Route path="/invitations" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Invitations /></ProtectedRoute>} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Home />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/home" element={<Navigate to="/" replace />} />

                    <Route
                      path="/courses"
                      element={
                        <ProtectedRoute>
                          <Courses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/builder"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]}>
                          <CourseBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/builder/:id"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]}>
                          <CourseBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/:id"
                      element={
                        <ProtectedRoute>
                          <CourseDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/:id/learn"
                      element={
                        <ProtectedRoute>
                          <LessonPlayer />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/:id/results"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "INSTRUCTOR"]}>
                          <CourseResults />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses/:id/forum"
                      element={
                        <ProtectedRoute>
                          <Forum />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/lessons/:lessonId/assessment"
                      element={
                        <ProtectedRoute>
                          <CourseAssessment onBack={() => navigate(-1)} />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboards"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                          <Analytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/certifications"
                      element={
                        <ProtectedRoute>
                          <Certifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/assistant"
                      element={
                        <ProtectedRoute>
                          <IAAssistant />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                          <Users />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/tenant-settings"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                          <TenantSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/audit-logs"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                          <AuditLogs />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/support"
                      element={
                        <ProtectedRoute>
                          <Support />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/unauthorized"
                      element={
                        <div className="flex items-center justify-center h-full">
                          <h1 className="text-2xl font-bold">
                            Acesso Negado (403)
                          </h1>
                        </div>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AIChatWidget />
      <CommandPalette open={paletaAberta} onClose={() => setPaletaAberta(false)} />
    </div>
    </CompanyBrandingProvider>
  );
}
