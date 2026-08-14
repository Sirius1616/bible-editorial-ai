import httpx

from app.core.config import settings

BIBLE_API_URL = "https://api.scripture.api.bible/v1"
GETBIBLE_URL = "https://query.getbible.net/v2"

TRANSLATION_IDS = {
    "ESV": "eng-ESV",
    "NIV": "eng-NIV",
    "KJV": "eng-KJV",
    "NASB": "eng-NASB",
    "NLT": "eng-NLT",
}

# Public-domain (KJV) and freely licensed (WEB) verse text for the seeded
# demo passages, so the translation sidebar works fully offline in demo mode.
DEMO_DATASET: dict[str, tuple[str, str]] = {
    "john 3:16-17": (
        "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him "
        "should not perish, but have everlasting life. For God sent not his Son into the world to condemn "
        "the world; but that the world through him might be saved.",
        "For God so loved the world, that he gave his one and only Son, that whoever believes in him "
        "should not perish, but have eternal life. For God didn't send his Son into the world to judge "
        "the world, but that the world should be saved through him.",
    ),
    "james 2:14-26": (
        "What doth it profit, my brethren, though a man say he hath faith, and have not works? can faith "
        "save him? If a brother or sister be naked, and destitute of daily food, And one of you say unto "
        "them, Depart in peace, be ye warmed and filled; notwithstanding ye give them not those things "
        "which are needful to the body; what doth it profit? Even so faith, if it hath not works, is dead, "
        "being alone. Yea, a man may say, Thou hast faith, and I have works: shew me thy faith without thy "
        "works, and I will shew thee my faith by my works. Thou believest that there is one God; thou doest "
        "well: the devils also believe, and tremble. But wilt thou know, O vain man, that faith without "
        "works is dead? Was not Abraham our father justified by works, when he had offered Isaac his son "
        "upon the altar? Seest thou how faith wrought with his works, and by works was faith made perfect? "
        "And the scripture was fulfilled which saith, Abraham believed God, and it was imputed unto him for "
        "righteousness: and he was called the Friend of God. Ye see then how that by works a man is "
        "justified, and not by faith only. Likewise also was not Rahab the harlot justified by works, when "
        "she had received the messengers, and had sent them out another way? For as the body without the "
        "spirit is dead, so faith without works is dead also.",
        "What good is it, my brothers, if a man says he has faith, but has no works? Can faith save him? "
        "And if a brother or sister is naked and in lack of daily food, and one of you tells them, \"Go in "
        "peace, be warmed and filled\"; and yet you didn't give them the things the body needs, what good "
        "is it? Even so faith, if it has no works, is dead in itself. Yes, a man will say, \"You have "
        "faith, and I have works.\" Show me your faith without works, and I by my works will show you my "
        "faith. You believe that God is one. You do well. The demons also believe, and shudder. But do you "
        "want to know, vain man, that faith apart from works is dead? Wasn't Abraham our father justified "
        "by works, in that he offered up Isaac his son on the altar? You see that faith worked with his "
        "works, and by works faith was perfected; and the Scripture was fulfilled which says, \"Abraham "
        "believed God, and it was accounted to him as righteousness\"; and he was called the friend of God. "
        "You see then that by works, a man is justified, and not only by faith. In the same way, wasn't "
        "Rahab the prostitute also justified by works, in that she received the messengers, and sent them "
        "out another way? For as the body apart from the spirit is dead, even so faith apart from works is "
        "dead.",
    ),
    "psalm 30:5": (
        "For his anger endureth but a moment; in his favour is life: weeping may endure for a night, but "
        "joy cometh in the morning.",
        "For his anger is but for a moment. His favor is for a lifetime. Weeping may stay for the night, "
        "but joy comes in the morning.",
    ),
    "ephesians 2:8-10": (
        "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of "
        "works, lest any man should boast. For we are his workmanship, created in Christ Jesus unto good "
        "works, which God hath before ordained that we should walk in them.",
        "for by grace you have been saved through faith, and that not of yourselves; it is the gift of "
        "God, not of works, that no one would boast. For we are his workmanship, created in Christ Jesus "
        "for good works, which God prepared before that we would walk in them.",
    ),
    "psalm 23:1-6": (
        "The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth "
        "me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for "
        "his name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no "
        "evil: for thou art with me; thy rod and thy staff they comfort me. Thou preparest a table before "
        "me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely "
        "goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the "
        "Lord for ever.",
        "Yahweh is my shepherd: I shall lack nothing. He makes me lie down in green pastures. He leads me "
        "beside still waters. He restores my soul. He guides me in the paths of righteousness for his "
        "name's sake. Even though I walk through the valley of the shadow of death, I will fear no evil, "
        "for you are with me. Your rod and your staff, they comfort me. You prepare a table before me in "
        "the presence of my enemies. You anoint my head with oil. My cup runs over. Surely goodness and "
        "loving kindness shall follow me all the days of my life, and I will dwell in Yahweh's house "
        "forever.",
    ),
    "john 8:12": (
        "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall "
        "not walk in darkness, but shall have the light of life.",
        "Again, therefore, Jesus spoke to them, saying, \"I am the light of the world. He who follows me "
        "will not walk in the darkness, but will have the light of life.\"",
    ),
}


