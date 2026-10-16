"""A small common interface implemented by every model."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from models.common.dataset import DatasetRecord


@dataclass(frozen=True, slots=True)
class Prediction:
    """One binary hate-speech prediction."""

    label: int
    probability: float


class HateSpeechModel(ABC):
    """Common binary-classification contract for model comparisons."""

    @abstractmethod
    def fit(self, records: Sequence[DatasetRecord]) -> None:
        """Train the model using manually reviewed records."""

    @abstractmethod
    def predict(self, texts: Sequence[str]) -> list[Prediction]:
        """Predict 0 (non-hate) or 1 (hate) for each text."""

    @abstractmethod
    def save(self, path: Path) -> None:
        """Save all inference artifacts under ``path``."""
