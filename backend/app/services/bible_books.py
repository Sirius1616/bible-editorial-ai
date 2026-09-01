"""Bible book references — canonical book list, chapter counts, and reference parsing.

Used by the cross-reference validation (#26) so broken references like "John 99:1"
or "Zzz 1:1" are surfaced deterministically without any LLM.
"""

from __future__ import annotations

import re

# Book name -> number of chapters (Protestant canon, 66 books).
BOOK_CHAPTERS: dict[str, int] = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36,
    "Deuteronomy": 34, "Joshua": 24, "Judges": 21, "Ruth": 4,
    "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25,
    "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13,
    "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
    "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52,
    "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14,
    "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7,
    "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2,
    "Zechariah": 14, "Malachi": 4, "Matthew": 28, "Mark": 16,
    "Luke": 24, "John": 21, "Acts": 28, "Romans": 16,
    "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6,
    "Ephesians": 6, "Philippians": 4, "Colossians": 4,
    "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
    "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13,
    "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5,
    "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22,
}

# Each book name arranged longest-first so "Song of Solomon" outranks "Song of".
_BOOK_NAMES = sorted(BOOK_CHAPTERS, key=len, reverse=True)

# "1 John 4:9", "Song of Solomon 2:1", "-14" style ranges.
_REF_RE = re.compile(
    r"^(?P<book>.+?)\s+(?P<chapter>\d+)\s*:\s*(?P<verse>\d+)(?:\s*-\s*(?P<end_verse>\d+))?$",
    re.IGNORECASE,
)


def parse_reference(ref: str) -> dict | None:
    """Parse a reference like 'John 3:16' or '1 John 4:9-10'.

    Returns a dict with book/chapter/verse/end_verse, or None if it cannot
    be matched against a known Bible book.
    """
    ref = ref.strip()
    match = _REF_RE.match(ref)
    if not match:
        return None
    book = _match_book(match.group("book"))
    if book is None:
        return None
    chapter = int(match.group("chapter"))
    verse = int(match.group("verse"))
    end_verse = int(match.group("end_verse")) if match.group("end_verse") else None
    return {
        "book": book,
        "chapter": chapter,
        "verse": verse,
        "end_verse": end_verse,
    }


def _match_book(fragment: str) -> str | None:
    fragment = re.sub(r"\s+", " ", fragment.strip())
    fragment_lower = fragment.lower()
    for name in _BOOK_NAMES:
        if name.lower() == fragment_lower:
            return name
    return None


def validate_reference(ref: str) -> dict:
    """Validate a cross-reference string.

    Returns a dict describing the outcome:
      {"reference", "valid", "reason", "book", "chapter", "verse", "end_verse"}
    """
    parsed = parse_reference(ref)
    if parsed is None:
        return {"reference": ref, "valid": False, "reason": "Reference does not match a Bible book (e.g. 'John 3:16')."}
    max_chapter = BOOK_CHAPTERS[parsed["book"]]
    if parsed["chapter"] < 1 or parsed["chapter"] > max_chapter:
        return {
            **parsed,
            "reference": ref,
            "valid": False,
            "reason": f"{parsed['book']} has only {max_chapter} chapters ({parsed['chapter']} given).",
        }
    if parsed["verse"] < 1:
        return {
            **parsed,
            "reference": ref,
            "valid": False,
            "reason": "Verse must be a positive number.",
        }
    if parsed["end_verse"] is not None and parsed["end_verse"] < parsed["verse"]:
        return {
            **parsed,
            "reference": ref,
            "valid": False,
            "reason": "End verse precedes start verse in the range.",
        }
    return {**parsed, "reference": ref, "valid": True, "reason": None}