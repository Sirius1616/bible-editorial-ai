import { Loader2, Wand2 } from "lucide-react";
import { AnimatedNumber, MotionItem, MotionList } from "../ui/motion";
import { canEdit } from "../../permissions";

export default function StylePanel({ editor }) {
  const {
    styleResult,
    styleMarksOn,
    setStyleMarksOn,
    applyStyleFix,
    styleFixing,
    project,
  } = editor;
  const editable = canEdit(project?.my_role);

  return (
    <div id="style-panel">
      {styleResult && (
        <div className="panel-actions">
          <span
            className={`badge ${styleResult.score >= 90 ? "badge-approved" : styleResult.score >= 70 ? "badge-type" : "badge-rejected"}`}
          >
            <AnimatedNumber value={styleResult.score} suffix="/100" />
          </span>
        </div>
      )}
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
              ? "Demo rules (add ANTHROPIC_API_KEY for AI review)."
              : "AI review against the project style guide."}
          </p>
          <MotionList>
            {styleResult.issues.map((issue, i) => (
              <MotionItem
                key={i}
                className={`style-issue severity-${issue.severity}`}
              >
                <div className="style-issue-head">
                  <span className="badge badge-type">{issue.severity}</span>
                  <span className="style-issue-snippet">“{issue.snippet}”</span>
                </div>
                <p className="style-issue-reason">{issue.reason}</p>
              </MotionItem>
            ))}
          </MotionList>
          <button
            className="link-button"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setStyleMarksOn((s) => !s)}
          >
            {styleMarksOn ? "Hide highlights" : "Highlight in text"}
          </button>
          {editable && (
            <button
              className="accent"
              style={{ marginTop: "0.6rem", marginLeft: "0.6rem" }}
              onClick={applyStyleFix}
              disabled={styleFixing}
              title="Rewrite the draft to comply with the style guide"
            >
              {styleFixing ? <Loader2 size={14} className="spinner" /> : <Wand2 size={14} />}
              {styleFixing ? "Applying…" : "Apply style fixes"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
