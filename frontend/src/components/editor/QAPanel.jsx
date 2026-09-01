import { BookOpen, Loader2 } from "lucide-react";

export default function QAPanel({ editor }) {
  const { qaResult, qaLoading, checkQA, item } = editor;

  if (qaLoading) {
    return (
      <div>
        <div className="row" style={{ gap: "0.4rem" }}>
          <Loader2 size={16} className="spinner" /> Running Scripture QA…
        </div>
      </div>
    );
  }

  if (!qaResult) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        {item?.verse_start
          ? "Verify quoted scripture against the anchored passage. Use the \"QA check\" button in the editor."
          : "This item has no verse anchor — set one above to enable Scripture QA."}
      </p>
    );
  }

  return (
    <div id="qa-panel">
      <div className="panel-actions">
        <span className="passage-ref">
          <BookOpen size={14} /> {qaResult.reference}
        </span>
        <span
          className={`badge ${qaResult.score >= 90 ? "badge-approved" : qaResult.score >= 70 ? "badge-type" : "badge-rejected"}`}
        >
          {qaResult.score}/100
        </span>
      </div>

      {qaResult.demo && (
        <div
          className="alert alert-info"
          style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem", margin: "0.4rem 0 0.6rem" }}
        >
          Demo rules (add ANTHROPIC_API_KEY + BIBLE_API_KEY for live verse verification).
        </div>
      )}

      {qaResult.issues.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          No quote mismatches found against {qaResult.reference}.
        </p>
      ) : (
        <div>
          <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
            {qaResult.issues.length} quote mismatch{qaResult.issues.length > 1 ? "es" : ""} found:
          </p>
          <div style={{ maxHeight: "18rem", overflowY: "auto", paddingRight: "0.25rem" }}>
            {qaResult.issues.map((issue, i) => (
              <div key={i} className={`style-issue severity-${issue.severity}`}>
                <div className="style-issue-head">
                  <span className="badge badge-type">{issue.severity}</span>
                  <span className="style-issue-snippet">“{issue.snippet}”</span>
                </div>
                <p className="style-issue-reason">{issue.reason}</p>
                <details style={{ marginTop: "0.35rem" }}>
                  <summary className="link-button" style={{ fontSize: "0.8rem" }}>
                    Expected vs quoted
                  </summary>
                  <div style={{ fontSize: "0.8rem", marginTop: "0.3rem", display: "grid", gap: "0.3rem" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Expected ({issue.reference}): </span>
                      <span className="muted">{issue.expected}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Quoted: </span>
                      <span className="muted">{issue.actual}</span>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="link-button" style={{ marginTop: "0.5rem" }} onClick={checkQA}>
        Re-run QA
      </button>
    </div>
  );
}