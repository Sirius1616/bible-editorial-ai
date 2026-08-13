import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  GitCompare,
  History,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { itemsApi, projectsApi } from "../api";
import { ALLOWED_TRANSITIONS, STATUS_BADGE, STATUS_LABELS } from "../workflow";

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] ?? "badge-neutral"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function anchorLabel(v) {
  if (!v.book || !v.chapter || !v.verse) return null;
  let label = `${v.book} ${v.chapter}:${v.verse}`;
  if (v.endVerse) label += `-${v.endVerse}`;
  return label;
}

function buildAnnotatedParts(body, comments) {
  const anchors = comments
    .filter(
      (c) =>
        c.anchor_type === "text" &&
        !c.parent_id &&
        c.anchor_start != null &&
        c.anchor_end != null,
    )
    .map((c) => ({
      id: c.id,
      start: parseInt(c.anchor_start, 10),
      end: parseInt(c.anchor_end, 10),
    }))
    .filter((a) => Number.isFinite(a.start) && Number.isFinite(a.end) && a.end > a.start);
  if (!anchors.length) return null;
  anchors.sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  for (const a of anchors) {
    const s = Math.min(Math.max(a.start, cursor), body.length);
    const e = Math.min(Math.max(a.end, s), body.length);
    if (s > cursor) parts.push({ key: `p${cursor}`, text: body.slice(cursor, s) });
    if (e > s) parts.push({ key: `c${a.id}`, commentId: a.id, text: body.slice(s, e) });
    cursor = e;
  }
  if (cursor < body.length) parts.push({ key: `p${cursor}`, text: body.slice(cursor) });
  return parts;
}

function buildStyleParts(body, issues) {
  const spans = issues
    .map((issue) => {
      const start = body.indexOf(issue.snippet);
      return { start, end: start + issue.snippet.length, severity: issue.severity };
    })
    .filter((s) => s.start !== -1);
  if (!spans.length) return null;
  spans.sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  for (const s of spans) {
    const start = Math.min(Math.max(s.start, cursor), body.length);
    const end = Math.min(Math.max(s.end, start), body.length);
    if (start > cursor) parts.push({ key: `p${cursor}`, text: body.slice(cursor, start) });
    if (end > start) parts.push({ key: `s${start}`, text: body.slice(start, end), severity: s.severity });
    cursor = end;
  }
  if (cursor < body.length) parts.push({ key: `p${cursor}`, text: body.slice(cursor) });
  return parts;
}

