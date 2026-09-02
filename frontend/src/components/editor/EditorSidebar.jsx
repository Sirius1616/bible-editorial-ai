import {
  BookOpenCheck,
  Gauge,
  GitCompare,
  History,
  Layers,
  Link2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import CommentsPanel from "./CommentsPanel";
import ConsistencyPanel from "./ConsistencyPanel";
import DiffPanel from "./DiffPanel";
import QAPanel from "./QAPanel";
import StatusHistoryPanel from "./StatusHistoryPanel";
import StylePanel from "./StylePanel";
import TranslationsPanel from "./TranslationsPanel";
import VersionsPanel from "./VersionsPanel";

const PANELS = {
  versions: VersionsPanel,
  diff: DiffPanel,
  translations: TranslationsPanel,
  style: StylePanel,
  qa: QAPanel,
  consistency: ConsistencyPanel,
  history: StatusHistoryPanel,
  comments: CommentsPanel,
};

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
    { id: "qa", label: "QA", icon: ShieldCheck },
    { id: "consistency", label: "References", icon: Link2 },
    { id: "history", label: "History", icon: History, badge: history.length },
    { id: "comments", label: "Comments", icon: MessageSquare, badge: comments.length },
  ];
  const ActivePanel = PANELS[activeTab];

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
            {activeTab === tab.id && (
              <motion.span className="tab-pill" layoutId="tab-pill" />
            )}
            <tab.icon size={14} />
            {tab.label}
            {tab.badge != null && <span className="tab-count">{tab.badge}</span>}
          </button>
        ))}
      </div>
      <div className="sidebar-content">
        <motion.div
          key={activeTab}
          className="sidebar-tab-pane"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {ActivePanel && <ActivePanel editor={editor} />}
        </motion.div>
      </div>
    </div>
  );
}
