import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import {
  CommentsPanel,
  ContentEditor,
  DiffPanel,
  EditorHeader,
  StatusHistoryPanel,
  StylePanel,
  TranslationsPanel,
  VerseAnchor,
  VersionsPanel,
} from "../components/editor";
import useEditor from "../hooks/useEditor";

export default function Editor() {
  const { projectId, itemId } = useParams();
  const editor = useEditor(projectId, itemId);
  const { item, error, info, loading } = editor;

  if (loading) {
    return (
      <AppLayout>
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading item…</span>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">
              <FileText size={26} />
            </span>
            <h3>Item not found</h3>
            <Link to={`/projects/${projectId}`} className="link-button">
              <ArrowLeft size={16} /> Back to project
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <EditorHeader editor={editor} />
      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <VerseAnchor editor={editor} />

      <div className="editor-grid">
        <div>
          <ContentEditor editor={editor} />
        </div>

        <div className="side-panel">
          <VersionsPanel editor={editor} />
          <DiffPanel editor={editor} />
          <TranslationsPanel editor={editor} />
          <StylePanel editor={editor} />
          <StatusHistoryPanel editor={editor} />
          <CommentsPanel editor={editor} />
        </div>
      </div>
    </AppLayout>
  );
}
