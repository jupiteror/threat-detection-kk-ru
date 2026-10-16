"""Evaluation reports shared by all three experiments."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence

from models.common.base import Prediction
from models.common.dataset import DatasetRecord


def binary_report(
    records: Sequence[DatasetRecord], predictions: Sequence[Prediction]
) -> dict[str, object]:
    if len(records) != len(predictions):
        raise ValueError("Record and prediction counts differ")
    from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

    truth = [record.label for record in records]
    labels = [prediction.label for prediction in predictions]
    probabilities = [prediction.probability for prediction in predictions]
    report: dict[str, object] = classification_report(
        truth,
        labels,
        labels=[0, 1],
        target_names=["NON_HATE", "HATE"],
        output_dict=True,
        zero_division=0,
    )
    report["confusion_matrix"] = confusion_matrix(truth, labels, labels=[0, 1]).tolist()
    report["roc_auc"] = roc_auc_score(truth, probabilities) if len(set(truth)) == 2 else None
    report["count"] = len(records)
    return report


def save_report(report: dict[str, object], path: str | Path) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
