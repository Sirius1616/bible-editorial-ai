import {
  BookOpen,
  CheckCircle2,
  FileText,
  FolderPlus,
  Loader2,
  Plus,
  Settings,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi, workspacesApi } from "../api";

function ProjectCard({ project, items, onOpen }) {
  const total = items.length;
  const ready = items.filter((i) => i.status === "ready").length;
  const archived = items.filter((i) => i.status === "archived").length;
  const active = total - ready - archived;
  const pct = total ? Math.round((ready / total) * 100) : 0;

  return (
    <div className="project-card" onClick={() => onOpen(project.id)}>
      <div className="project-card-head">
        <span className="project-card-title">{project.name}</span>
        <span className="badge badge-neutral">{project.translation}</span>
      </div>
      <p className="project-card-desc">{project.description || "No description yet."}</p>

      <div className="project-card-meta">
        <span className="row" style={{ gap: "0.3rem" }}>
          <FileText size={14} /> {total} items
        </span>
        <span className="row" style={{ gap: "0.3rem" }}>
          <CheckCircle2 size={14} /> {ready} ready
        </span>
        <span className="row" style={{ gap: "0.3rem" }}>
          <XCircle size={14} /> {archived} archived
        </span>
      </div>

      {total > 0 && (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="project-card-meta" style={{ justifyContent: "space-between" }}>
            <span>{active} active</span>
            <span style={{ fontWeight: 600, color: pct === 100 ? "var(--success)" : undefined }}>
              {pct}% ready
            </span>
          </div>
        </>
      )}
    </div>
  );
}

const ROLE_BADGE = {
  owner: "badge-approved",
  admin: "badge-type",
  member: "badge-neutral",
  viewer: "badge-qa",
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [itemsByProject, setItemsByProject] = useState({});
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWs, setActiveWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    translation: "ESV",
    style_guide: "",
    workspace_id: null,
  });

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const list = await projectsApi.list();
      const visible = activeWs ? list.filter((p) => p.workspace_id === activeWs) : list;
      setProjects(visible);
      const results = await Promise.all(
        visible.map(async (p) => {
          try {
            return [String(p.id), await itemsApi.list(p.id)];
          } catch {
            return [String(p.id), []];
          }
        }),
      );
      setItemsByProject(Object.fromEntries(results));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    workspacesApi
      .list()
      .then((ws) => {
        setWorkspaces(ws);
        setActiveWs((cur) => cur ?? ws[0]?.id ?? null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeWs != null) loadProjects();
  }, [activeWs]);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await projectsApi.create({ ...form, workspace_id: activeWs });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  const allItems = Object.values(itemsByProject).flat();
  const stats = {
    items: allItems.length,
    active: allItems.filter((i) => !["ready", "archived"].includes(i.status)).length,
    ready: allItems.filter((i) => i.status === "ready").length,
    archived: allItems.filter((i) => i.status === "archived").length,
  };
  const activeWorkspace = workspaces.find((w) => w.id === activeWs);

  return (
    <AppLayout>
      <div className="page-head">
        <div>
          <div className="title-row">
            <h1>Your projects</h1>
            <span className="badge badge-neutral">{projects.length} total</span>
          </div>
          <p className="sub">Manage editorial projects and track approval progress.</p>
        </div>
        <div className="row" style={{ gap: "0.6rem" }}>
          <Link to="/workspaces" className="button-secondary">
            <Settings size={16} /> Workspaces
          </Link>
          <button className="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : (
              <>
                <Plus size={16} /> New project
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {workspaces.length > 1 && (
        <div className="workspace-tabs" role="tablist" aria-label="Workspaces">
          {workspaces.map((w) => (
            <button
              key={w.id}
              role="tab"
              aria-selected={w.id === activeWs}
              className={`workspace-tab${w.id === activeWs ? " active" : ""}`}
              onClick={() => setActiveWs(w.id)}
            >
              {w.name}
              <span className={`tab-count ${ROLE_BADGE[w.my_role] || "badge-neutral"}`}>
                {w.member_count}
              </span>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>New project</h2>
          <form className="inline-form" onSubmit={create}>
            <div className="form-grid">
              <div className="full">
                <label htmlFor="p-name">Project name</label>
                <input
                  id="p-name"
                  placeholder="e.g. Sample Study Bible"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="full">
                <label htmlFor="p-desc">Description</label>
                <input
                  id="p-desc"
                  placeholder="A short description of the project"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="p-trans">Base translation</label>
                <select
                  id="p-trans"
                  value={form.translation}
                  onChange={(e) => setForm({ ...form, translation: e.target.value })}
                >
                  {["ESV", "NIV", "KJV", "NASB", "NLT"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="p-ws">Workspace</label>
                <select
                  id="p-ws"
                  value={activeWs ?? ""}
                  onChange={(e) => setActiveWs(Number(e.target.value))}
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label htmlFor="p-style">Style guide</label>
                <input
                  id="p-style"
                  placeholder="e.g. warm, pastoral, doctrinally precise"
                  value={form.style_guide}
                  onChange={(e) => setForm({ ...form, style_guide: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creating}>
                {creating && <Loader2 size={16} className="spinner" />}
                <FolderPlus size={16} /> Create project
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon blue">
              <BookOpen size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.items}</div>
              <div className="stat-label">Total items</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon gold">
              <FileText size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon green">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.ready}</div>
              <div className="stat-label">Ready</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon red">
              <XCircle size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.archived}</div>
              <div className="stat-label">Archived</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <FolderPlus size={26} />
            </span>
            <h3>No projects yet</h3>
            <p>
              {activeWorkspace
                ? `Create your first project in “${activeWorkspace.name}” to start drafting study notes, devotionals, and reference entries.`
                : "Create your first editorial project to start drafting study notes, devotionals, and reference entries."}
            </p>
            <button className="primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create your first project
            </button>
          </div>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              items={itemsByProject[String(p.id)] || []}
              onOpen={(id) => navigate(`/projects/${id}`)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
