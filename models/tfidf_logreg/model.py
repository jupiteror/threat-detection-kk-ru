"""Fast, interpretable baseline for multilingual hate-speech classification."""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

from models.common.base import HateSpeechModel, Prediction
from models.common.dataset import DatasetRecord


class TfidfLogisticRegressionModel(HateSpeechModel):
    def __init__(self, pipeline: object | None = None) -> None:
        self._pipeline = pipeline

    @staticmethod
    def _build_pipeline() -> object:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import FeatureUnion, Pipeline

        features = FeatureUnion(
            [
                (
                    "characters",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(3, 5),
                        min_df=2,
                        max_features=120_000,
                        sublinear_tf=True,
                    ),
                ),
                (
                    "words",
                    TfidfVectorizer(
                        analyzer="word",
                        ngram_range=(1, 2),
                        min_df=2,
                        max_features=80_000,
                        sublinear_tf=True,
                    ),
                ),
            ]
        )
        return Pipeline(
            [
                ("features", features),
                (
                    "classifier",
                    LogisticRegression(
                        class_weight="balanced",
                        max_iter=1_000,
                        random_state=42,
                    ),
                ),
            ]
        )

    def fit(self, records: Sequence[DatasetRecord]) -> None:
        if len({record.label for record in records}) < 2:
            raise ValueError("Training data must contain both HATE and NON_HATE")
        self._pipeline = self._build_pipeline()
        self._pipeline.fit(
            [record.text for record in records], [record.label for record in records]
        )

    def predict(self, texts: Sequence[str]) -> list[Prediction]:
        if self._pipeline is None:
            raise RuntimeError("Model is not trained or loaded")
        probabilities = self._pipeline.predict_proba(list(texts))[:, 1]
        return [
            Prediction(label=int(probability >= 0.5), probability=float(probability))
            for probability in probabilities
        ]

    def save(self, path: Path) -> None:
        if self._pipeline is None:
            raise RuntimeError("Model is not trained or loaded")
        import joblib

        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self._pipeline, path / "model.joblib")

    @classmethod
    def load(cls, path: str | Path) -> "TfidfLogisticRegressionModel":
        import joblib

        model_path = Path(path) / "model.joblib"
        if not model_path.is_file():
            raise FileNotFoundError(model_path)
        return cls(pipeline=joblib.load(model_path))
