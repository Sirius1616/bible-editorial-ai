import { Loader2, Send } from "lucide-react";
import CommentCard from "./CommentCard";

export default function CommentsPanel({ editor }) {
  const {
    comments,
    activeCommentId,
    toggleResolve,
    replyTo,
    setReplyTo,
    replyBody,
    setReplyBody,
    submitReply,
    commentBody,
    setCommentBody,
    commentLoading,
    addComment,
    selectionAnchor,
    anchorMode,
    setAnchorMode,
    vAnchor,
    setVAnchor,
  } = editor;

  return (
    <div className="comments-panel" id="comments-panel">
      {comments.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          No comments yet. Select text in the editor or pick a verse to anchor feedback.
        </p>
      ) : (
        <div>
          {(() => {
            const repliesByParent = {};
            comments.forEach((c) => {
              if (c.parent_id) (repliesByParent[c.parent_id] ||= []).push(c);
            });
            return comments
              .filter((c) => !c.parent_id)
              .map((c) => (
                <div
                  key={c.id}
                  className={`comment-thread ${activeCommentId === c.id ? "thread-active" : ""}`}
                >
                  <CommentCard
                    comment={c}
                    onResolve={() => toggleResolve(c)}
                    onReply={() => {
                      setReplyTo(replyTo === c.id ? null : c.id);
                      setReplyBody("");
                    }}
                    replyOpen={replyTo === c.id}
                    replyBody={replyBody}
                    setReplyBody={setReplyBody}
                    onSubmitReply={(e) => submitReply(e, c.id)}
                  />
                  {(repliesByParent[c.id] || []).map((r) => (
                    <CommentCard
                      key={r.id}
                      comment={r}
                      onResolve={() => toggleResolve(r)}
                    />
                  ))}
                </div>
              ));
          })()}
        </div>
      )}

      <div className="comment-composer">
        <div className="anchor-tabs">
          <button
            className={`anchor-tab ${anchorMode === "none" ? "active" : ""}`}
            onClick={() => setAnchorMode("none")}
          >
            Whole item
          </button>
          <button
            className={`anchor-tab ${anchorMode === "text" ? "active" : ""}`}
            title="Select text in the editor first"
            onClick={() => setAnchorMode(selectionAnchor ? "text" : "none")}
          >
            Selected text{selectionAnchor ? "" : " (select in editor)"}
          </button>
          <button
            className={`anchor-tab ${anchorMode === "verse" ? "active" : ""}`}
            onClick={() => setAnchorMode("verse")}
          >
            Verse
          </button>
        </div>
        {anchorMode === "text" && (
          <p className="anchor-preview">Anchored to “{selectionAnchor?.text}”</p>
        )}
        {anchorMode === "verse" && (
          <div className="anchor-row" style={{ marginTop: "0.5rem" }}>
            <input
              placeholder="Book"
              value={vAnchor.book}
              onChange={(e) => setVAnchor({ ...vAnchor, book: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="Ch."
              value={vAnchor.chapter}
              onChange={(e) => setVAnchor({ ...vAnchor, chapter: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="V."
              value={vAnchor.verse}
              onChange={(e) => setVAnchor({ ...vAnchor, verse: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="End v."
              value={vAnchor.endVerse}
              onChange={(e) => setVAnchor({ ...vAnchor, endVerse: e.target.value })}
            />
          </div>
        )}
        <form className="comment-box" onSubmit={addComment}>
          <input
            placeholder="Add a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <button type="submit" disabled={!commentBody.trim() || commentLoading}>
            {commentLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
