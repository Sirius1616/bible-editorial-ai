import { BookOpen, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../lib/format";
import { ALLOWED_TRANSITIONS, STATUS_LABELS } from "../../workflow";
import StatusBadge from "../ui/StatusBadge";

export default function EditorHeader({ editor }) {
  const {
    projectId,
    project,
    item,
    versions,
    nextStatus,
    setNextStatus,
    transitioning,
    transitionTo,
    exportMarkdown,
  } = editor;
  const typeLabel = (item.content_type || "study_note").replace("_", " ");

  return (
    <>
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
          <p className="sub meta-line" style={{ marginTop: "0.35rem" }}>
            <span className="passage-ref">
              <BookOpen size={15} /> {item.passage || "No passage reference"}
            </span>
            <span className="sep">·</span>
            <span className="muted">
              v{versions.length} · updated {formatDate(item.updated_at)}
            </span>
            {item.due_date && (
              <>
                <span className="sep">·</span>
                <span className="muted">Due {formatDate(item.due_date)}</span>
              </>
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
    </>
  );
}
