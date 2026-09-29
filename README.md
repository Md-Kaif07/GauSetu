# GauSetu — complete web app with trained XGBoost

This project combines the uploaded **GauSetu dairy dashboard** and **Mastitis mobile app**, now with an XGBoost classifier trained on the supplied 800-row CSV. It includes source code, the compiled web app, trained model, dataset, training scripts, test results, and setup instructions.

## Start the app (no Python or npm install required)

1. Extract the entire ZIP.
2. Install Node.js **20.19 or newer** if needed.
3. On Windows, double-click **START-WINDOWS.bat**.
4. Open **http://localhost:4173** and click **Open demo workspace**.

Mac/Linux: run `sh START-MAC-LINUX.sh`. Alternative on any OS: `node scripts/serve.mjs`.
Keep the terminal open. The included `dist/` is ready to run. Do not open `dist/index.html` directly; use the local HTTP server.

## Use the trained prediction

1. Choose the farm and cow.
2. Open **Live monitoring → Record reading**.
3. Enter **Milk temperature (°C)** and **Milk pH**. Other sensor values are optional.
4. Save the reading and open **Mastitis analysis**.
5. Click **Run XGBoost prediction**.
6. Review the score, predicted class, saved input snapshot, and prediction history. A class-1 result creates an alert.

The old fixed 12/86 demonstration presets have been removed. Actual exported XGBoost trees now calculate the output. Inference runs in the browser without an API key, Python service, or internet connection after the app is loaded. The Node server serves static files; it is not a database or inference backend.

Try **Dataset examples** on the analysis page to evaluate two held-out CSV rows without saving them as measurements for the selected cow. The sample farm initially contains synthetic observations clearly labelled `demo`; its model outputs are actual predictions on those sample inputs.

## Hardware and feature mapping

| Hardware | Field / unit | Used for prediction? |
|---|---|---|
| Cow tag temperature sensor | `cowTemperature`, °C | No — absent from training CSV |
| Cow tag accelerometer | `ax`, `ay`, `az`, g | No — absent from training CSV |
| Milk analyser temperature sensor | `milkTemperature`, °C | **Yes** — CSV `Milk_Temperature` |
| Milk analyser pH sensor | `ph` | **Yes** — CSV `Milk_pH` |
| Milk analyser TDS sensor | `tds`, ppm | No — absent from training CSV |

**TDS is not substituted for milk conductivity.** No fabricated TDS, body-temperature, or accelerometer training values were generated. Conductivity and daily milk yield remain optional reference/manual fields. Neither is a model feature. Activity is a manual observation; no accelerometer activity classifier was trained.

For sensor packets, use **Live monitoring → Import sensor JSON**. `hardware/sample-packet.json` shows the format. The packet's cowTag must match the selected cow. You can review the values before saving. This is file import, not a live wireless connection. Continuous hardware transport and firmware are not included because sensor models and the controller were not specified.

## Evaluation and limitations

- Dataset: 800 rows; 631 class-0 and 169 class-1 examples.
- Selection: 480 training rows / 160 validation rows, choosing among six configurations by validation log loss.
- Final model: trained on those 640 development rows; tested once on **160 untouched hold-out rows**.
- Exact duplicate feature pairs are kept within the same split. Cow IDs are unique and are never training features.
- Held-out result: **160/160 correct** (126 true negatives, 34 true positives); accuracy, precision, recall, and F1 = 100% on this split.
- The dataset has very strong class separation. Its origin, sampling procedure, and label verification are undocumented. These results **do not establish real-farm or clinical accuracy**.
- `class1=1` is assumed to mean mastitis-positive and `class1=0` negative. Confirm this interpretation with the dataset provider. Temperature units are assumed to be °C.
- Scores are uncalibrated model outputs, not confirmed diagnoses. The class threshold is 0.50. Obtain veterinary confirmation for actual health concerns.
- Milk temperature outside approximately 34.04–39.38 °C, missing inputs, and pH outside approximately 6.35–7.42 are rejected by the application. No missing-value imputation is used. These are training-domain bounds, not healthy/unsafe medical cutoffs.
- Body temperature, TDS, and accelerometer inputs require a new labelled dataset before they can honestly contribute to model inference.

Full methodology, metrics, confusion matrix, row assignments, and held-out predictions are in `ml/artifacts/` and `docs/MODEL-CARD.md`. Browser inference matches Python XGBoost on all 800 rows plus learned split boundaries (1,025 parity cases).

## Included application features

Farm separation; herd add/edit/search; individual cow profiles; sensor observations and sample simulation; trained prediction and per-cow history; alert acknowledgement; device inventory; baseline and pregnancy records; milk reports; care records and follow-up dates; CSV export; JSON backup/restore; local farm assistant with optional browser speech; multilingual navigation; dark mode; and responsive desktop/mobile layouts.

Data is stored in this browser's localStorage, under `gausetu-unified-v1`. Export JSON backups regularly. There is no real login, cloud database, background push notification service, or automatic physical sensor connection. Demo entry is not an access-control boundary. The assistant answers from saved records and is separate from the XGBoost classifier; it is not connected to an LLM provider.

Existing records from the first ZIP remain readable on the same browser/origin. Legacy preset predictions are retained in history and labelled as legacy; they are not used as current trained-model results. Some old readings use milk temperature 31.2 °C, outside the new model's training range. Enter valid measured inputs rather than treating these old demo values as model-compatible.

## Develop the web app

```bash
npm ci
npm run dev
npm test
npm run build
npm start
```

`npm test` runs the domain and model-parity tests. Optional browser verification: install Playwright and Chromium, run `npm start` separately, then `node tests/browser-check.mjs`.

## Retrain or run native Python inference (optional)

Training was performed with Python 3.12.14. Use a virtual environment:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
python -m pip install -r ml/requirements.txt
python ml/train.py
python ml/predict.py --milk-temperature 38.1 --ph 7.1
npm test
npm run build
```

`ml/train.py` reproduces the grouped split, validation selection, final training, evaluation, and browser export. It intentionally requires unique cow IDs; future repeated-cow data needs a cow-grouped split. It does not tune against the test set or refit on the hold-out rows. Rebuilding the app is necessary after retraining.

## Main files

- `src/`: React application and browser inference.
- `src/inference.mjs`: float32-compatible evaluator of the actual trained numeric trees.
- `src/model/model.json`: compact browser tree export.
- `src/model/metadata.json`: model and evaluation metadata.
- `ml/data/cow_milk_mastitis_dataset.csv`: exact supplied dataset bytes.
- `ml/artifacts/mastitis-xgboost.json`: native XGBoost saved model, usable in Python.
- `ml/train.py`, `ml/predict.py`, `ml/requirements.txt`: reproducible ML workflow.
- `ml/artifacts/`: evaluation, split assignments, held-out predictions, parity fixtures.
- `hardware/sample-packet.json`: sensor-file import example.
- `dist/`: prebuilt web application.
- `scripts/serve.mjs`: dependency-free static preview server.
- `docs/`: integration notes, model card, validation, source inventory, and licenses.

The embedded third-party chat API key from the original mobile upload is not included in this project. Rotate/revoke that original key before reusing it.