function CommentCard({ comment, onResolve, onReply, replyOpen, replyBody, setReplyBody, onSubmitReply }) {
  const anchor =
    comment.anchor_type === "verse" && comment.anchor_start
      ? comment.anchor_start
      : comment.anchor_text
        ? `“${comment.anchor_text}”`
        : null;
  return (
    <div className={`comment-item ${comment.resolved ? "resolved" : ""}`}>
      <div className="comment-meta">
        <span className="comment-author">
          <span className="avatar" style={{ width: "24px", height: "24px", fontSize: "0.65rem" }}>
            {"E"}
          </span>
          Editor
        </span>
        <span>{formatDate(comment.created_at)}</span>
      </div>
      {anchor && <span className="badge badge-type comment-anchor">{anchor}</span>}
      <p className="comment-body">{comment.body}</p>
      {comment.resolved && <span className="badge badge-approved">Resolved</span>}
      {(onResolve || onReply) && (
        <div className="comment-actions">
          {onResolve && (
            <button className="link-button" onClick={onResolve}>
              {comment.resolved ? "Reopen" : "Resolve"}
            </button>
          )}
          {onReply && (
            <button className="link-button" onClick={onReply}>
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          )}
        </div>
      )}
      {replyOpen && (
        <form className="comment-box reply-box" onSubmit={onSubmitReply}>
          <input
            autoFocus
            placeholder="Reply…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <button type="submit" disabled={!replyBody.trim()}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

export default function Editor() {
  const { projectId, itemId } = useParams();
  const [project, setProject] = useState(null);
  const [item, setItem] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [body, setBody] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [footnotesText, setFootnotesText] = useState("");
  const [crossRefsText, setCrossRefsText] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [anchor, setAnchor] = useState({
    book: "",
    startChapter: "",
    startVerse: "",
    endChapter: "",
    endVerse: "",
  });
  const [savingAnchor, setSavingAnchor] = useState(false);
  const [anchorSaved, setAnchorSaved] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("");
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [anchorMode, setAnchorMode] = useState("none");
  const [vAnchor, setVAnchor] = useState({ book: "", chapter: "", verse: "", endVerse: "" });
  const [annotationsOn, setAnnotationsOn] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [styleResult, setStyleResult] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleMarksOn, setStyleMarksOn] = useState(false);
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
      const [p, item, v, c, h] = await Promise.all([
        projectsApi.get(projectId),
        itemsApi.get(projectId, itemId),
        itemsApi.versions(projectId, itemId),
        itemsApi.comments(projectId, itemId),
        itemsApi.history(projectId, itemId),
      ]);
      setProject(p);
      setItem(item);
      setVersions(v);
      setComments(c);
      setHistory(h);
      setNextStatus((ALLOWED_TRANSITIONS[item.status] ?? [])[0] ?? "");
      setAnchor({
        book: item.verse_start?.book ?? "",
        startChapter: item.verse_start?.chapter?.toString() ?? "",
        startVerse: item.verse_start?.verse?.toString() ?? "",
        endChapter: item.verse_end?.chapter?.toString() ?? "",
        endVerse: item.verse_end?.verse?.toString() ?? "",
      });
      setVAnchor({
        book: item.verse_start?.book ?? "",
        chapter: item.verse_start?.chapter?.toString() ?? "",
        verse: item.verse_start?.verse?.toString() ?? "",
        endVerse: item.verse_end?.verse?.toString() ?? "",
      });
      const latest = v[v.length - 1];
      if (latest) {
        setSelected(latest);
        setBody(latest.body);
        setFootnotesText((latest.footnotes ?? []).map((n) => (typeof n === "string" ? n : n.text)).join("\n"));
        setCrossRefsText((latest.cross_refs ?? []).join("\n"));
      }
      if (v.length >= 2) {
        setFromVersion(String(v[v.length - 2].version_number));
        setToVersion(String(v[v.length - 1].version_number));
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
        footnotes: footnotesText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text, i) => ({ number: i + 1, text })),
        cross_refs: crossRefsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
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

  async function saveAnchor(e) {
    e.preventDefault();
    setSavingAnchor(true);
    setError("");
    setInfo("");
    try {
      const updated = await itemsApi.update(projectId, itemId, {
        verse_start:
          anchor.book && anchor.startChapter && anchor.startVerse
            ? { book: anchor.book, chapter: Number(anchor.startChapter), verse: Number(anchor.startVerse) }
            : null,
        verse_end:
          anchor.book && anchor.endChapter && anchor.endVerse
            ? { book: anchor.book, chapter: Number(anchor.endChapter), verse: Number(anchor.endVerse) }
            : null,
      });
      setItem((prev) => ({ ...prev, passage: updated.passage, verse_start: updated.verse_start, verse_end: updated.verse_end }));
      setAnchorSaved(true);
      setTimeout(() => setAnchorSaved(false), 2500);
      setInfo(`Verse anchor updated: ${updated.passage || "none"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAnchor(false);
    }
  }

  function openCompare() {
    if (versions.length < 2) return;
    const nums = versions.map((v) => v.version_number);
    setFromVersion(String(nums[nums.length - 2]));
    setToVersion(String(nums[nums.length - 1]));
    setDiffOpen(true);
    setDiff(null);
  }

  async function runDiff(e) {
    e?.preventDefault();
    if (!fromVersion || !toVersion) return;
    setDiffLoading(true);
    setError("");
    try {
      const result = await itemsApi.diffVersions(
        projectId,
        itemId,
        Number(fromVersion),
        Number(toVersion),
      );
      setDiff(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDiffLoading(false);
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

  async function checkStyle() {
    if (!body.trim()) return;
    setStyleLoading(true);
    setError("");
    try {
      const result = await itemsApi.styleCheck(projectId, itemId, body);
      setStyleResult(result);
      setStyleMarksOn(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setStyleLoading(false);
    }
  }

  async function transitionTo(e) {
    e?.preventDefault();
    if (!nextStatus) return;
    setTransitioning(true);
    setError("");
    setInfo("");
    try {
      const updated = await itemsApi.transition(projectId, itemId, nextStatus);
      setItem((prev) => ({ ...prev, status: updated.status }));
      setInfo(`Item moved to ${STATUS_LABELS[updated.status] ?? updated.status}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTransitioning(false);
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
    setCommentLoading(true);
    setError("");
    try {
      const payload = { body: commentBody.trim() };
      if (anchorMode === "text" && selectionAnchor) {
        payload.anchor_type = "text";
        payload.anchor_start = String(selectionAnchor.start);
        payload.anchor_end = String(selectionAnchor.end);
        payload.anchor_text = selectionAnchor.text;
      } else if (anchorMode === "verse" && vAnchor.book && vAnchor.chapter && vAnchor.verse) {
        payload.anchor_type = "verse";
        payload.anchor_start = `${vAnchor.book} ${vAnchor.chapter}:${vAnchor.verse}`;
        if (vAnchor.endVerse) {
          payload.anchor_end = `${vAnchor.book} ${vAnchor.chapter}:${vAnchor.endVerse}`;
        }
        payload.anchor_text = anchorLabel(vAnchor);
      }
      await itemsApi.addComment(projectId, itemId, payload);
      setCommentBody("");
      setSelectionAnchor(null);
      setAnchorMode("none");
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function submitReply(e, parentId) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setCommentLoading(true);
    setError("");
    try {
      await itemsApi.addComment(projectId, itemId, { body: replyBody.trim(), parent_id: parentId });
      setReplyBody("");
      setReplyTo(null);
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function toggleResolve(comment) {
    setError("");
    try {
      await itemsApi.updateComment(projectId, itemId, comment.id, { resolved: !comment.resolved });
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
            {item.due_date && (
              <span className="muted" style={{ marginLeft: "0.75rem" }}>
                Due {formatDate(item.due_date)}
              </span>
            )}
          </p>
        </div>
        <div className="actions">
          <button onClick={exportMarkdown} title="Export Markdown">
            <Download size={16} /> Export
          </button>
          {(ALLOWED_TRANSITIONS[item.status] ?? []).length > 0 && (
            <form className="transition-form" onSubmit={transitionTo}>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                title="Move item to next workflow state"
              >
                {(ALLOWED_TRANSITIONS[item.status] ?? []).map((s) => (
                  <option key={s} value={s}>
                    Move to {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={nextStatus === "ready" ? "primary" : undefined}
                disabled={transitioning || !nextStatus}
              >
                {transitioning ? <Loader2 size={16} className="spinner" /> : <CheckCircle2 size={16} />}
                Apply
              </button>
            </form>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <form className="card anchor-edit" onSubmit={saveAnchor}>
        <div className="panel-title">
          <h2>
            <BookOpen size={15} /> Verse anchor
          </h2>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Anchors this item to an exact book/chapter/verse range.
          </span>
        </div>
        <div className="anchor-row">
          <input
            placeholder="Book (e.g. John)"
            value={anchor.book}
            onChange={(e) => setAnchor({ ...anchor, book: e.target.value })}
          />
          <input
            type="number"
            min="1"
            placeholder="Start ch."
            value={anchor.startChapter}
            onChange={(e) => setAnchor({ ...anchor, startChapter: e.target.value })}
          />
          <input
            type="number"
            min="1"
            placeholder="Start v."
            value={anchor.startVerse}
            onChange={(e) => setAnchor({ ...anchor, startVerse: e.target.value })}
          />
          <span className="muted">→</span>
          <input
            type="number"
            min="1"
            placeholder="End ch."
            value={anchor.endChapter}
            onChange={(e) => setAnchor({ ...anchor, endChapter: e.target.value })}
          />
          <input
            type="number"
            min="1"
            placeholder="End v."
            value={anchor.endVerse}
            onChange={(e) => setAnchor({ ...anchor, endVerse: e.target.value })}
          />
          <div className="row" style={{ gap: "0.5rem" }}>
            {anchorSaved && <span className="badge badge-approved">Saved</span>}
            <button type="submit" className="primary" disabled={savingAnchor}>
              {savingAnchor ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              Save anchor
            </button>
          </div>
        </div>
      </form>

      <div className="editor-grid">
        <div>
          <div className="editor-panel">
            <div className="panel-title">
              <h2>
                <Sparkles size={15} /> Content editor
              </h2>
              <div className="row" style={{ gap: "0.4rem" }}>
                <button
                  className={annotationsOn ? "accent" : undefined}
                  onClick={() => setAnnotationsOn((s) => !s)}
                  title="Toggle inline comment markers"
                >
                  <MessageSquare size={14} />
                  {annotationsOn ? "Editing" : "Annotate"}
                </button>
                <button
                  className={styleMarksOn ? "accent" : undefined}
                  onClick={checkStyle}
                  disabled={styleLoading || !body.trim()}
                  title="Check this draft against the project style guide"
                >
                  {styleLoading ? <Loader2 size={14} className="spinner" /> : <Gauge size={14} />}
                  {styleLoading ? "Checking…" : "Style check"}
                </button>
                <button className="accent" onClick={generateDraft} disabled={drafting}>
                  {drafting ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
                  {drafting ? "Generating…" : "Generate AI draft"}
                </button>
              </div>
            </div>

            <form onSubmit={saveVersion}>
              {styleMarksOn ? (
                <div
                  className="annotations-view"
                  onClick={() => {
                    if (styleResult?.issues.length) {
                      document
                        .querySelector("#style-panel")
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }}
                >
                  {(() => {
                    const parts = buildStyleParts(body, styleResult?.issues ?? []);
                    if (!parts) return body || "No style issues to highlight.";
                    return parts.map((p) =>
                      p.severity ? (
                        <mark key={p.key} className={`style-mark severity-${p.severity}`}>
                          {p.text}
                        </mark>
                      ) : (
                        <span key={p.key}>{p.text}</span>
                      ),
                    );
                  })()}
                </div>
              ) : annotationsOn ? (
                <div
                  className="annotations-view"
                  onClick={(e) => {
                    const mark = e.target.closest("[data-comment-id]");
                    if (mark) {
                      setActiveCommentId(Number(mark.dataset.commentId));
                      document
                        .querySelector("#comments-panel")
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }}
                >
                  {(() => {
                    const parts = buildAnnotatedParts(body, comments);
                    if (!parts) return body || "No content to annotate.";
                    return parts.map((p) =>
                      p.commentId != null ? (
                        <mark
                          key={p.key}
                          className={`inline-mark ${activeCommentId === p.commentId ? "active" : ""}`}
                          data-comment-id={p.commentId}
                        >
                          {p.text}
                        </mark>
                      ) : (
                        <span key={p.key}>{p.text}</span>
                      ),
                    );
                  })()}
                </div>
              ) : (
                <textarea
                  className="editor-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onSelect={(e) => {
                    const el = e.target;
                    if (el.selectionStart !== el.selectionEnd && el.value.slice(el.selectionStart, el.selectionEnd).trim()) {
                      setSelectionAnchor({
                        start: el.selectionStart,
                        end: el.selectionEnd,
                        text: el.value.slice(el.selectionStart, el.selectionEnd),
                      });
                    }
                  }}
                  placeholder="Write or edit content here. The project style guide will guide AI drafts."
                  rows={16}
                />
              )}
              <input
                className="editor-note-input"
                placeholder="Change note (e.g. revised intro, checked against NIV)"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
              <div className="refs-grid">
                <label className="ref-field">
                  <span>Footnotes (one per line)</span>
                  <textarea
                    rows={3}
                    placeholder={"e.g. Greek: monogenes, only-begotten."}
                    value={footnotesText}
                    onChange={(e) => setFootnotesText(e.target.value)}
                  />
                </label>
                <label className="ref-field">
                  <span>Cross-references (one per line)</span>
                  <textarea
                    rows={3}
                    placeholder={"e.g. John 1:14"}
                    value={crossRefsText}
                    onChange={(e) => setCrossRefsText(e.target.value)}
                  />
                </label>
              </div>
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
                      setFootnotesText((v.footnotes ?? []).map((n) => (typeof n === "string" ? n : n.text)).join("\n"));
                      setCrossRefsText((v.cross_refs ?? []).join("\n"));
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
                <GitCompare size={15} /> Version diff
              </h2>
              <button className="accent" onClick={openCompare} disabled={versions.length < 2}>
                Compare…
              </button>
            </div>
            {versions.length < 2 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Save another version to compare changes.
              </p>
            ) : diffOpen ? (
              <form className="diff-form" onSubmit={runDiff}>
                <div className="diff-pickers">
                  <label>
                    <span>From</span>
                    <select value={fromVersion} onChange={(e) => setFromVersion(e.target.value)}>
                      {[...versions].reverse().map((v) => (
                        <option key={v.id} value={v.version_number}>
                          v{v.version_number} · {v.change_note || "no note"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>To</span>
                    <select value={toVersion} onChange={(e) => setToVersion(e.target.value)}>
                      {[...versions].reverse().map((v) => (
                        <option key={v.id} value={v.version_number}>
                          v{v.version_number} · {v.change_note || "no note"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className="primary" disabled={diffLoading || !fromVersion || !toVersion}>
                  {diffLoading ? <Loader2 size={16} className="spinner" /> : <GitCompare size={16} />}
                  Show diff
                </button>
              </form>
            ) : null}
            {diff && (
              <div className="diff-view">
                <div className="diff-meta">
                  <span className="badge badge-neutral">
                    v{diff.from_version} → v{diff.to_version}
                  </span>
                  {diff.word_diff.length === 0 && (
                    <span className="badge badge-approved">No differences</span>
                  )}
                </div>
                {diff.word_diff.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>
                    The two versions are identical.
                  </p>
                ) : (
                  <div className="diff-body">
                    {diff.word_diff.map((s, i) => (
                      <span
                        key={i}
                        className={s.op === "insert" ? "diff-add" : s.op === "delete" ? "diff-del" : "diff-eq"}
                      >
                        {s.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="editor-panel" id="style-panel">
            <div className="panel-title">
              <h2>
                <Gauge size={15} /> Style check
              </h2>
              {styleResult && (
                <span className={`badge ${styleResult.score >= 90 ? "badge-approved" : styleResult.score >= 70 ? "badge-type" : "badge-rejected"}`}>
                  {styleResult.score}/100
                </span>
              )}
            </div>
            {!styleResult ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No check run yet. Use the "Style check" button in the editor.
              </p>
            ) : styleResult.issues.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No style issues found.
              </p>
            ) : (
              <div>
                <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                  {styleResult.demo
                    ? "Demo rules (add OPENAI_API_KEY for AI review)."
                    : "AI review against the project style guide."}
                </p>
                <div>
                  {styleResult.issues.map((issue, i) => (
                    <div key={i} className={`style-issue severity-${issue.severity}`}>
                      <div className="style-issue-head">
                        <span className="badge badge-type">{issue.severity}</span>
                        <span className="style-issue-snippet">“{issue.snippet}”</span>
                      </div>
                      <p className="style-issue-reason">{issue.reason}</p>
                    </div>
                  ))}
                </div>
                <button
                  className="link-button"
                  style={{ marginTop: "0.5rem" }}
                  onClick={() => setStyleMarksOn((s) => !s)}
                >
                  {styleMarksOn ? "Hide highlights" : "Highlight in text"}
                </button>
              </div>
            )}
          </div>

          <div className="editor-panel">
            <div className="panel-title">
              <h2>
                <History size={15} /> Status history
              </h2>
              <span className="badge badge-neutral">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No status changes yet. Move the item through the workflow to track it here.
              </p>
            ) : (
              <div>
                {[...history].reverse().map((h) => (
                  <div key={h.id} className="version-item">
                    <div className="version-meta">
                      <span className="version-no">
                        {STATUS_LABELS[h.from_status] ?? h.from_status}
                        <span className="muted"> → </span>
                        {STATUS_LABELS[h.to_status] ?? h.to_status}
                      </span>
                      <span className="version-date">{formatDate(h.created_at)}</span>
                    </div>
                    {h.note && <div className="version-note">{h.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="editor-panel comments-panel" id="comments-panel">
            <div className="panel-title">
              <h2>
                <MessageSquare size={15} /> Comments
              </h2>
              <span className="badge badge-neutral">{comments.length}</span>
            </div>
            {comments.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No comments yet. Select text in the editor or pick a verse to anchor feedback.
              </p>
            ) : (
              <div>
                {(() => {
                  const repliesByParent = {};
                  comments.forEach((c) => {
                    if (c.parent_id) (repliesByParent[c.parent_id] ||= []).push(c);
                  });
                  return comments
                    .filter((c) => !c.parent_id)
                    .map((c) => (
                      <div
                        key={c.id}
                        className={`comment-thread ${activeCommentId === c.id ? "thread-active" : ""}`}
                      >
                        <CommentCard
                          comment={c}
                          onResolve={() => toggleResolve(c)}
                          onReply={() => {
                            setReplyTo(replyTo === c.id ? null : c.id);
                            setReplyBody("");
                          }}
                          replyOpen={replyTo === c.id}
                          replyBody={replyBody}
                          setReplyBody={setReplyBody}
                          onSubmitReply={(e) => submitReply(e, c.id)}
                        />
                        {(repliesByParent[c.id] || []).map((r) => (
                          <CommentCard
                            key={r.id}
                            comment={r}
                            onResolve={() => toggleResolve(r)}
                          />
                        ))}
                      </div>
                    ));
                })()}
              </div>
            )}

            <div className="comment-composer">
              <div className="anchor-tabs">
                <button
                  className={`anchor-tab ${anchorMode === "none" ? "active" : ""}`}
                  onClick={() => setAnchorMode("none")}
                >
                  Whole item
                </button>
                <button
                  className={`anchor-tab ${anchorMode === "text" ? "active" : ""}`}
                  title="Select text in the editor first"
                  onClick={() => setAnchorMode(selectionAnchor ? "text" : "none")}
                >
                  Selected text{selectionAnchor ? "" : " (select in editor)"}
                </button>
                <button
                  className={`anchor-tab ${anchorMode === "verse" ? "active" : ""}`}
                  onClick={() => setAnchorMode("verse")}
                >
                  Verse
                </button>
              </div>
              {anchorMode === "text" && (
                <p className="anchor-preview">Anchored to “{selectionAnchor?.text}”</p>
              )}
              {anchorMode === "verse" && (
                <div className="anchor-row" style={{ marginTop: "0.5rem" }}>
                  <input
                    placeholder="Book"
                    value={vAnchor.book}
                    onChange={(e) => setVAnchor({ ...vAnchor, book: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Ch."
                    value={vAnchor.chapter}
                    onChange={(e) => setVAnchor({ ...vAnchor, chapter: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="V."
                    value={vAnchor.verse}
                    onChange={(e) => setVAnchor({ ...vAnchor, verse: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="End v."
                    value={vAnchor.endVerse}
                    onChange={(e) => setVAnchor({ ...vAnchor, endVerse: e.target.value })}
                  />
                </div>
              )}
              <form className="comment-box" onSubmit={addComment}>
                <input
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <button type="submit" disabled={!commentBody.trim() || commentLoading}>
                  {commentLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
