import difflib
import re

_WORD_RE = re.compile(r"\S+|\s+")


def _tokenize_words(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall(text) if t.strip()]


def _tokenize_lines(text: str) -> list[str]:
    return text.splitlines()


def _segments(from_tokens: list[str], to_tokens: list[str]) -> list[dict]:
    segments: list[dict] = []
    matcher = difflib.SequenceMatcher(a=from_tokens, b=to_tokens, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            segments.append({"op": "equal", "text": " ".join(to_tokens[j1:j2])})
        elif tag == "delete":
            segments.append({"op": "delete", "text": " ".join(from_tokens[i1:i2])})
        elif tag == "insert":
            segments.append({"op": "insert", "text": " ".join(to_tokens[j1:j2])})
        elif tag == "replace":
            segments.append({"op": "delete", "text": " ".join(from_tokens[i1:i2])})
            segments.append({"op": "insert", "text": " ".join(to_tokens[j1:j2])})
    return [s for s in segments if s["text"]]


def diff_bodies(from_body: str, to_body: str) -> dict:
    return {
        "word_diff": _segments(_tokenize_words(from_body), _tokenize_words(to_body)),
        "line_diff": _segments(_tokenize_lines(from_body), _tokenize_lines(to_body)),
    }
