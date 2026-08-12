import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi } from "../api";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", passage: "", content_type: "study_note" });

  async function load() {
    try {
      const list = await projectsApi.list();
      const found = list.find((p) => String(p.id) === projectId);
      setProject(found ?? { id: projectId, name: "Project" });
      setItems(await itemsApi.list(projectId));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [projectId]);

  async function createItem(e) {
    e.preventDefault();
    try {
      await itemsApi.create(projectId, form);
      setShowForm(false);
      setForm({ title: "", passage: "", content_type: "study_note" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const statusLabel = (s) => ({ draft: "Draft", rejected: "Rejected", approved: "Approved" }[s] ?? s);

  return (
    <AppLayout>
      <p>
        <Link to="/projects" className="link-button">
          ← All projects
        </Link>
      </p>
      <div className="row-between">
        <h1>{project?.name}</h1>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New item"}</button>
      </div>
      {project?.style_guide && <p className="muted">Style: {project.style_guide}</p>}

      {showForm && (
        <form className="card" onSubmit={createItem}>
          <input
            placeholder="Title (e.g. God So Loved the World)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            placeholder="Passage (e.g. John 3:16-17)"
            value={form.passage}
            onChange={(e) => setForm({ ...form, passage: e.target.value })}
          />
          <select
            value={form.content_type}
            onChange={(e) => setForm({ ...form, content_type: e.target.value })}
          >
            {["study_note", "devotional", "reference_entry"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="submit">Create</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {items.length === 0 ? (
        <p className="muted">No content items yet.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/projects/${projectId}/items/${item.id}`}>
                <strong>{item.title}</strong>
                <span className="muted">
                  {item.passage || "No passage"} · {statusLabel(item.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
