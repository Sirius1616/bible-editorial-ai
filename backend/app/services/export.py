from io import BytesIO

from docx import Document


def _render_footnotes(footnotes) -> str:
    if not footnotes:
        return ""
    lines = ["", "## Footnotes"]
    for i, note in enumerate(footnotes, start=1):
        if isinstance(note, dict):
            text = note.get("text", "")
        else:
            text = str(note)
        lines.append(f"[^{i}] {text}")
    return "\n".join(lines)


def _render_cross_refs(cross_refs) -> str:
    if not cross_refs:
        return ""
    lines = ["", "## Cross-references", ""]
    lines.append("See also: " + "; ".join(str(ref) for ref in cross_refs))
    return "\n".join(lines)


def export_markdown(
    title: str,
    body: str,
    passage: str | None = None,
    footnotes: list | None = None,
    cross_refs: list | None = None,
) -> str:
    parts = [f"# {title}"]
    if passage:
        parts.append(f"\n> Passage: {passage}")
    parts.append("")
    parts.append(body)
    parts.append(_render_footnotes(footnotes))
    parts.append(_render_cross_refs(cross_refs))
    return "\n".join(parts).strip() + "\n"


def _add_footnote_paragraphs(document: Document, footnotes) -> None:
    notes = footnotes or []
    if not notes:
        return
    document.add_heading("Footnotes", level=2)
    for i, note in enumerate(notes, start=1):
        text = note.get("text", "") if isinstance(note, dict) else str(note)
        document.add_paragraph(f"{i}. {text}")


def _add_cross_ref_paragraphs(document: Document, cross_refs) -> None:
    refs = cross_refs or []
    if not refs:
        return
    document.add_heading("Cross-references", level=2)
    document.add_paragraph("See also: " + "; ".join(str(ref) for ref in refs))


def export_docx(
    title: str,
    body: str,
    passage: str | None = None,
    footnotes: list | None = None,
    cross_refs: list | None = None,
) -> bytes:
    document = Document()
    document.add_heading(title, level=1)
    if passage:
        document.add_paragraph(f"Passage: {passage}")
    for paragraph in body.splitlines():
        if paragraph.strip():
            document.add_paragraph(paragraph)
    _add_footnote_paragraphs(document, footnotes)
    _add_cross_ref_paragraphs(document, cross_refs)
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()
