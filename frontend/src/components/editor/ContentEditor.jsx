import {
  BookOpenCheck,
  Gauge,
  Loader2,
  MessageSquare,
  Save,
  Sparkles,
} from "lucide-react";
import { buildAnnotatedParts, buildStyleParts } from "../../lib/annotations";

export default function ContentEditor({ editor }) {
  const {
    editorRef,
    body,
    setBody,
    setSelectionAnchor,
    changeNote,
    setChangeNote,
    footnotesText,
    setFootnotesText,
    crossRefsText,
    setCrossRefsText,
    annotationsOn,
    setAnnotationsOn,
    styleMarksOn,
    styleResult,
    styleLoading,
    checkStyle,
    translationsOpen,
    toggleTranslations,
    drafting,
    generateDraft,
    saving,
    saved,
    saveVersion,
    comments,
    activeCommentId,
    setActiveCommentId,
    setActiveTab,
  } = editor;

  return (
    <div className="editor-panel">
      <div className="panel-title">
        <h2>
          <Sparkles size={15} /> Content editor
        </h2>
        <div className="row" style={{ gap: "0.4rem" }}>
          <button
            className={annotationsOn ? "accent" : undefined}
            onClick={() => setAnnotationsOn((s) => !s)}
            title="Toggle inline comment markers"
          >
            <MessageSquare size={14} />
            {annotationsOn ? "Editing" : "Annotate"}
          </button>
          <button
            className={styleMarksOn ? "accent" : undefined}
            onClick={checkStyle}
            disabled={styleLoading || !body.trim()}
            title="Check this draft against the project style guide"
          >
            {styleLoading ? <Loader2 size={14} className="spinner" /> : <Gauge size={14} />}
            {styleLoading ? "Checking…" : "Style check"}
          </button>
          <button
            className={translationsOpen ? "accent" : undefined}
            onClick={toggleTranslations}
            title="Compare this passage across translations"
          >
            <BookOpenCheck size={14} />
            {translationsOpen ? "Hide translations" : "Translations"}
          </button>
          <button className="accent" onClick={generateDraft} disabled={drafting}>
            {drafting ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
            {drafting ? "Generating…" : "Generate AI draft"}
          </button>
        </div>
      </div>

      <form onSubmit={saveVersion}>
        {styleMarksOn ? (
          <div
            className="annotations-view"
            onClick={() => {
              setActiveTab("style");
              if (styleResult?.issues.length) {
                document
                  .querySelector("#style-panel")
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
          >
            {(() => {
              const parts = buildStyleParts(body, styleResult?.issues ?? []);
              if (!parts) return body || "No style issues to highlight.";
              return parts.map((p) =>
                p.severity ? (
                  <mark key={p.key} className={`style-mark severity-${p.severity}`}>
                    {p.text}
                  </mark>
                ) : (
                  <span key={p.key}>{p.text}</span>
                ),
              );
            })()}
          </div>
        ) : annotationsOn ? (
          <div
            className="annotations-view"
            onClick={(e) => {
              const mark = e.target.closest("[data-comment-id]");
              if (mark) {
                setActiveCommentId(Number(mark.dataset.commentId));
                setActiveTab("comments");
                document
                  .querySelector("#comments-panel")
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
          >
            {(() => {
              const parts = buildAnnotatedParts(body, comments);
              if (!parts) return body || "No content to annotate.";
              return parts.map((p) =>
                p.commentId != null ? (
                  <mark
                    key={p.key}
                    className={`inline-mark ${activeCommentId === p.commentId ? "active" : ""}`}
                    data-comment-id={p.commentId}
                  >
                    {p.text}
                  </mark>
                ) : (
                  <span key={p.key}>{p.text}</span>
                ),
              );
            })()}
          </div>
        ) : (
          <textarea
            className="editor-textarea"
            ref={editorRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onSelect={(e) => {
              const el = e.target;
              if (el.selectionStart !== el.selectionEnd && el.value.slice(el.selectionStart, el.selectionEnd).trim()) {
                setSelectionAnchor({
                  start: el.selectionStart,
                  end: el.selectionEnd,
                  text: el.value.slice(el.selectionStart, el.selectionEnd),
                });
              }
            }}
            placeholder="Write or edit content here. The project style guide will guide AI drafts."
            rows={16}
          />
        )}
        <input
          className="editor-note-input"
          placeholder="Change note (e.g. revised intro, checked against NIV)"
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
        />
        <div className="refs-grid">
          <label className="ref-field">
            <span>Footnotes (one per line)</span>
            <textarea
              rows={3}
              placeholder={"e.g. Greek: monogenes, only-begotten."}
              value={footnotesText}
              onChange={(e) => setFootnotesText(e.target.value)}
            />
          </label>
          <label className="ref-field">
            <span>Cross-references (one per line)</span>
            <textarea
              rows={3}
              placeholder={"e.g. John 1:14"}
              value={crossRefsText}
              onChange={(e) => setCrossRefsText(e.target.value)}
            />
          </label>
        </div>
        <div className="editor-actions">
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {body.length} characters
          </span>
          <div className="row">
            {saved && <span className="badge badge-approved">Saved</span>}
            <button type="submit" className="primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              Save new version
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
