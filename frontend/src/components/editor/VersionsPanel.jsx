import { Trash2 } from "lucide-react";
import { formatDate } from "../../lib/format";
import { canEdit } from "../../permissions";
import { MotionItem, MotionList } from "../ui/motion";

export default function VersionsPanel({ editor }) {
  const { project, versions, selected, selectVersion, deleteVersion } = editor;
  const editable = canEdit(project?.my_role);

  if (versions.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        No versions yet. Generate an AI draft to get started.
      </p>
    );
  }

  return (
    <div>
      <MotionList>
        {[...versions].reverse().map((v) => (
          <MotionItem
            key={v.id}
            className={`version-item ${selected?.id === v.id ? "active" : ""}`}
            onClick={() => selectVersion(v)}
          >
            <div className="version-meta">
              <span className="version-no">v{v.version_number}</span>
              <span className="version-date">{formatDate(v.created_at)}</span>
              {editable && (
                <button
                  className="icon-button version-delete"
                  title={`Delete version v${v.version_number}`}
                  aria-label={`Delete version v${v.version_number}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVersion(v);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="version-note">{v.change_note || "No note"}</div>
          </MotionItem>
        ))}
      </MotionList>
    </div>
  );
}
