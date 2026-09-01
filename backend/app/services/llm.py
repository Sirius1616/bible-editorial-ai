from app.core.config import settings
import asyncio
import re
import httpx
import json
from collections.abc import AsyncIterator

from app.services.bible_books import validate_reference
from app.services.translation import DEMO_DATASET, dataset_key, fetch_passage, passage_reference

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-haiku-4-5"

MAX_TOKENS_JSON = 1200


def _parse_json_object(text: str) -> dict:
    """Parse a JSON object out of a model response that may include fences or prose."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return json.loads(text)

CONTENT_TYPE_GUIDANCE: dict[str, str] = {
  "study_note": "write for a study session, with academic or instructional tone you'll explain with meaning explanation and theology embeded with ~200 words",
  "devotional": "this should be for everyday life, with a tone that is warm and not too acedemically inclined with ~300 words"
}

STYLE_RULES: list[tuple[str, str, int, str]] = [
    (
        r"\bI(?:'m|'ll|'ve)?\b|\bme\b|\bmy\b|\bmine\b",
        "Avoid first-person voice; keep the tone objective and centered on the text.",
        15,
        "high",
    ),
    (
        r"\b(very|really|extremely|quite|totally|absolutely)\b",
        "Weak intensifier — prefer a precise word instead of 'very/really/quite'.",
        8,
        "medium",
    ),
    (
        r"\bin order to\b",
        "Wordy — 'in order to' can usually be trimmed to 'to'.",
        4,
        "low",
    ),
    (
        r"\bdue to the fact that\b",
        "Wordy — replace with 'because'.",
        4,
        "low",
    ),
    (
        r"\b(TODO|lorem|PLACEHOLDER|insert text here)\b",
        "Placeholder text left in the draft.",
        15,
        "high",
    ),
]


def _find_snippet(body: str, pattern: str) -> str | None:
    match = re.search(pattern, body, flags=re.IGNORECASE)
    if match is None:
        return None
    start = max(0, match.start() - 15)
    end = min(len(body), match.end() + 25)
    return body[start:end].strip()

def build_draft_prompt(
        passage: str, title: str, content_type: str, style_guide: str, translation: str
) -> str:
    guidance = CONTENT_TYPE_GUIDANCE.get(content_type, "Write clearly and concisely.")
    return f"""You are a bible publisher or a publishing house.

Do not fabricate content but let it be around the {passage}.
No heading. Follow the style guide instructions.

