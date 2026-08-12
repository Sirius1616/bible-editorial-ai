from io import BytesIO

from docx import Document


def export_markdown(title: str, body: str) -> str:
    return f"# {title}\n\n{body}\n"


def export_docx(title: str, body: str) -> bytes:
    document = Document()
    document.add_heading(title, level=1)
    for paragraph in body.splitlines():
        if paragraph.strip():
            document.add_paragraph(paragraph)
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()
