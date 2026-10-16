from __future__ import annotations

import json
import importlib.util
import tempfile
import unittest
from pathlib import Path

from models.common.dataset import DatasetRecord, load_records, split_by_source
from models.common.labels import Language
from models.tfidf_logreg.model import TfidfLogisticRegressionModel


def _record(index: int, label: int, group: str) -> DatasetRecord:
    text = (
        f"оскорбление группы ненависть пример {index}"
        if label
        else f"спокойная нормальная дискуссия пример {index}"
    )
    return DatasetRecord(
        record_id=f"record-{index}",
        text=text,
        label=label,
        language=Language.RU,
        source_group_id=group,
    )


class DatasetTests(unittest.TestCase):
    def test_loader_excludes_uncertain_and_other_threat(self) -> None:
        rows = [
            {
                "dialogue_id": "1",
                "dialogue_text": "positive",
                "gold_label": "TARGET_THREAT",
                "language": "RU",
                "source_group_id": "group-1",
            },
            {
                "dialogue_id": "2",
                "dialogue_text": "negative",
                "gold_label": "NORMAL",
                "language": "KK",
                "source_group_id": "group-2",
            },
            {
                "dialogue_id": "3",
                "dialogue_text": "unknown",
                "gold_label": "UNCERTAIN",
                "language": "MIXED",
                "source_group_id": "group-3",
            },
            {
                "dialogue_id": "4",
                "dialogue_text": "another category",
                "gold_label": "OTHER_THREAT",
                "language": "RU",
                "source_group_id": "group-4",
            },
        ]
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "dataset.jsonl"
            path.write_text(
                "".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8"
            )
            records = load_records(path)
        self.assertEqual([record.label for record in records], [1, 0])

    def test_split_keeps_source_groups_separate(self) -> None:
        records = [
            _record(index, index % 2, f"group-{index // 4}") for index in range(20)
        ]
        split = split_by_source(records, seed=7)
        groups = [
            {record.source_group_id for record in part}
            for part in (split.train, split.validation, split.test)
        ]
        self.assertTrue(groups[0].isdisjoint(groups[1]))
        self.assertTrue(groups[0].isdisjoint(groups[2]))
        self.assertTrue(groups[1].isdisjoint(groups[2]))
        self.assertEqual(sum(len(part) for part in (split.train, split.validation, split.test)), 20)


class BaselineTests(unittest.TestCase):
    @unittest.skipUnless(
        importlib.util.find_spec("sklearn") is not None,
        "scikit-learn is not installed",
    )
    def test_fit_predict_save_and_load(self) -> None:
        records = [_record(index, index % 2, f"group-{index // 4}") for index in range(16)]
        model = TfidfLogisticRegressionModel()
        model.fit(records)
        predictions = model.predict(["ненависть группы", "спокойная дискуссия"])
        self.assertEqual(len(predictions), 2)
        self.assertTrue(all(0.0 <= item.probability <= 1.0 for item in predictions))

        with tempfile.TemporaryDirectory() as temporary:
            model.save(Path(temporary))
            loaded = TfidfLogisticRegressionModel.load(temporary)
            self.assertEqual(len(loaded.predict(["тестовый текст"])), 1)


if __name__ == "__main__":
    unittest.main()
