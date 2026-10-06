"""
Comment analysis: sentiment, toxicity and identifying-information detection.

Default is a small lexicon so the project runs anywhere. Set USE_HF_MODELS=true
(and install transformers + torch) to use pretrained Hugging Face models instead.
Replace/extend this with your own trained model for the ML part of the project.
"""
import re

from .config import settings

POSITIVE = {"good", "great", "excellent", "clear", "clearly", "helpful", "amazing", "best", "love",
            "engaging", "patient", "knowledgeable", "supportive", "understand", "easy", "well"}
NEGATIVE = {"bad", "boring", "confusing", "unclear", "fast", "slow", "poor", "worst", "difficult",
            "late", "rude", "unprepared", "rushed", "hard", "ignored", "waste", "skip"}
TOXIC = {"stupid", "idiot", "useless", "hate", "dumb", "trash", "pathetic", "moron", "shut"}

PII_PATTERNS = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),                 # email
    re.compile(r"(?<!\d)(?:\+?91[- ]?)?[6-9]\d{9}(?!\d)"),   # Indian mobile
    re.compile(r"\b\d{6}[A-Za-z]{3}\d{3}\b"),                 # register-number style
    re.compile(r"\b(?:roll|reg(?:ister)?)\s*(?:no|number)?\s*[:#]?\s*\w{4,}\b", re.I),
]

_hf: dict = {}


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _lexicon_sentiment(text: str) -> str:
    w = _words(text)
    pos = sum(x in POSITIVE for x in w)
    neg = sum(x in NEGATIVE for x in w)
    if pos and neg:
        return "mixed"
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _hf_sentiment(text: str) -> str:
    try:
        from transformers import pipeline
        if "sent" not in _hf:
            _hf["sent"] = pipeline("sentiment-analysis")
        r = _hf["sent"](text[:512])[0]
        return "positive" if r["label"].upper().startswith("POS") else "negative"
    except Exception:
        return _lexicon_sentiment(text)


def _hf_toxic(text: str) -> bool:
    try:
        from transformers import pipeline
        if "tox" not in _hf:
            _hf["tox"] = pipeline("text-classification", model="unitary/toxic-bert")
        r = _hf["tox"](text[:512])[0]
        return r["label"].lower() == "toxic" and r["score"] > 0.7
    except Exception:
        return any(x in TOXIC for x in _words(text))


def analyze(text: str) -> dict:
    """Returns {"sentiment": str, "flags": list[str]}. Any flag hides the comment for review."""
    text = (text or "").strip()
    if not text:
        return {"sentiment": "neutral", "flags": []}
    flags = []
    toxic = _hf_toxic(text) if settings.use_hf_models else any(x in TOXIC for x in _words(text))
    if toxic:
        flags.append("toxic")
    if any(p.search(text) for p in PII_PATTERNS):
        flags.append("identifying_info")
    sentiment = _hf_sentiment(text) if settings.use_hf_models else _lexicon_sentiment(text)
    return {"sentiment": sentiment, "flags": flags}


TOPIC_KEYWORDS = {
    "Teaching clarity": {"clear", "clearly", "unclear", "confusing", "explain", "explains", "explanation", "understand"},
    "Teaching pace": {"fast", "slow", "pace", "rushed", "speed", "quickly", "slowly"},
    "Practical examples": {"example", "examples", "practical", "demo", "lab", "real", "project", "hands"},
    "Doubt clarification": {"doubt", "doubts", "question", "questions", "ask", "answer", "answers"},
    "Assignments": {"assignment", "assignments", "homework", "quiz", "test", "exam"},
}


def topic_counts(texts: list[str]) -> dict[str, int]:
    """Simple keyword topic detector (replace with BERTopic / LDA / a classifier for the ML phase)."""
    counts = {t: 0 for t in TOPIC_KEYWORDS}
    for text in texts:
        words = set(_words(text))
        for topic, keys in TOPIC_KEYWORDS.items():
            if words & keys:
                counts[topic] += 1
    return {t: c for t, c in counts.items() if c}
