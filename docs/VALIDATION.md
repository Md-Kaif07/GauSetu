# Final validation — XGBoost edition

Verified on 27 September 2026.

- Production build: PASS (33 modules).
- Domain/model tests: 12 passed. Includes shared data, farm separation, readings, backups, exports, missing/out-of-domain input checks, and model inference.
- Native Python prediction: PASS using the saved XGBoost model. Milk temperature 38.1 °C and pH 7.1 produced class 1 with score approximately 0.98291564.
- Python/browser parity: 1,025 cases (all 800 dataset rows plus learned split boundaries), identical predicted classes; maximum probability difference 3.68005434e-8.
- Main browser workflow: PASS in Chromium, including cow creation, edit cancellation, readings, simulation, a trained positive prediction, saved input snapshot, alert acknowledgement, care records, devices, farm separation, refresh persistence, CSV download, assistant totals, dark mode, guarded reset, backup restoration, and dataset-example previews without mutation.
- Hardware/model browser workflow: PASS, including sensor JSON import, wrong-cow rejection, invalid values, raw accelerometer preservation, missing optional values, input-source provenance, a trained negative prediction, and blocked predictions for missing/out-of-domain inputs.
- Desktop (1440×1050) and mobile (390×844) layouts checked. No browser page errors; tables scroll inside cards rather than the whole page.

The held-out evaluation reports 160/160 correct on this supplied dataset. See MODEL-CARD.md for the split, class counts, uncertainty, and important limits. This is not external clinical validation.

Not physically tested: sensor boards, controller firmware, real wireless transport, a Windows computer's double-click launcher, microphone capture, or OS-specific voice availability. No real cloud authentication, database, or push service is included. The static server and browser flows were exercised locally.

Tests can be rerun with npm test. Optional browser scripts use Playwright; start npm start separately, then run node tests/browser-check.mjs and node tests/hardware-browser-check.mjs. The browser executable/module can be supplied by environment variables for CI.
