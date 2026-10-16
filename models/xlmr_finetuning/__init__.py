"""Fine-tuning package for XLM-RoBERTa."""

from models.xlmr_finetuning.model import XlmrFineTuningModel


def create_model() -> XlmrFineTuningModel:
    return XlmrFineTuningModel()


__all__ = ["XlmrFineTuningModel", "create_model"]
