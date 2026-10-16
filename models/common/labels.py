"""Labels shared by data preparation and model packages."""

from __future__ import annotations

from enum import StrEnum


class Language(StrEnum):
    RU = "RU"
    KK = "KK"
    MIXED = "MIXED"


class ReviewLabel(StrEnum):
    TARGET_THREAT = "TARGET_THREAT"
    OTHER_THREAT = "OTHER_THREAT"
    NORMAL = "NORMAL"
    UNCERTAIN = "UNCERTAIN"
    AMBIGUOUS = "AMBIGUOUS"
    JOKE_OR_SARCASM = "JOKE_OR_SARCASM"
    QUOTED_THREAT = "QUOTED_THREAT"
    NEWS_REPORT = "NEWS_REPORT"
    COUNTER_SPEECH = "COUNTER_SPEECH"
    FICTIONAL_CONTENT = "FICTIONAL_CONTENT"


class ThreatSubtype(StrEnum):
    ETHNIC_HATE = "ETHNIC_HATE"
    RACIAL_HATE = "RACIAL_HATE"
    RELIGIOUS_HATE = "RELIGIOUS_HATE"
    GENDER_HATE = "GENDER_HATE"
    SEXUAL_ORIENTATION_HATE = "SEXUAL_ORIENTATION_HATE"
    DISABILITY_HATE = "DISABILITY_HATE"
    SOCIAL_CLASS_HATE = "SOCIAL_CLASS_HATE"
    DEHUMANIZATION = "DEHUMANIZATION"
    GROUP_EXCLUSION = "GROUP_EXCLUSION"
    GROUP_VIOLENCE_INCITEMENT = "GROUP_VIOLENCE_INCITEMENT"


POSITIVE_LABELS = frozenset({ReviewLabel.TARGET_THREAT.value})
NEGATIVE_LABELS = frozenset(
    {
        ReviewLabel.NORMAL.value,
        ReviewLabel.AMBIGUOUS.value,
        ReviewLabel.JOKE_OR_SARCASM.value,
        ReviewLabel.QUOTED_THREAT.value,
        ReviewLabel.NEWS_REPORT.value,
        ReviewLabel.COUNTER_SPEECH.value,
        ReviewLabel.FICTIONAL_CONTENT.value,
    }
)


def to_binary_label(value: str) -> int | None:
    """Map a manual label to binary truth; return None for excluded records.

    ``OTHER_THREAT`` is deliberately excluded because it may still contain hate
    directed at another subtype. ``UNCERTAIN`` is excluded because it has no
    reliable gold label.
    """

    normalized = value.strip().upper()
    if normalized in POSITIVE_LABELS or normalized in {"1", "TRUE", "HATE"}:
        return 1
    if normalized in NEGATIVE_LABELS or normalized in {"0", "FALSE", "NON_HATE"}:
        return 0
    return None