Write a {content_type} with a title: {title} around {passage}.
Follow this style: {guidance}
Use this translation: {translation}
Style guide: {style_guide}
"""

def build_mock_draft(
    passage: str, title: str, content_type: str, style_guide: str
) -> str:
    """Return a placeholder draft when no API key is set."""
    return f"This is a demo draft for {title} about {passage}. No API key set."


def build_mock_style_issues(body: str, style_guide: str) -> dict:
    """Return rule-based style check when no API key is set."""
    issues = []
    for pattern, reason, weight, severity in STYLE_RULES:
        snippet = _find_snippet(body, pattern)
        if snippet:
            issues.append(
                {"snippet": snippet, "reason": reason, "severity": severity}
            )
    if "!" in body and style_guide and "exclam" not in style_guide.lower():
        idx = body.find("!")
        issues.append(
            {
                "snippet": body[max(0, idx - 30) : min(len(body), idx + 1)].strip(),
                "reason": "Exclamation point in editorial prose; keep the tone measured.",
                "severity": "medium",
            }
        )
    score = max(0, 100 - sum(weight for pattern, _, weight, _ in STYLE_RULES if _find_snippet(body, pattern)))
    if "!" in body and style_guide and "exclam" not in style_guide.lower():
        score = max(0, score - 8)
    return {"score": score, "issues": issues}


async def generate_draft(
    passage: str, title: str, content_type: str, style_guide: str = "", translation: str = ""
) -> tuple[str, bool]:
    """Generate an editorial draft.

    Returns (text, is_demo). If is_demo is True, the text is a placeholder.
    """
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_draft(passage, title, content_type, style_guide), True

    prompt = build_draft_prompt(passage, title, content_type, style_guide, translation)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url = ANTHROPIC_URL,
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"API error: {e.response.status_code} : {e.response.text}")
            return "Draft generation failed due to API error", True
        except httpx.RequestError as e:
            print(f"Network error: {e}")
            return "Draft generation failed due to Network error", True
        try:
            data = response.json()
            text = data["content"][0]["text"]
        except (KeyError, IndexError, json.JSONDecodeError):
            return "Draft generation failed due to unexpected response", True
    return text, False


def _chunk_words(text: str, size: int = 6) -> list[str]:
    words = text.split()
    return [" ".join(words[i : i + size]) for i in range(0, len(words), size)]


async def stream_draft(
    passage: str, title: str, content_type: str, style_guide: str = "", translation: str = ""
) -> AsyncIterator[str]:
    """Stream an editorial draft token-by-token.

    Uses the Anthropic streaming API when a key is set; otherwise yields a
    placeholder draft in small chunks so the demo feels gradual too.
    """
    if not settings.ANTHROPIC_API_KEY:
        text = build_mock_draft(passage, title, content_type, style_guide)
        for chunk in _chunk_words(text):
            await asyncio.sleep(0.01)
            yield chunk
        return

    prompt = build_draft_prompt(passage, title, content_type, style_guide, translation)
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 1200,
                "stream": True,
                "messages": [{"role": "user", "content": prompt}],
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                payload = line[len("data:") :].strip()
                if payload == "[DONE]":
                    break
                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "content_block_delta":
                    chunk = (event.get("delta") or {}).get("text")
                    if chunk:
                        yield chunk
                elif event.get("type") == "error":
                    print(f"Stream error event: {event}")
                    break


def build_style_check_prompt(body: str, style_guide: str) -> str:
    return f"""You are an editorial style checker for a Bible publishing house.
    
    Review the following manuscript against these style rules:
    {style_guide}

    Manuscript:
    {body}

    check for violations and return ONLY a JSON object with this exact format:
    {{"score": 0-100, "issues": [{{"snippet": "the offending text", "reason": "why it violates",
    "severity": "high|medium|low"}}]}}

    Score 100 means perfect. Deduct for each violation. Return ONLY the JSON, nothing else"""


async def check_style_guide(
    body: str, style_guide: str = ""
) -> tuple[dict, bool]:
    """Check a manuscript against the style guide.

    Returns (result_dict, is_demo). result_dict has keys "score" and "issues".
    """
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_style_issues(body, style_guide), True
    prompt = build_style_check_prompt(body=body, style_guide=style_guide)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url = ANTHROPIC_URL,
                headers = {
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json = {
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": MAX_TOKENS_JSON,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            result = _parse_json_object(text)
        except httpx.HTTPStatusError as e:
            print(f"API error: {e.response.status_code}, {e.response.text}")
            return {"score": 0, "issues": ["API error"]}, True
        except httpx.RequestError as e:
            print(f"Network Error: {e}")
            return {"score": 0, "issues": ["Request error"]}, True
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            print(f"Style check: unparseable LLM response: {exc}")
            return (
                {
                    "score": 0,
                    "issues": [
                        {
                            "snippet": "",
                            "reason": "Style check could not be completed due to an LLM error; please retry.",
                            "severity": "medium",
                        }
                    ],
                },
                True,
            )
    return result, False


# ---------------------------------------------------------------------------
# Scripture QA (verse-quote verification, #25)
# ---------------------------------------------------------------------------

_QUOTE_RE = re.compile(r'“([^”]+)”|"([^"]+)"')

# Sacred terms (canonical form, variant key) used by the demo terminology scan.
SACRED_TERMS: list[tuple[str, str]] = [
    ("god", "God"),
    ("christ", "Christ"),
    ("lord", "Lord"),
    ("jesus", "Jesus"),
    ("holy spirit", "Holy Spirit"),
    ("trinity", "Trinity"),
]


def _extract_quotes(body: str) -> list[str]:
    return [m.group(1) or m.group(2) for m in _QUOTE_RE.finditer(body)]


def _normalize_text(text: str) -> str:
    text = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def _order_match_ratio(quote_words: list[str], ref_words: list[str]) -> float:
    if not quote_words:
        return 1.0
    qi = 0
    for w in ref_words:
        if qi < len(quote_words) and w == quote_words[qi]:
            qi += 1
    return qi / len(quote_words)


def _qa_score(issues: list[dict]) -> int:
    return max(0, 100 - sum(15 if i["severity"] == "high" else 8 for i in issues))


def build_qa_prompt(body: str, reference: str, reference_text: str, translation: str) -> str:
    return f"""You are a proofreader for a Bible publishing house.

