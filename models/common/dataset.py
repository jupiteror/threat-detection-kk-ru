"""Strict loading and group-aware splitting of manually labelled data."""

from __future__ import annotations

import csv
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from models.common.labels import Language, ThreatSubtype, to_binary_label

TEXT_COLUMNS = ("dialogue_text", "anonymized_text", "clean_text", "text")
LABEL_COLUMNS = ("gold_label", "manual_label", "label")
ID_COLUMNS = ("dialogue_id", "candidate_id", "record_id", "id")
GROUP_COLUMNS = ("source_group_id", "group_id", "source_id")
SUBTYPE_COLUMNS = ("target_subtypes", "target_subtype", "gold_subtypes")


@dataclass(frozen=True, slots=True)
class DatasetRecord:
    record_id: str
    text: str
    label: int
    language: Language
    source_group_id: str
    target_subtypes: tuple[ThreatSubtype, ...] = ()


@dataclass(frozen=True, slots=True)
class DatasetSplit:
    train: tuple[DatasetRecord, ...]
    validation: tuple[DatasetRecord, ...]
    test: tuple[DatasetRecord, ...]


def _first(row: Mapping[str, Any], names: Sequence[str]) -> str:
    for name in names:
        value = row.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _parse_language(value: str) -> Language:
    try:
        return Language(value.strip().upper() or Language.MIXED.value)
    except ValueError as error:
        raise ValueError(f"Unsupported language: {value!r}") from error


def _parse_subtypes(value: str) -> tuple[ThreatSubtype, ...]:
    if not value.strip():
        return ()
    raw_values: list[str]
    try:
        parsed = json.loads(value)
        raw_values = [str(item) for item in parsed] if isinstance(parsed, list) else [str(parsed)]
    except json.JSONDecodeError:
        raw_values = [item.strip() for item in value.replace(";", ",").split(",")]
    try:
        return tuple(ThreatSubtype(item) for item in raw_values if item)
    except ValueError as error:
        raise ValueError(f"Unsupported target subtype in {value!r}") from error


def _to_record(row: Mapping[str, Any], row_number: int) -> DatasetRecord | None:
    text = _first(row, TEXT_COLUMNS)
    manual_label = _first(row, LABEL_COLUMNS)
    label = to_binary_label(manual_label)
    if label is None:
        return None
    if not text:
        raise ValueError(f"Row {row_number}: text is empty")
    record_id = _first(row, ID_COLUMNS) or f"row-{row_number}"
    language = _parse_language(str(row.get("language", "MIXED")))
    source_group_id = _first(row, GROUP_COLUMNS) or "unknown"
    subtypes = _parse_subtypes(_first(row, SUBTYPE_COLUMNS))
    return DatasetRecord(record_id, text, label, language, source_group_id, subtypes)


def _read_rows(path: Path) -> Iterable[Mapping[str, Any]]:
    if path.suffix.lower() == ".jsonl":
        with path.open("r", encoding="utf-8-sig") as stream:
            for line_number, line in enumerate(stream, start=1):
                if line.strip():
                    value = json.loads(line)
                    if not isinstance(value, dict):
                        raise ValueError(f"Line {line_number}: expected a JSON object")
                    yield value
        return
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            yield from csv.DictReader(stream)
        return
    raise ValueError(f"Only .csv and .jsonl files are supported: {path}")


def load_records(path: str | Path) -> list[DatasetRecord]:
    """Load labelled data and omit records without reliable binary truth."""

    source = Path(path)
    if not source.is_file():
        raise FileNotFoundError(source)
    records = [
        record
        for index, row in enumerate(_read_rows(source), start=2)
        if (record := _to_record(row, index)) is not None
    ]
    if not records:
        raise ValueError(f"No trainable manually labelled records found in {source}")
    return records


def split_by_source(
    records: Sequence[DatasetRecord],
    *,
    validation_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> DatasetSplit:
    """Split whole source groups to reduce train/test leakage."""

    if not 0 < validation_ratio < 1 or not 0 < test_ratio < 1:
        raise ValueError("validation_ratio and test_ratio must be between 0 and 1")
    if validation_ratio + test_ratio >= 1:
        raise ValueError("validation_ratio + test_ratio must be less than 1")

    grouped: dict[str, list[DatasetRecord]] = {}
    for record in records:
        grouped.setdefault(record.source_group_id, []).append(record)
    groups = list(grouped)
    if len(groups) < 3:
        raise ValueError("At least three source groups are required for group-aware splitting")
    random.Random(seed).shuffle(groups)

    test_count = max(1, round(len(groups) * test_ratio))
    validation_count = max(1, round(len(groups) * validation_ratio))
    if test_count + validation_count >= len(groups):
        validation_count = 1
        test_count = 1

    test_groups = set(groups[:test_count])
    validation_groups = set(groups[test_count : test_count + validation_count])
    train_groups = set(groups) - test_groups - validation_groups

    def select(selected: set[str]) -> tuple[DatasetRecord, ...]:
        return tuple(record for record in records if record.source_group_id in selected)

    return DatasetSplit(select(train_groups), select(validation_groups), select(test_groups))
