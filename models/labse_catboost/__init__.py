"""LaBSE embeddings plus CatBoost classifier."""

from models.labse_catboost.model import LabseCatBoostModel


def create_model() -> LabseCatBoostModel:
    return LabseCatBoostModel()


__all__ = ["LabseCatBoostModel", "create_model"]
