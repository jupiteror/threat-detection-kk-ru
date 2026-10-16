"""Create reproducible train/validation/test JSONL files grouped by source."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from models.common.dataset import DatasetRecord, load_records, split_by_source


def _write_jsonl(records: Sequence[DatasetRecord], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        for record in records:
            stream.write(
                json.dumps(
                    {
                        "dialogue_id": record.record_id,
                        "dialogue_text": record.text,
                        "label": record.label,
                        "language": record.language.value,
                        "source_group_id": record.source_group_id,
                        "target_subtypes": [item.value for item in record.target_subtypes],
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare leakage-safe ML splits")
    parser.add_argument("--input", required=True, help="Reviewed CSV or JSONL")
    parser.add_argument("--output", default="data/ml")
    parser.add_argument("--validation-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    records = load_records(args.input)
    split = split_by_source(
        records,
        validation_ratio=args.validation_ratio,
        test_ratio=args.test_ratio,
        seed=args.seed,
    )
    output = Path(args.output)
    _write_jsonl(split.train, output / "train.jsonl")
    _write_jsonl(split.validation, output / "validation.jsonl")
    _write_jsonl(split.test, output / "test.jsonl")
    print(
        json.dumps(
            {
                "train": len(split.train),
                "validation": len(split.validation),
                "test": len(split.test),
                "output": str(output),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
