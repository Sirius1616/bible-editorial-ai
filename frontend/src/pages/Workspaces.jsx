import { Building2, Loader2, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { workspacesApi } from "../api";

const ROLE_BADGE = {
  owner: "badge-approved",
  admin: "badge-type",
  member: "badge-neutral",
  viewer: "badge-qa",
};

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setWorkspaces(await workspacesApi.list());
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
      const ws = await workspacesApi.create(name);
      setWorkspaces((list) => [...list, ws]);
      setName("");
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-head">
        <div>
          <div className="title-row">
            <h1>Workspaces</h1>
            <span className="badge badge-neutral">{workspaces.length} total</span>
          </div>
          <p className="sub">
            Each publisher gets its own workspace with invited members — projects are scoped to a
            workspace so publishers never see each other's data.
          </p>
        </div>
        <button className="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus size={16} /> New workspace
            </>
          )}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>New workspace</h2>
          <form className="inline-form" onSubmit={create}>
            <div className="form-grid">
              <div className="full">
                <label htmlFor="ws-name">Workspace name</label>
                <input
                  id="ws-name"
                  placeholder="e.g. Grace Publishers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creating}>
                {creating && <Loader2 size={16} className="spinner" />}
                <Building2 size={16} /> Create workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading workspaces…</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <Building2 size={26} />
            </span>
            <h3>No workspaces yet</h3>
            <p>Create a workspace to organize projects and invite your editorial team.</p>
            <button className="primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create a workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((w) => (
            <Link key={w.id} to={`/workspaces/${w.id}`} className="workspace-card">
              <div className="workspace-card-head">
                <span className="workspace-card-icon">
                  <Building2 size={20} />
                </span>
                <span className={`badge ${ROLE_BADGE[w.my_role] || "badge-neutral"}`}>
                  {w.my_role}
                </span>
              </div>
              <div className="workspace-card-title">{w.name}</div>
              <div className="workspace-card-meta">
                <span className="row" style={{ gap: "0.3rem" }}>
                  <Users size={14} /> {w.member_count} member{w.member_count === 1 ? "" : "s"}
                </span>
                <span className="row" style={{ gap: "0.3rem" }}>
                  <X size={14} /> manage
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
