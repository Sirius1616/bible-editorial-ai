import { GitCompare, Loader2 } from "lucide-react";

export default function DiffPanel({ editor }) {
  const {
    versions,
    diffOpen,
    openCompare,
    fromVersion,
    setFromVersion,
    toVersion,
    setToVersion,
    diffLoading,
    runDiff,
    diff,
  } = editor;

  return (
    <div>
      <div className="panel-actions">
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
  );
}
