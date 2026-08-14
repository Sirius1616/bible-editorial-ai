import { BookOpen, Loader2, Save } from "lucide-react";

export default function VerseAnchor({ editor }) {
  const { anchor, setAnchor, savingAnchor, anchorSaved, saveAnchor } = editor;

  return (
    <form className="card anchor-edit" onSubmit={saveAnchor}>
      <div className="panel-title">
        <h2>
          <BookOpen size={15} /> Verse anchor
        </h2>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Anchors this item to an exact book/chapter/verse range.
        </span>
      </div>
      <div className="anchor-row">
        <input
          placeholder="Book (e.g. John)"
          value={anchor.book}
          onChange={(e) => setAnchor({ ...anchor, book: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="Start ch."
          value={anchor.startChapter}
          onChange={(e) => setAnchor({ ...anchor, startChapter: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="Start v."
          value={anchor.startVerse}
          onChange={(e) => setAnchor({ ...anchor, startVerse: e.target.value })}
        />
        <span className="muted">→</span>
        <input
          type="number"
          min="1"
          placeholder="End ch."
          value={anchor.endChapter}
          onChange={(e) => setAnchor({ ...anchor, endChapter: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="End v."
          value={anchor.endVerse}
          onChange={(e) => setAnchor({ ...anchor, endVerse: e.target.value })}
        />
        <div className="row" style={{ gap: "0.5rem" }}>
          {anchorSaved && <span className="badge badge-approved">Saved</span>}
          <button type="submit" className="primary" disabled={savingAnchor}>
            {savingAnchor ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            Save anchor
          </button>
        </div>
      </div>
    </form>
  );
}
