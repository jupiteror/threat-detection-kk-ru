"""CLI: python -m models.xlmr_finetuning {train,evaluate,predict}."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from models.common.dataset import load_records
from models.common.metrics import binary_report, save_report
from models.xlmr_finetuning.model import XlmrFineTuningModel


def main() -> None:
    parser = argparse.ArgumentParser(description="XLM-RoBERTa fine-tuning")
    commands = parser.add_subparsers(dest="command", required=True)
    train = commands.add_parser("train")
    train.add_argument("--input", required=True)
    train.add_argument("--output", default="models/artifacts/xlmr_finetuning")
    train.add_argument("--epochs", type=int, default=3)
    train.add_argument("--batch-size", type=int, default=8)
    train.add_argument("--max-length", type=int, default=256)
    train.add_argument("--learning-rate", type=float, default=2e-5)
    evaluate = commands.add_parser("evaluate")
    evaluate.add_argument("--input", required=True)
    evaluate.add_argument("--model", default="models/artifacts/xlmr_finetuning")
    evaluate.add_argument("--report", default="models/reports/xlmr_finetuning.json")
    predict = commands.add_parser("predict")
    predict.add_argument("--text", required=True)
    predict.add_argument("--model", default="models/artifacts/xlmr_finetuning")
    args = parser.parse_args()

    if args.command == "train":
        records = load_records(args.input)
        model = XlmrFineTuningModel(
            epochs=args.epochs,
            batch_size=args.batch_size,
            max_length=args.max_length,
            learning_rate=args.learning_rate,
        )
        model.fit(records)
        model.save(Path(args.output))
        print(json.dumps({"trained_records": len(records), "output": args.output}))
    elif args.command == "evaluate":
        records = load_records(args.input)
        model = XlmrFineTuningModel.load(args.model)
        report = binary_report(records, model.predict([item.text for item in records]))
        save_report(report, args.report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        model = XlmrFineTuningModel.load(args.model)
        result = model.predict([args.text])[0]
        print(json.dumps({"label": result.label, "probability": result.probability}))


if __name__ == "__main__":
    main()
