import {
  BookOpenCheck,
  Gauge,
  GitCompare,
  History,
  Layers,
  MessageSquare,
} from "lucide-react";
import CommentsPanel from "./CommentsPanel";
import DiffPanel from "./DiffPanel";
import StatusHistoryPanel from "./StatusHistoryPanel";
import StylePanel from "./StylePanel";
import TranslationsPanel from "./TranslationsPanel";
import VersionsPanel from "./VersionsPanel";

export default function EditorSidebar({ editor }) {
  const { activeTab, setActiveTab, versions, translations, history, comments } = editor;

  const tabs = [
    { id: "versions", label: "Versions", icon: Layers, badge: versions.length },
    { id: "diff", label: "Diff", icon: GitCompare },
    {
      id: "translations",
      label: "Translations",
      icon: BookOpenCheck,
      badge: translations?.translations?.length,
    },
    { id: "style", label: "Style", icon: Gauge },
    { id: "history", label: "History", icon: History, badge: history.length },
    { id: "comments", label: "Comments", icon: MessageSquare, badge: comments.length },
  ];

  return (
    <div className="editor-panel sidebar-card">
      <div className="sidebar-tabs" role="tablist" aria-label="Item details">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.badge != null && <span className="tab-count">{tab.badge}</span>}
          </button>
        ))}
      </div>
      <div className="sidebar-content">
        {activeTab === "versions" && <VersionsPanel editor={editor} />}
        {activeTab === "diff" && <DiffPanel editor={editor} />}
        {activeTab === "translations" && <TranslationsPanel editor={editor} />}
        {activeTab === "style" && <StylePanel editor={editor} />}
        {activeTab === "history" && <StatusHistoryPanel editor={editor} />}
        {activeTab === "comments" && <CommentsPanel editor={editor} />}
      </div>
    </div>
  );
}
