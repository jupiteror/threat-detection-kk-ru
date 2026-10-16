"""TF-IDF plus Logistic Regression baseline."""

from models.tfidf_logreg.model import TfidfLogisticRegressionModel


def create_model() -> TfidfLogisticRegressionModel:
    return TfidfLogisticRegressionModel()


__all__ = ["TfidfLogisticRegressionModel", "create_model"]
