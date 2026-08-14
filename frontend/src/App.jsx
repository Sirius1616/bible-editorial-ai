import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isAuthenticated } from "./api/client";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
    </BrowserRouter>
  );
}
