# Hardware input contract

Cow tag: temperature sensor and accelerometer. Milk analyser: temperature, pH, and TDS sensors.

This project accepts observations manually or through a JSON file. Firmware and continuous Bluetooth/Wi-Fi/serial transport are not implemented; specific sensor boards, calibration, and controller were not supplied.

Open **Live monitoring**, select the receiving cow, and choose **Import sensor JSON**. `sample-packet.json` is an example for cow tag `012`. The importer refuses a packet for a different selected tag and displays a review dialog before saving.

| JSON value | Meaning | Unit | Model input |
|---|---|---|---|
| cowTemperature | Cow-tag temperature reading | °C | No |
| ax / ay / az | Raw accelerometer axes | g | No |
| milkTemperature | Milk temperature | °C | Yes |
| ph | Milk pH | pH | Yes |
| tds | Milk TDS | ppm | No |
| activity | Optional manual observation | Normal / Reduced / Low / Not assessed | No |
| milkYield | Optional manual daily total | L/day | No |
| conductivity | Optional independently measured reference | mS/cm | No |

The module temperature must represent the feature named. Do not put cow body temperature into milkTemperature. Convert accelerometer units to g before import if the hardware outputs another unit. No automatic unit conversion or sensor calibration is applied.

Use null or omit an unavailable optional reading. Do not invent a conductivity value from TDS. Missing model inputs or inputs outside the training domain prevent prediction. Import validation checks broad numeric limits; the prediction layer separately applies model-domain validation.

The outer cowTag is a record identifier, not an ML feature. The packet timestamp is retained as deviceTimestamp for traceability; the app's observation timestamp is when the user saves the import. The importer labels the reading sensor-file, which indicates a file source rather than verified physical hardware provenance. A trained prediction runs only when the user selects Run XGBoost prediction.
