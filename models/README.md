# ML experiments

Три независимые модели обучаются на одних и тех же вручную размеченных
диалогах. Это не последовательная цепочка и не ансамбль:

1. `tfidf_logreg` — быстрая базовая модель.
2. `labse_catboost` — LaBSE превращает текст в embedding, CatBoost выполняет
   классификацию.
3. `xlmr_finetuning` — полноценное дообучение XLM-RoBERTa-base.

## Входные данные

Поддерживаются CSV и JSONL. Минимальные поля:

| Поле | Назначение |
| --- | --- |
| `dialogue_id` | Уникальный ID диалога |
| `dialogue_text` | Анонимизированный текст всей ветки |
| `gold_label` | Результат ручной проверки |
| `language` | `RU`, `KK` или `MIXED` |
| `source_group_id` | VK-группа, необходима для честного разделения данных |
| `target_subtypes` | JSON-массив или список через `;` (необязательно) |

Допустимые положительные записи: `TARGET_THREAT`. Отрицательные записи:
`NORMAL`, `AMBIGUOUS`, `JOKE_OR_SARCASM`, `QUOTED_THREAT`, `NEWS_REPORT`,
`COUNTER_SPEECH`, `FICTIONAL_CONTENT`. Метки `UNCERTAIN` и `OTHER_THREAT`
автоматически исключаются из бинарного обучения.

Текст также может находиться в `anonymized_text`, `clean_text` или `text`, а
ручная метка — в `manual_label` или `label`.

## Установка

Из корня проекта:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r models/requirements-base.txt
```

Для LaBSE + CatBoost:

```powershell
python -m pip install -r models/requirements-labse.txt
```

Для XLM-RoBERTa:

```powershell
python -m pip install -r models/requirements-xlmr.txt
```

## Подготовка выборок

Выборки разделяются по VK-группам, чтобы сообщения одного источника не попали
одновременно в обучение и тест:

```powershell
python -m models.common.prepare --input data/reviewed/dialogues.csv --output data/ml
```

## Обучение и проверка

```powershell
python -m models.tfidf_logreg train --input data/ml/train.jsonl
python -m models.tfidf_logreg evaluate --input data/ml/test.jsonl
python -m models.tfidf_logreg predict --text "Текст для проверки"

python -m models.labse_catboost train --input data/ml/train.jsonl
python -m models.labse_catboost evaluate --input data/ml/test.jsonl

python -m models.xlmr_finetuning train --input data/ml/train.jsonl
python -m models.xlmr_finetuning evaluate --input data/ml/test.jsonl
```

Весовые файлы сохраняются в `models/artifacts`, отчёты — в `models/reports`.
Оба каталога исключены из Git, потому что модели могут занимать гигабайты.

## Использование из Python

```python
from models.tfidf_logreg import create_model

model = create_model()
model.fit(records)
predictions = model.predict(["Текст диалога"])
```

`__init__.py` только экспортирует класс и фабрику. Он не загружает LaBSE или
XLM-R автоматически, поэтому простой импорт проекта не расходует память.
