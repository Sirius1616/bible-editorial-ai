import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi } from "../api";

export default function Editor() {
  const { projectId, itemId } = useParams();
  const [item, setItem] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [body, setBody] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const list = await itemsApi.list(projectId);
      const found = list.find((i) => String(i.id) === itemId);
      const [v, c] = await Promise.all([
        itemsApi.versions(projectId, itemId),
        itemsApi.comments(projectId, itemId),
      ]);
      setItem(found ?? null);
      setVersions(v);
      setComments(c);
      const latest = v[v.length - 1];
      if (latest) {
        setSelectedVersion(latest);
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

  async function saveVersion(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await itemsApi.addVersion(projectId, itemId, { body, change_note: changeNote || "Manual edit" });
      setChangeNote("");
      await load();
      setInfo("Version saved.");
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
      await itemsApi.generateDraft(projectId, itemId);
      await load();
      setInfo("AI draft generated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function review(action) {
    setError("");
    try {
      const updated = await itemsApi.review(projectId, itemId, action);
      setItem((prev) => ({ ...prev, status: updated.status }));
      setInfo(action === "approve" ? "Item approved." : "Item rejected.");
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

  const statusLabel = (s) => ({ draft: "Draft", rejected: "Rejected", approved: "Approved" }[s] ?? s);

  if (loading) {
    return (
      <AppLayout>
        <p className="muted">Loading…</p>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <p className="error">Item not found.</p>
        <Link to={`/projects/${projectId}`} className="link-button">
          ← Back to project
        </Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <p>
        <Link to={`/projects/${projectId}`} className="link-button">
          ← All items
        </Link>
      </p>
      <div className="row-between">
        <div>
          <h1>{item.title}</h1>
          <p className="muted">
            {item.passage || "No passage"} · {item.content_type} ·{" "}
            <span className={item.status === "approved" ? "badge-approved" : item.status === "rejected" ? "badge-rejected" : "badge-draft"}>
              {statusLabel(item.status)}
            </span>
          </p>
        </div>
        <div className="row">
          {item.status !== "approved" && (
            <button className="danger" onClick={() => review("reject")}>
              Reject
            </button>
          )}
          {item.status !== "approved" && (
            <button className="primary" onClick={() => review("approve")}>
              Approve
            </button>
          )}
          <button onClick={exportMarkdown}>Export .md</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <div className="grid-2">
        <section className="card">
          <div className="row-between">
            <h2>Editor</h2>
            <button disabled={drafting} onClick={generateDraft}>
              {drafting ? "Generating…" : "Generate AI draft"}
            </button>
          </div>
          <form onSubmit={saveVersion}>
            <textarea
              className="editor-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Content body…"
              rows={14}
            />
            <input
              placeholder="Change note (e.g. revised intro, checked against NIV)"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
            <div className="row-between">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save new version"}
              </button>
              <span className="muted">v{versions.length || 1}</span>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Versions</h2>
          {versions.length === 0 ? (
            <p className="muted">No versions yet. Generate a draft to get started.</p>
          ) : (
            <ul className="list">
              {[...versions].reverse().map((v) => (
                <li key={v.id}>
                  <button
                    className={`link-button ${selectedVersion?.id === v.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedVersion(v);
                      setBody(v.body);
                    }}
                  >
                    <strong>v{v.version_number}</strong>
                    <span className="muted">{v.change_note || "No note"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Comments</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!commentBody.trim()) return;
            try {
              await itemsApi.addComment(projectId, itemId, { body: commentBody });
              setCommentBody("");
              setComments(await itemsApi.comments(projectId, itemId));
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <input
            placeholder="Add a comment for the team…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <button type="submit">Comment</button>
        </form>
        {comments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          <ul className="list">
            {comments.map((c) => (
              <li key={c.id} className="comment">
                <span className="muted">
                  {new Date(c.created_at).toLocaleString()}
                </span>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppLayout>
  );
}
