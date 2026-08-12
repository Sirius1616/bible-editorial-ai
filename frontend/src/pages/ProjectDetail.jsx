import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi } from "../api";
import { STATUS_BADGE, STATUS_LABELS, STATUS_ORDER } from "../workflow";

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status] ?? "badge-neutral"}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function typeIcon(type) {
  return type === "devotional" ? <BookOpen size={15} /> : <FileText size={15} />;
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", passage: "", content_type: "study_note" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, items] = await Promise.all([
        projectsApi.get(projectId),
        itemsApi.list(projectId),
      ]);
      setProject(p);
      setItems(items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectId]);

  async function createItem(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await itemsApi.create(projectId, form);
      setShowForm(false);
      setForm({ title: "", passage: "", content_type: "study_note" });
      await load();
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.passage || "").toLowerCase().includes(q) ||
        i.content_type.includes(q)
      );
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const c = { all: items.length, assigned: 0, in_progress: 0, in_review: 0, qa: 0, ready: 0, archived: 0 };
    for (const i of items) c[i.status] += 1;
    return c;
  }, [items]);

  if (loading) {
    return (
      <AppLayout>
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading project…</span>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <FileText size={26} />
            </span>
            <h3>Project not found</h3>
            <p>It may have been deleted, or you don't have access to it.</p>
            <Link to="/projects" className="link-button">
              <ArrowLeft size={16} /> Back to projects
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <nav className="crumbs">
        <Link to="/projects">Projects</Link>
        <span>/</span>
        <span className="current">{project.name}</span>
      </nav>

      <div className="page-head">
        <div>
          <div className="title-row">
            <h1>{project.name}</h1>
            <span className="badge badge-neutral">{project.translation}</span>
            {project.style_guide && (
              <span className="badge badge-type">Style: {project.style_guide}</span>
            )}
          </div>
          <p className="sub">{project.description || "No description provided."}</p>
        </div>
        <button className="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus size={16} /> New item
            </>
          )}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>New content item</h2>
          <form className="inline-form" onSubmit={createItem}>
            <div className="form-grid">
              <div>
                <label htmlFor="i-title">Title</label>
                <input
                  id="i-title"
                  placeholder="e.g. God So Loved the World"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="i-passage">Passage reference</label>
                <input
                  id="i-passage"
                  placeholder="e.g. John 3:16-17"
                  value={form.passage}
                  onChange={(e) => setForm({ ...form, passage: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="i-type">Content type</label>
                <select
                  id="i-type"
                  value={form.content_type}
                  onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                >
                  {["study_note", "devotional", "reference_entry"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creating}>
                {creating && <Loader2 size={16} className="spinner" />}
                <Plus size={16} /> Create item
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon blue">
            <FileText size={20} />
          </span>
          <div>
            <div className="stat-value">{counts.all}</div>
            <div className="stat-label">Total items</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon gold">
            <FileText size={20} />
          </span>
          <div>
            <div className="stat-value">{counts.in_review + counts.qa + counts.in_progress + counts.assigned}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <div className="stat-value">{counts.ready}</div>
            <div className="stat-label">Ready</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon red">
            <XCircle size={20} />
          </span>
          <div>
            <div className="stat-value">{counts.archived}</div>
            <div className="stat-label">Archived</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-tabs">
          {[
            ["all", `All (${counts.all})`],
            ["assigned", `Assigned (${counts.assigned})`],
            ["in_progress", `In progress (${counts.in_progress})`],
            ["in_review", `In review (${counts.in_review})`],
            ["qa", `QA (${counts.qa})`],
            ["ready", `Ready (${counts.ready})`],
            ["archived", `Archived (${counts.archived})`],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`filter-tab ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Search items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <FileText size={26} />
            </span>
            <h3>{items.length === 0 ? "No content items yet" : "Nothing matches your search"}</h3>
            <p>
              {items.length === 0
                ? "Create your first study note, devotional, or reference entry to start the editorial flow."
                : "Try a different filter or search term."}
            </p>
            {items.length === 0 && (
              <button className="primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Create item
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Passage</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/projects/${projectId}/items/${item.id}`)}>
                  <td>
                    <span className="cell-title">
                      {item.title}
                      <small>
                        Updated {new Date(item.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </small>
                    </span>
                  </td>
                  <td className="cell-muted passage-ref">{item.passage || "—"}</td>
                  <td>
                    <span className="badge badge-type">
                      {typeIcon(item.content_type)}
                      {item.content_type.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--faint)" }}>
                    <ChevronRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
