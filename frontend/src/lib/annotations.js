export function anchorLabel(v) {
  if (!v.book || !v.chapter || !v.verse) return null;
  let label = `${v.book} ${v.chapter}:${v.verse}`;
  if (v.endVerse) label += `-${v.endVerse}`;
  return label;
}

export function buildAnnotatedParts(body, comments) {
  const anchors = comments
    .filter(
      (c) =>
        c.anchor_type === "text" &&
        !c.parent_id &&
        c.anchor_start != null &&
        c.anchor_end != null,
    )
    .map((c) => ({
      id: c.id,
      start: parseInt(c.anchor_start, 10),
      end: parseInt(c.anchor_end, 10),
    }))
    .filter((a) => Number.isFinite(a.start) && Number.isFinite(a.end) && a.end > a.start);
  if (!anchors.length) return null;
  anchors.sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  for (const a of anchors) {
    const s = Math.min(Math.max(a.start, cursor), body.length);
    const e = Math.min(Math.max(a.end, s), body.length);
    if (s > cursor) parts.push({ key: `p${cursor}`, text: body.slice(cursor, s) });
    if (e > s) parts.push({ key: `c${a.id}`, commentId: a.id, text: body.slice(s, e) });
    cursor = e;
  }
  if (cursor < body.length) parts.push({ key: `p${cursor}`, text: body.slice(cursor) });
  return parts;
}

export function buildStyleParts(body, issues) {
  const spans = issues
    .map((issue) => {
      const start = body.indexOf(issue.snippet);
      return { start, end: start + issue.snippet.length, severity: issue.severity };
    })
    .filter((s) => s.start !== -1);
  if (!spans.length) return null;
  spans.sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  for (const s of spans) {
    const start = Math.min(Math.max(s.start, cursor), body.length);
    const end = Math.min(Math.max(s.end, start), body.length);
    if (start > cursor) parts.push({ key: `p${cursor}`, text: body.slice(cursor, start) });
    if (end > start) parts.push({ key: `s${start}`, text: body.slice(start, end), severity: s.severity });
    cursor = end;
  }
  if (cursor < body.length) parts.push({ key: `p${cursor}`, text: body.slice(cursor) });
  return parts;
}
