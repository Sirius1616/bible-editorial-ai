import { formatDate } from "../../lib/format";
import { STATUS_LABELS } from "../../workflow";

export default function StatusHistoryPanel({ editor }) {
  const { history } = editor;

  if (history.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        No status changes yet. Move the item through the workflow to track it here.
      </p>
    );
  }

  return (
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
  );
}
