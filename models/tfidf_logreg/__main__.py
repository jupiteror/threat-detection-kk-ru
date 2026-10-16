"""CLI: python -m models.tfidf_logreg {train,evaluate,predict}."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from models.common.dataset import load_records
from models.common.metrics import binary_report, save_report
from models.tfidf_logreg.model import TfidfLogisticRegressionModel


def main() -> None:
    parser = argparse.ArgumentParser(description="TF-IDF + Logistic Regression")
    commands = parser.add_subparsers(dest="command", required=True)

    train = commands.add_parser("train")
    train.add_argument("--input", required=True)
    train.add_argument("--output", default="models/artifacts/tfidf_logreg")

    evaluate = commands.add_parser("evaluate")
    evaluate.add_argument("--input", required=True)
    evaluate.add_argument("--model", default="models/artifacts/tfidf_logreg")
    evaluate.add_argument("--report", default="models/reports/tfidf_logreg.json")

    predict = commands.add_parser("predict")
    predict.add_argument("--text", required=True)
    predict.add_argument("--model", default="models/artifacts/tfidf_logreg")

    args = parser.parse_args()
    if args.command == "train":
        records = load_records(args.input)
        model = TfidfLogisticRegressionModel()
        model.fit(records)
        model.save(Path(args.output))
        print(json.dumps({"trained_records": len(records), "output": args.output}))
    elif args.command == "evaluate":
        records = load_records(args.input)
        model = TfidfLogisticRegressionModel.load(args.model)
        report = binary_report(records, model.predict([item.text for item in records]))
        save_report(report, args.report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        model = TfidfLogisticRegressionModel.load(args.model)
        result = model.predict([args.text])[0]
        print(json.dumps({"label": result.label, "probability": result.probability}))


if __name__ == "__main__":
    main()