def passage_reference(book: str, chapter: int, start_verse: int, end_verse: int | None = None) -> str:
    reference = f"{book} {chapter}:{start_verse}"
    if end_verse and end_verse != start_verse:
        reference += f"-{end_verse}"
    return reference


def dataset_key(book: str, chapter: int, start_verse: int, end_verse: int | None = None) -> str:
    key = f"{book.strip().lower()} {chapter}:{start_verse}"
    if end_verse and end_verse != start_verse:
        key += f"-{end_verse}"
    return key


def demo_comparison(reference: str, kjv: str, web: str) -> dict:
    entries = [
        {"name": "KJV", "text": kjv, "available": True, "demo": True},
        {"name": "WEB", "text": web, "available": True, "demo": True},
    ]
    for name in settings.bible_translations:
        if name in {"KJV", "WEB"}:
            continue
        entries.append({"name": name, "text": None, "available": False, "demo": True})
    return {
        "reference": reference,
        "translations": entries,
        "demo": True,
        "note": (
            "Demo data — KJV and WEB are public domain. "
            "Set BIBLE_API_KEY (api.bible) to load ESV, NIV, NASB, and NLT."
        ),
    }


def _text_from_getbible(data: dict) -> str:
    verses: list[tuple[int, str]] = []
    for block in data.values():
        for verse in block.get("verses", []):
            verses.append((int(verse["verse"]), verse["text"].strip()))
    verses.sort()
    return " ".join(text for _, text in verses)


async def _fetch_apibible(client: httpx.AsyncClient, translation: str, reference: str) -> str:
    bible_id = TRANSLATION_IDS[translation]
    response = await client.get(
        f"{BIBLE_API_URL}/bibles/{bible_id}/passages/{reference}",
        params={"content-type": "text"},
    )
    response.raise_for_status()
    data = response.json()
    return data.get("data", {}).get("content", "").strip()


async def _fetch_getbible(client: httpx.AsyncClient, module: str, reference: str) -> str:
    response = await client.get(f"{GETBIBLE_URL}/{module}/{reference}")
    response.raise_for_status()
    return _text_from_getbible(response.json())


async def fetch_passage(
    book: str, chapter: int, start_verse: int, end_verse: int | None = None
) -> tuple[dict, bool]:
    reference = passage_reference(book, chapter, start_verse, end_verse)

    if settings.BIBLE_API_KEY:
        entries = []
        async with httpx.AsyncClient(
            timeout=60, headers={"api-key": settings.BIBLE_API_KEY}
        ) as client:
            for name in settings.bible_translations:
                if name not in TRANSLATION_IDS:
                    continue
                try:
                    text = await _fetch_apibible(client, name, reference)
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code == 404:
                        entries.append(
                            {"name": name, "text": None, "available": False, "demo": False}
                        )
                        continue
                    if exc.response.status_code == 401:
                        raise RuntimeError(
                            "api.bible rejected the API key (401). Check BIBLE_API_KEY."
                        ) from exc
                    raise RuntimeError(
                        f"api.bible returned an error ({exc.response.status_code}). Try again later."
                    ) from exc
                except httpx.RequestError as exc:
                    raise RuntimeError(
                        "Could not reach api.bible. Check your network connection."
                    ) from exc
                entries.append({"name": name, "text": text, "available": True, "demo": False})
        return {"reference": reference, "translations": entries, "demo": False, "note": None}, False

    bundled = DEMO_DATASET.get(dataset_key(book, chapter, start_verse, end_verse))
    if bundled:
        return demo_comparison(reference, bundled[0], bundled[1]), True

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            kjv = await _fetch_getbible(client, "kjv", reference)
            web = await _fetch_getbible(client, "web", reference)
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"getBible returned an error ({exc.response.status_code}). Try again later."
            ) from exc
        except httpx.RequestError as exc:
            raise RuntimeError(
                "Could not reach getBible for the demo passage lookup. Check your network connection."
            ) from exc
    return demo_comparison(reference, kjv, web), True
