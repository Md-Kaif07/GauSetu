# XGBoost model card

## Purpose and current status

`xgb-milk-2f-v1` is a binary classifier trained on the user-supplied `cow_milk_mastitis_dataset (1)(1).csv` (800 rows). It is integrated into the combined web application. It is a project prototype, not a clinically validated mastitis diagnostic device.

The file's bytes exactly match the earlier dataset upload. SHA-256: `8c642a1a4ebd559b2ba2b5e704a1e38f3972572c3c4f15ca151808820e71484d`.

## Inputs and target

- Inputs, in fixed order: `Milk_Temperature` and `Milk_pH`.
- Runtime mappings: `milkTemperature` and `ph`.
- Temperature unit is assumed to be degrees Celsius; the CSV has no separate unit dictionary.
- Target: `class1`, with values 0 and 1. We assume 1 represents mastitis-positive; the CSV itself does not document the target semantics.
- Identifiers `Cow_ID` and `Day` are excluded.
- Conductivity, SCC, milk yield, and clotting are excluded because the user has not listed hardware that supplies those exact measurements.
- Cow temperature, accelerometer, and TDS are absent from the CSV. They are neither fabricated nor imputed as model features.
- TDS is not converted to conductivity.

## Dataset audit

800 unique cow IDs; 9 columns; no missing entries; 631 class-0 and 169 class-1 rows. There are 27 repeated pairs of the two selected feature values. These duplicate feature groups stay together during splitting to avoid identical feature pairs appearing in both training and testing.

The class distributions are strongly separated: class-0 milk temperature ranges from 34.04 to 37.10 and class-1 from 36.89 to 39.38; class-0 pH ranges from 6.35 to 7.04 and class-1 from 6.85 to 7.42. These are descriptions of the supplied data, not medical cutoffs. Dataset provenance, collection method, sensor calibration, animal sampling, and veterinary confirmation are unknown. Whether the dataset is synthetic cannot be determined from the CSV alone.

## Split, selection, and training

- Outer split: the first fold of `StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)`, grouping exact input pairs. 640 development rows and 160 hold-out rows.
- Inner split: first fold of a four-fold stratified grouped split, seed 43. 480 training rows and 160 validation rows.
- Six candidates: maximum depth 2 or 3, 40/80/120 trees, learning rate 0.08. Selected by lowest validation log loss.
- Other parameters: binary logistic objective; histogram tree method; one CPU worker; seed 42; full-row/full-feature sampling; `reg_lambda=5`; `min_child_weight=3`; `base_score=0.5`.
- Selected model: 80 trees, maximum depth 2, learning rate 0.08.
- Final fitting: selected settings retrained on 640 development rows. Test rows were not used for fitting or parameter selection. The model has not subsequently been refit on all 800 rows.
- Class threshold is fixed at 0.50, not optimized on the test set. No probability calibration was performed.

## Hold-out results

| Metric | Result |
|---|---:|
| Held-out examples | 160 |
| Accuracy | 100.0% |
| Class-1 precision | 100.0% |
| Class-1 recall | 100.0% |
| F1 | 1.000 |
| ROC AUC | 1.000 |
| Average precision | 1.000 |
| Log loss | 0.010271 |
| Brier score | 0.000242 |
| Majority-class accuracy baseline | 78.75% |
| Accuracy Wilson 95% interval | 97.66%–100.00% |

| Actual / predicted | Class 0 | Class 1 |
|---|---:|---:|
| Class 0 | 126 | 0 |
| Class 1 | 0 | 34 |

These figures describe one split of a small, strongly separated dataset. They do not measure external farm performance, subgroup reliability, probability calibration, or clinical safety. The interval is a descriptive binomial interval and does not account for unknown collection bias or domain shift. Independent veterinary-labelled data is needed before deployment as a health decision system.

## Runtime behavior and parity

The standard native model is `ml/artifacts/mastitis-xgboost.json`, written using XGBoost's `save_model`. A compact numeric-tree representation is bundled in `src/model/model.json`. The JavaScript evaluator sums the exported tree leaf values, starting from the explicit zero logit margin (base score 0.5), and applies the logistic function. Float32 feature comparisons and margin accumulation mirror native CPU inference.

Parity testing covers all 800 CSV rows and values immediately below, exactly on, and immediately above learned split boundaries: 1,025 cases. Maximum probability difference against Python XGBoost is approximately `3.68e-8`; predicted classes agree in all cases. This demonstrates implementation equivalence, not clinical accuracy.

The browser rejects missing/nonnumeric values and values outside the final training min/max domain. It does not silently substitute missing values, clamp readings, or issue extrapolated predictions. The accepted bounds are approximately 34.04–39.38 °C and pH 6.35–7.42. Range membership alone does not prove a new observation is representative of training conditions.

Each saved prediction contains the model version, probability, predicted class, input source, reading ID, and full observation snapshot. Only two named input fields affect the output. The app distinguishes synthetic farm samples, manually entered observations, sensor-file imports, and sample simulation. Dataset-example previews do not create farm measurements. Legacy fixed-score results remain labelled as legacy history and are excluded from the current model-result selector.

## Reproduction and artifacts

Run `python -m pip install -r ml/requirements.txt`, then `python ml/train.py`. The training script regenerates the native and browser models, exact split assignments, evaluation metadata, held-out row predictions, example rows, and parity fixtures. Run `npm test` and `npm run build` afterward.

Training environment: Python 3.12.14, XGBoost 3.4.1, scikit-learn 1.8.0, NumPy 2.3.5, pandas 2.2.3.

The output ZIP includes the exact source dataset and all relevant artifacts. There is no third-party model service or secret key in the inference path.

## Official implementation references

- XGBoost model saving: https://xgboost.readthedocs.io/en/stable/tutorials/saving_model.html
- XGBoost parameters and binary logistic objective: https://xgboost.readthedocs.io/en/stable/parameter.html

These references describe the library; they do not validate the uploaded dataset or this model's clinical use.
