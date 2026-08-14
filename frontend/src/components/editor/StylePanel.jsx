import { Gauge } from "lucide-react";

export default function StylePanel({ editor }) {
  const { styleResult, styleMarksOn, setStyleMarksOn } = editor;

  return (
    <div className="editor-panel">
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
  );
}
