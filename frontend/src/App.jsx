import { MotionConfig, motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isAuthenticated } from "./api/client";
import { ThemeProvider } from "./theme";
import Editor from "./pages/Editor";
import Invite from "./pages/Invite";
import Login from "./pages/Login";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";
import Workspaces from "./pages/Workspaces";
import WorkspaceSettings from "./pages/WorkspaceSettings";

function RequireAuth({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:token" element={<Invite />} />
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <Projects />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <RequireAuth>
                <ProjectDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId/items/:itemId"
            element={
              <RequireAuth>
                <Editor />
              </RequireAuth>
            }
          />
          <Route
            path="/workspaces"
            element={
              <RequireAuth>
                <Workspaces />
              </RequireAuth>
            }
          />
          <Route
            path="/workspaces/:workspaceId"
            element={
              <RequireAuth>
                <WorkspaceSettings />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </motion.div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  );
}
