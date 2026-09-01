import { useEffect, useMemo, useRef, useState } from "react";
import { itemsApi, projectsApi } from "../api";
import { anchorLabel } from "../lib/annotations";
import { ALLOWED_TRANSITIONS, STATUS_LABELS } from "../workflow";

export default function useEditor(projectId, itemId) {
  const [project, setProject] = useState(null);
  const [item, setItem] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [body, setBody] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [footnotesText, setFootnotesText] = useState("");
  const [crossRefsText, setCrossRefsText] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [anchor, setAnchor] = useState({
    book: "",
    startChapter: "",
    startVerse: "",
    endChapter: "",
    endVerse: "",
  });
  const [savingAnchor, setSavingAnchor] = useState(false);
  const [anchorSaved, setAnchorSaved] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("");
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [anchorMode, setAnchorMode] = useState("none");
  const [vAnchor, setVAnchor] = useState({ book: "", chapter: "", verse: "", endVerse: "" });
  const [annotationsOn, setAnnotationsOn] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [styleResult, setStyleResult] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleMarksOn, setStyleMarksOn] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [translations, setTranslations] = useState(null);
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [translationsError, setTranslationsError] = useState("");
  const [activeTab, setActiveTab] = useState("comments");
  const editorRef = useRef(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState([]);
  const savedTimer = useRef(null);

  function selectVersion(v) {
    setSelected(v);
    setBody(v.body);
    setFootnotesText((v.footnotes ?? []).map((n) => (typeof n === "string" ? n : n.text)).join("\n"));
    setCrossRefsText((v.cross_refs ?? []).join("\n"));
  }

  async function load() {
    setError("");
    try {
      const [p, item, v, c, h] = await Promise.all([
        projectsApi.get(projectId),
        itemsApi.get(projectId, itemId),
        itemsApi.versions(projectId, itemId),
        itemsApi.comments(projectId, itemId),
        itemsApi.history(projectId, itemId),
      ]);
      setProject(p);
      setItem(item);
      setVersions(v);
      setComments(c);
      setHistory(h);
      if (p.my_role === "admin" || p.my_role === "editor") {
        const ms = await projectsApi.members(projectId);
        setMembers(ms);
      }
      setNextStatus((ALLOWED_TRANSITIONS[item.status] ?? [])[0] ?? "");
      setAnchor({
        book: item.verse_start?.book ?? "",
        startChapter: item.verse_start?.chapter?.toString() ?? "",
        startVerse: item.verse_start?.verse?.toString() ?? "",
        endChapter: item.verse_end?.chapter?.toString() ?? "",
        endVerse: item.verse_end?.verse?.toString() ?? "",
      });
      setVAnchor({
        book: item.verse_start?.book ?? "",
        chapter: item.verse_start?.chapter?.toString() ?? "",
        verse: item.verse_start?.verse?.toString() ?? "",
        endVerse: item.verse_end?.verse?.toString() ?? "",
      });
      const latest = v[v.length - 1];
      if (latest) {
        selectVersion(latest);
      }
      if (v.length >= 2) {
        setFromVersion(String(v[v.length - 2].version_number));
        setToVersion(String(v[v.length - 1].version_number));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectId, itemId]);

  const hasTextAnchors = useMemo(
    () => comments.some((c) => c.anchor_type === "text" && !c.parent_id),
    [comments],
  );

  useEffect(() => {
    if (hasTextAnchors) setAnnotationsOn(true);
  }, [hasTextAnchors]);

  function flashSaved() {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  async function saveVersion(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const v = await itemsApi.addVersion(projectId, itemId, {
        body,
        change_note: changeNote || "Manual edit",
        footnotes: footnotesText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text, i) => ({ number: i + 1, text })),
        cross_refs: crossRefsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      await load();
      setChangeNote("");
      setSelected(v);
      flashSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveAnchor(e) {
    e.preventDefault();
    setSavingAnchor(true);
    setError("");
    setInfo("");
    try {
      const updated = await itemsApi.update(projectId, itemId, {
        verse_start:
          anchor.book && anchor.startChapter && anchor.startVerse
            ? { book: anchor.book, chapter: Number(anchor.startChapter), verse: Number(anchor.startVerse) }
            : null,
        verse_end:
          anchor.book && anchor.endChapter && anchor.endVerse
            ? { book: anchor.book, chapter: Number(anchor.endChapter), verse: Number(anchor.endVerse) }
            : null,
      });
      setItem((prev) => ({ ...prev, passage: updated.passage, verse_start: updated.verse_start, verse_end: updated.verse_end }));
      setAnchorSaved(true);
      setTimeout(() => setAnchorSaved(false), 2500);
      setInfo(`Verse anchor updated: ${updated.passage || "none"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAnchor(false);
    }
  }

  function openCompare() {
    if (versions.length < 2) return;
    const nums = versions.map((v) => v.version_number);
    setFromVersion(String(nums[nums.length - 2]));
    setToVersion(String(nums[nums.length - 1]));
    setDiffOpen(true);
    setDiff(null);
  }

  async function runDiff(e) {
    e?.preventDefault();
    if (!fromVersion || !toVersion) return;
    setDiffLoading(true);
    setError("");
    try {
      const result = await itemsApi.diffVersions(
        projectId,
        itemId,
        Number(fromVersion),
        Number(toVersion),
      );
      setDiff(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDiffLoading(false);
    }
  }

  async function generateDraft() {
    setDrafting(true);
    setError("");
    setInfo("");
    setBody("");
    let streamed = "";
    let streamFailed = false;
    await itemsApi.streamDraft(projectId, itemId, {
      onChunk: (text) => {
        streamed += text;
        setBody(streamed);
      },
      onDone: (data) => {
        setInfo(
          data.demo
            ? "AI draft streamed into the editor in demo mode (no ANTHROPIC_API_KEY set). Press 'Save new version' to keep it."
            : "AI draft streamed into the editor. Press 'Save new version' to keep it."
        );
      },
      onError: (err) => {
        streamFailed = true;
        setError(err.message);
      },
    });
    if (!streamed && !streamFailed) setError("Draft generation returned no text; please retry.");
    setDrafting(false);
  }

  async function checkStyle() {
    if (!body.trim()) return;
    setStyleLoading(true);
    setError("");
    try {
      const result = await itemsApi.styleCheck(projectId, itemId, body);
      setStyleResult(result);
      setStyleMarksOn(true);
      setActiveTab("style");
    } catch (err) {
      setError(err.message);
    } finally {
      setStyleLoading(false);
    }
  }

  async function checkQA() {
    if (!item?.verse_start) {
      setError("This item needs a verse anchor before it can be QA-checked.");
      setActiveTab("qa");
      return;
    }
    setQaLoading(true);
    setError("");
    try {
      const result = await itemsApi.qaCheck(projectId, itemId, body);
      setQaResult(result);
      setActiveTab("qa");
    } catch (err) {
      setError(err.message);
    } finally {
      setQaLoading(false);
    }
  }

  async function checkConsistency() {
    setConsistencyLoading(true);
    setError("");
    try {
      const result = await itemsApi.consistencyCheck(projectId, itemId, { body });
      setConsistencyResult(result);
      setActiveTab("consistency");
    } catch (err) {
      setError(err.message);
    } finally {
      setConsistencyLoading(false);
    }
  }

  async function toggleTranslations() {
    if (translationsOpen) {
      setTranslationsOpen(false);
      setTranslations(null);
      return;
    }
    setTranslationsOpen(true);
    setTranslationsError("");
    setTranslationsLoading(true);
    setActiveTab("translations");
    try {
      const result = await itemsApi.translations(projectId, itemId);
      setTranslations(result);
    } catch (err) {
      setTranslationsError(err.message);
    } finally {
      setTranslationsLoading(false);
    }
  }

  function insertQuote(entry) {
    const quote = `“${entry.text}” (${entry.name}, ${translations?.reference ?? ""})`;
    setBody((prev) => {
      const el = editorRef.current;
      const pos = el ? el.selectionStart : prev.length;
      if (pos == null) return prev ? `${prev}\n\n${quote}` : quote;
      const head = prev.slice(0, pos);
      const tail = prev.slice(pos);
      const sep = head && !head.endsWith("\n") ? "\n\n" : "";
      return head + sep + quote + (tail ? "\n\n" + tail : "");
    });
    setInfo(`Quote inserted from ${entry.name}.`);
  }

  async function transitionTo(e) {
    e?.preventDefault();
    if (!nextStatus) return;
    setTransitioning(true);
    setError("");
    setInfo("");
    try {
      const updated = await itemsApi.transition(projectId, itemId, nextStatus);
      setItem((prev) => ({ ...prev, status: updated.status }));
      setInfo(`Item moved to ${STATUS_LABELS[updated.status] ?? updated.status}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  }

  async function exportMarkdown() {
    setError("");
    try {
      const blob = await itemsApi.exportItem(projectId, itemId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item?.title.replace(/\s+/g, "_").toLowerCase() || "item"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setCommentLoading(true);
    setError("");
    try {
      const payload = { body: commentBody.trim() };
      if (anchorMode === "text" && selectionAnchor) {
        payload.anchor_type = "text";
        payload.anchor_start = String(selectionAnchor.start);
        payload.anchor_end = String(selectionAnchor.end);
        payload.anchor_text = selectionAnchor.text;
      } else if (anchorMode === "verse" && vAnchor.book && vAnchor.chapter && vAnchor.verse) {
        payload.anchor_type = "verse";
        payload.anchor_start = `${vAnchor.book} ${vAnchor.chapter}:${vAnchor.verse}`;
        if (vAnchor.endVerse) {
          payload.anchor_end = `${vAnchor.book} ${vAnchor.chapter}:${vAnchor.endVerse}`;
        }
        payload.anchor_text = anchorLabel(vAnchor);
      }
      await itemsApi.addComment(projectId, itemId, payload);
      setCommentBody("");
      setSelectionAnchor(null);
      setAnchorMode("none");
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function submitReply(e, parentId) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setCommentLoading(true);
    setError("");
    try {
      await itemsApi.addComment(projectId, itemId, { body: replyBody.trim(), parent_id: parentId });
      setReplyBody("");
      setReplyTo(null);
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function deleteVersion(version) {
    if (!window.confirm(`Delete version v${version.version_number}? This cannot be undone.`)) return;
    setError("");
    setInfo("");
    try {
      await itemsApi.deleteVersion(projectId, itemId, version.id);
      await load();
      setInfo(`Version v${version.version_number} deleted.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleResolve(comment) {
    setError("");
    try {
      await itemsApi.updateComment(projectId, itemId, comment.id, { resolved: !comment.resolved });
      setComments(await itemsApi.comments(projectId, itemId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignItem(assigneeId) {
    setError("");
    try {
      const updated = await itemsApi.update(projectId, itemId, { assignee_id: assigneeId });
      setItem(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    project,
    item,
    versions,
    comments,
    history,
    selected,
    body,
    changeNote,
    footnotesText,
    crossRefsText,
    nextStatus,
    transitioning,
    anchor,
    savingAnchor,
    anchorSaved,
    diffOpen,
    fromVersion,
    toVersion,
    diff,
    diffLoading,
    commentBody,
    selectionAnchor,
    anchorMode,
    vAnchor,
    annotationsOn,
    activeCommentId,
    replyTo,
    replyBody,
    commentLoading,
    styleResult,
    styleLoading,
    styleMarksOn,
    qaResult,
    qaLoading,
    consistencyResult,
    consistencyLoading,
    translationsOpen,
    translations,
    translationsLoading,
    translationsError,
    activeTab,
    error,
    info,
    loading,
    drafting,
    saving,
    saved,
    editorRef,
    load,
    saveVersion,
    saveAnchor,
    openCompare,
    runDiff,
    generateDraft,
    checkStyle,
    checkQA,
    checkConsistency,
    toggleTranslations,
    insertQuote,
    transitionTo,
    exportMarkdown,
    addComment,
    submitReply,
    toggleResolve,
    deleteVersion,
    selectVersion,
    assignItem,
    members,
    setBody,
    setChangeNote,
    setFootnotesText,
    setCrossRefsText,
    setNextStatus,
    setAnchor,
    setSelectionAnchor,
    setAnchorMode,
    setVAnchor,
    setAnnotationsOn,
    setActiveCommentId,
    setReplyTo,
    setReplyBody,
    setCommentBody,
    setFromVersion,
    setToVersion,
    setStyleMarksOn,
    setActiveTab,
  };
}
