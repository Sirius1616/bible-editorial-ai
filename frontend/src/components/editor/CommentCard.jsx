import { Send } from "lucide-react";
import { formatDate } from "../../lib/format";

export default function CommentCard({
  comment,
  onResolve,
  onReply,
  replyOpen,
  replyBody,
  setReplyBody,
  onSubmitReply,
}) {
  const anchor =
    comment.anchor_type === "verse" && comment.anchor_start
      ? comment.anchor_start
      : comment.anchor_text
        ? `“${comment.anchor_text}”`
        : null;
  return (
    <div className={`comment-item ${comment.resolved ? "resolved" : ""}`}>
      <div className="comment-meta">
        <span className="comment-author">
          <span className="avatar" style={{ width: "24px", height: "24px", fontSize: "0.65rem" }}>
            {"E"}
          </span>
          Editor
        </span>
        <span>{formatDate(comment.created_at)}</span>
      </div>
      {anchor && <span className="badge badge-type comment-anchor">{anchor}</span>}
      <p className="comment-body">{comment.body}</p>
      {comment.resolved && <span className="badge badge-approved">Resolved</span>}
      {(onResolve || onReply) && (
        <div className="comment-actions">
          {onResolve && (
            <button className="link-button" onClick={onResolve}>
              {comment.resolved ? "Reopen" : "Resolve"}
            </button>
          )}
          {onReply && (
            <button className="link-button" onClick={onReply}>
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          )}
        </div>
      )}
      {replyOpen && (
        <form className="comment-box reply-box" onSubmit={onSubmitReply}>
          <input
            autoFocus
            placeholder="Reply…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <button type="submit" disabled={!replyBody.trim()}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
