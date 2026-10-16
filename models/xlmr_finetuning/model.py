"""Minimal typed XLM-RoBERTa fine-tuning and inference implementation."""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Sequence

from models.common.base import HateSpeechModel, Prediction
from models.common.dataset import DatasetRecord


class XlmrFineTuningModel(HateSpeechModel):
    DEFAULT_MODEL = "FacebookAI/xlm-roberta-base"

    def __init__(
        self,
        *,
        model_name: str = DEFAULT_MODEL,
        max_length: int = 256,
        batch_size: int = 8,
        epochs: int = 3,
        learning_rate: float = 2e-5,
        model: Any | None = None,
        tokenizer: Any | None = None,
    ) -> None:
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size
        self.epochs = epochs
        self.learning_rate = learning_rate
        self._model = model
        self._tokenizer = tokenizer

    @staticmethod
    def _device() -> Any:
        import torch

        return torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def _ensure_components(self) -> None:
        if self._tokenizer is not None and self._model is not None:
            return
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self._model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, num_labels=2
        )

    def fit(self, records: Sequence[DatasetRecord]) -> None:
        if len({record.label for record in records}) < 2:
            raise ValueError("Training data must contain both HATE and NON_HATE")
        import torch
        from torch.optim import AdamW

        random.seed(42)
        torch.manual_seed(42)
        self._ensure_components()
        device = self._device()
        self._model.to(device)
        optimizer = AdamW(self._model.parameters(), lr=self.learning_rate)
        indices = list(range(len(records)))

        for epoch in range(self.epochs):
            random.shuffle(indices)
            self._model.train()
            total_loss = 0.0
            for start in range(0, len(indices), self.batch_size):
                batch_indices = indices[start : start + self.batch_size]
                batch = [records[index] for index in batch_indices]
                encoded = self._tokenizer(
                    [record.text for record in batch],
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                encoded = {key: value.to(device) for key, value in encoded.items()}
                labels = torch.tensor(
                    [record.label for record in batch], dtype=torch.long, device=device
                )
                optimizer.zero_grad(set_to_none=True)
                output = self._model(**encoded, labels=labels)
                output.loss.backward()
                torch.nn.utils.clip_grad_norm_(self._model.parameters(), max_norm=1.0)
                optimizer.step()
                total_loss += float(output.loss.detach().cpu())
            average_loss = total_loss / max(1, (len(indices) + self.batch_size - 1) // self.batch_size)
            print(f"epoch={epoch + 1}/{self.epochs} loss={average_loss:.6f}")

    def predict(self, texts: Sequence[str]) -> list[Prediction]:
        import torch

        self._ensure_components()
        device = self._device()
        self._model.to(device)
        self._model.eval()
        results: list[Prediction] = []
        with torch.inference_mode():
            for start in range(0, len(texts), self.batch_size):
                batch = list(texts[start : start + self.batch_size])
                encoded = self._tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                encoded = {key: value.to(device) for key, value in encoded.items()}
                probabilities = torch.softmax(self._model(**encoded).logits, dim=1)[:, 1]
                results.extend(
                    Prediction(
                        label=int(probability >= 0.5),
                        probability=float(probability.detach().cpu()),
                    )
                    for probability in probabilities
                )
        return results

    def save(self, path: Path) -> None:
        if self._model is None or self._tokenizer is None:
            raise RuntimeError("Model is not trained or loaded")
        path.mkdir(parents=True, exist_ok=True)
        self._model.save_pretrained(path)
        self._tokenizer.save_pretrained(path)
        (path / "training_config.json").write_text(
            json.dumps(
                {
                    "model_name": self.model_name,
                    "max_length": self.max_length,
                    "batch_size": self.batch_size,
                    "epochs": self.epochs,
                    "learning_rate": self.learning_rate,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path: str | Path) -> "XlmrFineTuningModel":
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        directory = Path(path)
        config = json.loads(
            (directory / "training_config.json").read_text(encoding="utf-8")
        )
        tokenizer = AutoTokenizer.from_pretrained(directory)
        model = AutoModelForSequenceClassification.from_pretrained(directory)
        return cls(
            model_name=str(config["model_name"]),
            max_length=int(config["max_length"]),
            batch_size=int(config["batch_size"]),
            epochs=int(config["epochs"]),
            learning_rate=float(config["learning_rate"]),
            model=model,
            tokenizer=tokenizer,
        )