The {translation} text of {reference} is:
{reference_text}

Verify every scripture quote in the manuscript below against that text. Flag wording,
wording-order, and attribution mismatches. Do not flag the surrounding commentary.

Manuscript:
{body}

Return ONLY a JSON object:
{{"issues": [{{"snippet": "the quoted text", "reference": "{reference}",
"expected": "what the reference says", "actual": "what the manuscript quotes",
"reason": "why it mismatches the reference", "severity": "high|medium"}}]}}
Leave issues empty if every quote matches."""


def build_mock_qa_issues(body: str, reference_text: str | None, reference: str) -> list[dict]:
    if not reference_text:
        return []
    ref_words = _normalize_text(reference_text).split()
    issues = []
    for quote in _extract_quotes(body):
        words = _normalize_text(quote).split()
        if len(words) < 4:
            continue
        ratio = _order_match_ratio(words, ref_words)
        if ratio < 0.85:
            issues.append(
                {
                    "snippet": quote[:130],
                    "reference": reference,
                    "expected": reference_text[:200],
                    "actual": quote[:200],
                    "reason": f"Quoted text differs from {reference} ({int(ratio * 100)}% word match).",
                    "severity": "high" if ratio < 0.5 else "medium",
                }
            )
    return issues


async def _live_qa_result(
    body: str, reference: str, reference_text: str, translation: str
) -> list[dict]:
    prompt = build_qa_prompt(body, reference, reference_text or "", translation)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url=ANTHROPIC_URL,
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": MAX_TOKENS_JSON,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            return _parse_json_object(text).get("issues", [])
        except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError, json.JSONDecodeError) as exc:
            print(f"QA: LLM result unavailable ({exc}); falling back to bundled text")
            return [
                {
                    "snippet": "",
                    "reference": reference,
                    "expected": "",
                    "actual": "",
                    "reason": "QA check could not be completed due to an LLM error; please retry.",
                    "severity": "medium",
                }
            ]


def _pick_translation_text(fetched: dict, translation: str) -> str:
    for entry in fetched.get("translations", []):
        if entry.get("name") == translation and entry.get("text"):
            return entry["text"]
    for entry in fetched.get("translations", []):
        if entry.get("available") and entry.get("text"):
            return entry["text"]
    return ""


async def run_scripture_qa(
    body: str,
    book: str,
    chapter: int,
    start_verse: int,
    end_verse: int | None,
    translation: str = "",
) -> tuple[dict, bool]:
    """Verify scripture quotes in a manuscript against the anchored passage.

    Returns (result_dict, is_demo). result_dict has keys "reference", "score",
    and "issues".
    """
    reference = passage_reference(book, chapter, start_verse, end_verse)

    if not settings.ANTHROPIC_API_KEY:
        bundled = DEMO_DATASET.get(dataset_key(book, chapter, start_verse, end_verse))
        reference_text = bundled[0] if bundled else None
        issues = build_mock_qa_issues(body, reference_text, reference)
        return (
            {"reference": reference, "score": _qa_score(issues), "issues": issues},
            True,
        )

    fetched, _ = await fetch_passage(book, chapter, start_verse, end_verse)
    reference_text = _pick_translation_text(fetched, translation or "ESV")
    issues = await _live_qa_result(body, reference, reference_text, translation or "ESV")
    return (
        {"reference": reference, "score": _qa_score(issues), "issues": issues},
        False,
    )


# ---------------------------------------------------------------------------
# Cross-reference & terminology consistency (#26)
# ---------------------------------------------------------------------------


def validate_cross_refs(cross_refs: list[str] | None) -> list[dict]:
    """Deterministically validate a list of cross-reference strings."""
    issues = []
    for ref in cross_refs or []:
        if not ref or not ref.strip():
            continue
        result = validate_reference(ref)
        if not result["valid"]:
            issues.append(
                {"reference": ref, "reason": result["reason"], "severity": "high"}
            )
    return issues


def build_consistency_prompt(
    body: str, cross_refs: list[str] | None, translation: str, project_bodies: list[str] | None
) -> str:
    refs = ", ".join(ref for ref in (cross_refs or []) if ref) or "(none)"
    other = "\n".join(f"--\n{b[:500]}" for b in (project_bodies or [])) or "(no other items)"
    return f"""You are an editorial consistency checker for a Bible publishing house.

