import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { projectsApi } from "../api";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", translation: "ESV", style_guide: "" });

  async function load() {
    setLoading(true);
    try {
      setProjects(await projectsApi.list());
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
    try {
      const project = await projectsApi.create(form);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppLayout>
      <div className="row-between">
        <h1>Projects</h1>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New project"}</button>
      </div>

      {showForm && (
        <form className="card" onSubmit={create}>
          <input
            placeholder="Project name (e.g. Sample Study Bible)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="row">
            <select value={form.translation} onChange={(e) => setForm({ ...form, translation: e.target.value })}>
              {["ESV", "NIV", "KJV", "NASB", "NLT"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              placeholder="Style guide (e.g. warm, pastoral, doctrinally precise)"
              value={form.style_guide}
              onChange={(e) => setForm({ ...form, style_guide: e.target.value })}
            />
          </div>
          <button type="submit">Create</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet. Create one to get started.</p>
      ) : (
        <ul className="list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`}>
                <strong>{p.name}</strong>
                <span className="muted">
                  {p.translation} · {p.description || "No description"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
