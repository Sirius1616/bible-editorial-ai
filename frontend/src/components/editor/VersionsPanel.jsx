import { History } from "lucide-react";
import { formatDate } from "../../lib/format";

export default function VersionsPanel({ editor }) {
  const { versions, selected, selectVersion } = editor;

  return (
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
              onClick={() => selectVersion(v)}
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
  );
}