The item body below is a {translation or "Bible"} editorial item that may include scripture quotes.
Check for terminology drift: the same term/name rendered inconsistently (spelling, capitalization,
or word order) within this item and across the other project items below.

Item body:
{body or "(empty)"}

Other items in the same project:
{other}

Cross-references: {refs}

Return ONLY a JSON object:
{{"term_issues": [{{"term": "the canonical form", "count": <int>, "variants": ["all observed forms"],
"reason": "how they diverge", "severity": "high|medium|low"}}]}}
Leave term_issues empty if nothing is inconsistent. Do not include cross-reference validation here."""


def _scan_variants(text: str, term: str, canon: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
    return sorted({m.group(0) for m in pattern.finditer(text)})


def build_mock_consistency(
    body: str, cross_refs: list[str] | None, project_bodies: list[str] | None
) -> list[dict]:
    joined = "\n".join([body or ""] + [b or "" for b in (project_bodies or [])])
    term_issues = []
    for term, canon in SACRED_TERMS:
        variants = _scan_variants(joined, term, canon)
        canon_count = len(re.findall(rf"\b{re.escape(canon)}\b", joined))
        if len(variants) > 1 and canon_count > 0:
            term_issues.append(
                {
                    "term": canon,
                    "count": len(variants),
                    "variants": variants,
                    "reason": f"{canon} is used with inconsistent forms ({', '.join(variants)}).",
                    "severity": "medium",
                }
            )
    return term_issues


def _consistency_score(ref_issues: list[dict], term_issues: list[dict]) -> int:
    return max(0, 100 - sum(15 for _ in ref_issues) - sum(10 for _ in term_issues))


async def _live_consistency_terms(
    body: str, cross_refs: list[str] | None, translation: str, project_bodies: list[str] | None
) -> list[dict]:
    prompt = build_consistency_prompt(body, cross_refs, translation, project_bodies)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url=ANTHROPIC_URL,
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": MAX_TOKENS_JSON,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            return _parse_json_object(text).get("term_issues", [])
        except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError, json.JSONDecodeError) as exc:
            print(f"Consistency: LLM result unavailable ({exc})")
            return []


async def run_consistency_check(
    body: str,
    cross_refs: list[str] | None,
    translation: str = "",
    project_bodies: list[str] | None = None,
) -> tuple[dict, bool]:
    """Check cross-references and terminology consistency.

    Returns (result_dict, is_demo). result_dict has keys "score",
    "references_checked", "ref_issues", and "term_issues".
    """
    ref_issues = validate_cross_refs(cross_refs)
    checked = len([ref for ref in (cross_refs or []) if ref and ref.strip()])

    if not settings.ANTHROPIC_API_KEY:
        term_issues = build_mock_consistency(body, cross_refs, project_bodies)
        return (
            {
                "score": _consistency_score(ref_issues, term_issues),
                "references_checked": checked,
                "ref_issues": ref_issues,
                "term_issues": term_issues,
            },
            True,
        )

    try:
        term_issues = await _live_consistency_terms(body, cross_refs, translation, project_bodies)
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        print(f"Consistency API error: {exc}")
        term_issues = []
    return (
        {
            "score": _consistency_score(ref_issues, term_issues),
            "references_checked": checked,
            "ref_issues": ref_issues,
            "term_issues": term_issues,
        },
        False,
    )

