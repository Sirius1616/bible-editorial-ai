import { STATUS_BADGE, STATUS_LABELS } from "../../workflow";

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] ?? "badge-neutral"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
