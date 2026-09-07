import { Link2, Loader2, ScanSearch } from "lucide-react";
import { AnimatedNumber, MotionItem, MotionList } from "../ui/motion";

export default function ConsistencyPanel({ editor }) {
  const { consistencyResult, consistencyLoading, checkConsistency, crossRefsText } = editor;

  if (consistencyLoading) {
    return (
      <div>
        <div className="row" style={{ gap: "0.4rem" }}>
          <Loader2 size={16} className="spinner" /> Checking references &amp; terminology…
        </div>
      </div>
    );
  }

  if (!consistencyResult) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Validate cross-references and detect terminology drift. Use the "References" button in the
        editor.
      </p>
    );
  }

  const { score, references_checked, ref_issues, term_issues, demo } = consistencyResult;
  const hasRefs = (ref_issues ?? []).length > 0;
  const hasTerms = (term_issues ?? []).length > 0;

  return (
    <div id="consistency-panel">
      <div className="panel-actions">
        <span
          className={`badge ${score >= 90 ? "badge-approved" : score >= 70 ? "badge-type" : "badge-rejected"}`}
        >
          <AnimatedNumber value={score} suffix="/100" />
        </span>
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          {references_checked} reference(s) checked
        </span>
      </div>

      {demo && (
        <div
          className="alert alert-info"
          style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem", margin: "0.4rem 0 0.6rem" }}
        >
          Demo mode — reference validation is rule-based; add ANTHROPIC_API_KEY for AI terminology
          review.
        </div>
      )}

      {!hasRefs && !hasTerms ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Cross-references resolve and no terminology drift detected.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {hasRefs && (
            <div>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                <Link2 size={12} /> Broken cross-references
              </p>
              <MotionList>
                {ref_issues.map((issue, i) => (
                  <MotionItem
                    key={`ref-${i}`}
                    className={`style-issue severity-${issue.severity}`}
                  >
                    <div className="style-issue-head">
                      <span className="badge badge-rejected">{issue.severity}</span>
                      <span className="style-issue-snippet">{issue.reference}</span>
                    </div>
                    <p className="style-issue-reason">{issue.reason}</p>
                  </MotionItem>
                ))}
              </MotionList>
            </div>
          )}
          {hasTerms && (
            <div>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                <ScanSearch size={12} /> Terminology drift
              </p>
              <MotionList>
                {term_issues.map((issue, i) => (
                  <MotionItem
                    key={`term-${i}`}
                    className={`style-issue severity-${issue.severity}`}
                  >
                    <div className="style-issue-head">
                      <span className="badge badge-type">{issue.severity}</span>
                      <span className="style-issue-snippet">{issue.term}</span>
                    </div>
                    <p className="style-issue-reason">{issue.reason}</p>
                    <p className="muted" style={{ fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
                      Observed forms: {issue.variants.join(", ")}
                    </p>
                  </MotionItem>
                ))}
              </MotionList>
            </div>
          )}
        </div>
      )}
      <button className="link-button" style={{ marginTop: "0.6rem" }} onClick={checkConsistency}>
        Re-check
      </button>
      {crossRefsText && (
        <p className="muted" style={{ fontSize: "0.72rem", marginTop: "0.4rem" }}>
          Cross-references come from the field in the editor below.
        </p>
      )}
    </div>
  );
}