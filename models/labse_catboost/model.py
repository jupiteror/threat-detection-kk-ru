"""Sentence embeddings from LaBSE classified by CatBoost."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence

from models.common.base import HateSpeechModel, Prediction
from models.common.dataset import DatasetRecord


class LabseCatBoostModel(HateSpeechModel):
    DEFAULT_EMBEDDING_MODEL = "sentence-transformers/LaBSE"

    def __init__(
        self,
        *,
        embedding_model_name: str = DEFAULT_EMBEDDING_MODEL,
        classifier: object | None = None,
    ) -> None:
        self.embedding_model_name = embedding_model_name
        self._classifier = classifier
        self._embedder: object | None = None

    def _get_embedder(self) -> object:
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer

            self._embedder = SentenceTransformer(self.embedding_model_name)
        return self._embedder

    def _encode(self, texts: Sequence[str]) -> object:
        return self._get_embedder().encode(
            list(texts),
            batch_size=32,
            show_progress_bar=True,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )

    def fit(self, records: Sequence[DatasetRecord]) -> None:
        if len({record.label for record in records}) < 2:
            raise ValueError("Training data must contain both HATE and NON_HATE")
        from catboost import CatBoostClassifier

        embeddings = self._encode([record.text for record in records])
        self._classifier = CatBoostClassifier(
            iterations=600,
            depth=7,
            learning_rate=0.05,
            loss_function="Logloss",
            eval_metric="F1",
            auto_class_weights="Balanced",
            random_seed=42,
            verbose=50,
        )
        self._classifier.fit(embeddings, [record.label for record in records])

    def predict(self, texts: Sequence[str]) -> list[Prediction]:
        if self._classifier is None:
            raise RuntimeError("Model is not trained or loaded")
        probabilities = self._classifier.predict_proba(self._encode(texts))[:, 1]
        return [
            Prediction(label=int(probability >= 0.5), probability=float(probability))
            for probability in probabilities
        ]

    def save(self, path: Path) -> None:
        if self._classifier is None:
            raise RuntimeError("Model is not trained or loaded")
        path.mkdir(parents=True, exist_ok=True)
        self._classifier.save_model(str(path / "classifier.cbm"))
        (path / "config.json").write_text(
            json.dumps(
                {"embedding_model_name": self.embedding_model_name},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path: str | Path) -> "LabseCatBoostModel":
        from catboost import CatBoostClassifier

        directory = Path(path)
        config = json.loads((directory / "config.json").read_text(encoding="utf-8"))
        classifier = CatBoostClassifier()
        classifier.load_model(str(directory / "classifier.cbm"))
        return cls(
            embedding_model_name=str(config["embedding_model_name"]),
            classifier=classifier,
        )
