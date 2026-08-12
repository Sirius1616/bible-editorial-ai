import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi } from "../api";

const STATUS_LABELS = { draft: "In review", approved: "Approved", rejected: "Rejected" };

function StatusBadge({ status }) {
  const cls = { draft: "badge-draft", approved: "badge-approved", rejected: "badge-rejected" }[status];
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Editor() {
  const { projectId, itemId } = useParams();
  const [project, setProject] = useState(null);
  const [item, setItem] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [body, setBody] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  async function load() {
    setError("");
    try {
      const [p, item, v, c] = await Promise.all([
        projectsApi.get(projectId),
        itemsApi.get(projectId, itemId),
        itemsApi.versions(projectId, itemId),
        itemsApi.comments(projectId, itemId),
      ]);
      setProject(p);
      setItem(item);
      setVersions(v);
      setComments(c);
      const latest = v[v.length - 1];
      if (latest) {
        setSelected(latest);
        setBody(latest.body);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectId, itemId]);

  function flashSaved() {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  async function saveVersion(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const v = await itemsApi.addVersion(projectId, itemId, {
        body,
        change_note: changeNote || "Manual edit",
      });
      await load();
      setChangeNote("");
      setSelected(v);
      flashSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateDraft() {
    setDrafting(true);
    setError("");
    setInfo("");
    try {
      const v = await itemsApi.generateDraft(projectId, itemId);
      await load();
      setSelected(v);
      setInfo(
        v.change_note?.includes("demo mode")
          ? "AI draft generated in demo mode (no OPENAI_API_KEY set). Add a key in backend/.env for live drafts."
          : "AI draft generated and saved as a new version."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function review(action) {
    setError("");
    setInfo("");
    try {
      const updated = await itemsApi.review(projectId, itemId, action);
      setItem((prev) => ({ ...prev, status: updated.status }));
      setInfo(action === "approve" ? "Item approved for production." : "Item rejected.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function exportMarkdown() {
    setError("");
    try {
      const blob = await itemsApi.exportItem(projectId, itemId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item?.title.replace(/\s+/g, "_").toLowerCase() || "item"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setError("");
    try {
      await itemsApi.addComment(projectId, itemId, { body: commentBody });
      setCommentBody("");
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading item…</span>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <FileText size={26} />
            </span>
            <h3>Item not found</h3>
            <Link to={`/projects/${projectId}`} className="link-button">
              <ArrowLeft size={16} /> Back to project
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const typeLabel = (item.content_type || "study_note").replace("_", " ");

  return (
    <AppLayout>
      <nav className="crumbs">
        <Link to="/projects">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`}>{project?.name || "Project"}</Link>
        <span>/</span>
        <span className="current">{item.title}</span>
      </nav>

      <div className="editor-head">
        <div>
          <div className="title-row">
            <h1>{item.title}</h1>
            <StatusBadge status={item.status} />
            <span className="badge badge-type">{typeLabel}</span>
          </div>
          <p className="sub" style={{ marginTop: "0.35rem" }}>
            <span className="passage-ref">
              <BookOpen size={15} /> {item.passage || "No passage reference"}
            </span>
            <span className="muted" style={{ marginLeft: "0.75rem" }}>
              v{versions.length} · updated {formatDate(item.updated_at)}
            </span>
          </p>
        </div>
        <div className="actions">
          <button onClick={exportMarkdown} title="Export Markdown">
            <Download size={16} /> Export
          </button>
          {item.status !== "approved" && (
            <button className="danger" onClick={() => review("reject")}>
              <XCircle size={16} /> Reject
            </button>
          )}
          {item.status !== "approved" && (
            <button className="primary" onClick={() => review("approve")}>
              <CheckCircle2 size={16} /> Approve
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="editor-grid">
        <div>
          <div className="editor-panel">
            <div className="panel-title">
              <h2>
                <Sparkles size={15} /> Content editor
              </h2>
              <button className="accent" onClick={generateDraft} disabled={drafting}>
                {drafting ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
                {drafting ? "Generating…" : "Generate AI draft"}
              </button>
            </div>

            <form onSubmit={saveVersion}>
              <textarea
                className="editor-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write or edit content here. The project style guide will guide AI drafts."
                rows={16}
              />
              <input
                className="editor-note-input"
                placeholder="Change note (e.g. revised intro, checked against NIV)"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
              <div className="editor-actions">
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {body.length} characters
                </span>
                <div className="row">
                  {saved && <span className="badge badge-approved">Saved</span>}
                  <button type="submit" className="primary" disabled={saving}>
                    {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                    Save new version
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="side-panel">
          <div className="editor-panel">
            <div className="panel-title">
              <h2>
                <History size={15} /> Versions
              </h2>
              <span className="badge badge-neutral">{versions.length}</span>
            </div>
            {versions.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No versions yet. Generate an AI draft to get started.
              </p>
            ) : (
              <div>
                {[...versions].reverse().map((v) => (
                  <div
                    key={v.id}
                    className={`version-item ${selected?.id === v.id ? "active" : ""}`}
                    onClick={() => {
                      setSelected(v);
                      setBody(v.body);
                    }}
                  >
                    <div className="version-meta">
                      <span className="version-no">v{v.version_number}</span>
                      <span className="version-date">{formatDate(v.created_at)}</span>
                    </div>
                    <div className="version-note">{v.change_note || "No note"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="editor-panel">
            <div className="panel-title">
              <h2>
                <MessageSquare size={15} /> Comments
              </h2>
              <span className="badge badge-neutral">{comments.length}</span>
            </div>
            {comments.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No comments yet. Leave feedback for the editorial team.
              </p>
            ) : (
              <div>
                {comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-meta">
                      <span className="comment-author">
                        <span className="avatar" style={{ width: "24px", height: "24px", fontSize: "0.65rem" }}>
                          {"E"}
                        </span>
                        Editor
                      </span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                    <p className="comment-body">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <form className="comment-box" onSubmit={addComment}>
              <input
                placeholder="Add a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" disabled={!commentBody.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
