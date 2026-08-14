import { BookOpen, Loader2, Quote } from "lucide-react";

export default function TranslationsPanel({ editor }) {
  const { translationsOpen, translations, translationsLoading, translationsError, insertQuote } =
    editor;

  return (
    <div id="translations-panel">
      {!translationsOpen ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Compare this passage across translations. Use the "Translations" button in the editor.
        </p>
      ) : translationsLoading ? (
        <div className="row" style={{ gap: "0.4rem" }}>
          <Loader2 size={16} className="spinner" /> Loading translations…
        </div>
      ) : translationsError ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>{translationsError}</p>
      ) : translations ? (
        <div>
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
            <span className="passage-ref">
              <BookOpen size={14} /> {translations.reference}
            </span>
          </p>
          {translations.demo && translations.note && (
            <div className="alert alert-info" style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem", marginBottom: "0.6rem" }}>
              {translations.note}
            </div>
          )}
          <div>
            {translations.translations.map((entry) => (
              <div key={entry.name} className={`translation-item ${entry.available ? "" : "unavailable"}`}>
                <div className="translation-head">
                  <span className="badge badge-type">{entry.name}</span>
                  {entry.demo && <span className="badge badge-neutral">demo</span>}
                </div>
                {entry.available && entry.text ? (
                  <div>
                    <p className="translation-text">{entry.text}</p>
                    <button className="link-button" onClick={() => insertQuote(entry)}>
                      <Quote size={14} /> Insert quote
                    </button>
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: "0.8rem" }}>
                    {entry.available ? "No text available." : "Requires BIBLE_API_KEY."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
