import {
  BookOpen,
  CheckCircle2,
  FileText,
  FolderPlus,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi } from "../api";

function ProjectCard({ project, items, onOpen }) {
  const total = items.length;
  const approved = items.filter((i) => i.status === "approved").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  const inReview = total - approved - rejected;
  const pct = total ? Math.round((approved / total) * 100) : 0;

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
          <CheckCircle2 size={14} /> {approved} approved
        </span>
        <span className="row" style={{ gap: "0.3rem" }}>
          <XCircle size={14} /> {rejected} rejected
        </span>
      </div>

      {total > 0 && (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="project-card-meta" style={{ justifyContent: "space-between" }}>
            <span>{inReview} in review</span>
            <span style={{ fontWeight: 600, color: pct === 100 ? "var(--success)" : undefined }}>
              {pct}% approved
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [itemsByProject, setItemsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    translation: "ESV",
    style_guide: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await projectsApi.list();
      setProjects(list);
      const results = await Promise.all(
        list.map(async (p) => {
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
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await projectsApi.create(form);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  const allItems = Object.values(itemsByProject).flat();
  const stats = {
    items: allItems.length,
    approved: allItems.filter((i) => i.status === "approved").length,
    rejected: allItems.filter((i) => i.status === "rejected").length,
    review: allItems.filter((i) => i.status === "draft").length,
  };

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
        <button className="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : (
            <>
              <Plus size={16} /> New project
            </>
          )}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
              <div className="stat-value">{stats.review}</div>
              <div className="stat-label">In review</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon green">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.approved}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon red">
              <XCircle size={20} />
            </span>
            <div>
              <div className="stat-value">{stats.rejected}</div>
              <div className="stat-label">Rejected</div>
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
              Create your first editorial project to start drafting study notes, devotionals, and
              reference entries.
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
