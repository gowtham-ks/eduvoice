"""Enhanced machine learning and text analysis for feedback."""
import re
from collections import Counter

# Basic keyword lists for topic detection
TOPICS = {
    "pace": ["fast", "slow", "rushed", "speed", "quick", "hurry", "gradual"],
    "clarity": ["clear", "confusing", "explain", "understand", "complicated", "simple"],
    "examples": ["example", "practical", "real-world", "application", "demonstration"],
    "engagement": ["boring", "interesting", "engaging", "interactive", "monotonous", "exciting"],
    "resources": ["notes", "slides", "material", "textbook", "reference", "resources"],
    "assessment": ["test", "exam", "assignment", "grade", "marks", "evaluation"],
    "availability": ["available", "approachable", "accessible", "office hours", "help"],
}

TOXIC_PATTERNS = [
    r"\b(stupid|idiot|useless|worst|terrible|awful|horrible)\b",
    r"\b(hate|hated|suck|garbage|trash)\b",
]

PII_PATTERNS = [
    r"\b[A-Z]{2}\d{2}[A-Z]{3}\d{4}\b",  # Register numbers like CS22ABC1234
    r"\b\d{10}\b",  # Phone numbers
    r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b",  # Email addresses
]


def analyze(text: str) -> dict:
    """Analyze text for sentiment, toxicity, and identifying information."""
    if not text or len(text.strip()) < 3:
        return {"sentiment": "neutral", "flags": []}

    lower = text.lower()
    flags = []

    # Check for toxic language
    for pattern in TOXIC_PATTERNS:
        if re.search(pattern, lower):
            flags.append("toxic")
            break

    # Check for PII
    for pattern in PII_PATTERNS:
        if re.search(pattern, text):
            flags.append("identifying_info")
            break

    # Simple sentiment analysis
    positive_words = ["good", "great", "excellent", "helpful", "clear", "best", "amazing", "love"]
    negative_words = ["bad", "poor", "unclear", "confusing", "difficult", "worst", "hate"]

    pos_count = sum(1 for word in positive_words if word in lower)
    neg_count = sum(1 for word in negative_words if word in lower)

    if pos_count > neg_count + 1:
        sentiment = "positive"
    elif neg_count > pos_count + 1:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {"sentiment": sentiment, "flags": list(set(flags))}


def topic_counts(texts: list[str]) -> dict[str, int]:
    """Extract topic mentions from a collection of feedback texts."""
    if not texts:
        return {}

    all_text = " ".join(texts).lower()
    counts = {}

    for topic, keywords in TOPICS.items():
        count = sum(all_text.count(keyword) for keyword in keywords)
        if count > 0:
            counts[topic] = count

    # Return top topics only
    return dict(Counter(counts).most_common(5))
