import { History } from "lucide-react";
import { formatDate } from "../../lib/format";
import { STATUS_LABELS } from "../../workflow";

export default function StatusHistoryPanel({ editor }) {
  const { history } = editor;

  return (
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
  );
}
