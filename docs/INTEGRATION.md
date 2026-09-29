# Integration notes

## Source review

The first ZIP contains an Expo 57 / React Native mobile prototype with eight screens (login, home, live monitoring, alert, AI result, history, profile, settings), context providers, a custom tab bar, reusable prediction cards, a voice assistant, and mock prediction fixtures. Its README-equivalent instructions are AGENTS.md and CLAUDE.md; there is no separate product specification.

The second ZIP contains a React/Vite GauSetu web prototype with a single large App.jsx and App.css. It defines login, three-farm selection, farm dashboard, cows, cow profile, alerts, sensors, a local assistant, and static feature definitions for health, milk, treatments, and reports. Its README is the generic React/Vite template. No PDF, DOCX, hardware firmware, dataset, or model file is present in either first-party source tree.

## Feature mapping

| Source feature | Combined implementation |
|---|---|
| Mobile home + GauSetu dashboard | One farm dashboard, shared calculated totals, consistent attention list |
| Mobile live monitoring | Responsive monitoring page; body and milk metrics, manual entry, controlled simulator |
| Mobile mockPrediction.js | Replaced by trained XGBoost using milk temperature/pH; saved input snapshots and model version |
| Mobile AI result + GauSetu risk cards | Per-cow trained prediction, held-out dataset previews, evaluation panel, saved history |
| Mobile alerts + GauSetu alerts | Shared farm-scoped event list with persisted acknowledgement |
| GauSetu cow list/profile forms | Search/filter, add/edit, persistent individual cow records |
| GauSetu sensor manager | Shared device list, cow assignments, status/battery editing |
| GauSetu pregnancy/baseline widgets | Per-cow editable pregnancy, due date, lactation, and manual baselines |
| GauSetu static milk feature | Real aggregation of saved daily observations and per-cow quality data |
| GauSetu treatment form/static feature | Persistent care entries, vet instructions, notes, follow-up dates, completion |
| Mobile history + GauSetu reports | Timestamped shared observations, range filters, computed chart/mean, CSV |
| Mobile voice assistant + GauSetu local assistant | Record-based helper, browser dictation and speech synthesis |
| Mobile theme/language/profile | Persistent theme/profile plus multilingual navigation |
| Both demo login screens | Explicit demo entry and farm choice, without misleading password verification |

## Fixes made during integration

- Replaced the profile that always rendered Gauri with lookup by persistent cow ID.
- Removed global `window.selectedCowId` and repeated per-page sidebars.
- Kept cow tag uniqueness within each farm and used globally unique record IDs.
- Replaced mutually inconsistent herd counts, alerts, sensor totals, and production totals with shared selectors.
- Prevented local per-screen state from losing edits when navigating.
- Connected previously unreachable static feature sections to functional pages.
- Made edit-dialog cancellation discard draft changes rather than mutate saved data.
- Unified cow identities used by alerts, device rows, reports, and the assistant.
- Replaced random history regeneration on time-filter changes with persisted observations.
- Removed arbitrary claims of trained AI confidence, measured SCC, confirmed diagnosis, and automatic pregnancy-adjusted prediction.
- Removed the embedded third-party API key and browser-to-provider call.
- Added meaningful validation, CSV escaping/formula neutralization, backup checks, empty states, and storage error handling.

## Further integration points (not implemented)

1. **Hardware:** add a server that receives authenticated device messages. Validate a cow/device assignment and map readings into the documented fields in `domain.mjs`. Keep source, units, timestamp, and device status truthful. Do not put secrets in browser code.
2. **Model extension:** the trained two-feature XGBoost model is already integrated locally. To use body temperature, TDS, and accelerometer readings, collect veterinary-labelled examples containing those sensors and retrain/evaluate. Add external validation and probability calibration before actual clinical use.
3. **Cloud persistence/authentication:** replace the local store with authenticated, farm-scoped API/database calls and access controls. Demo farm switching is not authorization.
4. **Language model assistant:** use a server-side provider adapter with environment secrets, authorized farm context, timeouts, and clear errors. The local assistant is the working no-key default in this version.
5. **Notifications:** implement server jobs and consent-aware push delivery. Acknowledging a local alert currently sends no message to anyone.

The prebuilt static bundle can be hosted on any ordinary static host. No deployment or domain was created by this task.

## Current XGBoost update

The latest uploaded 800-row CSV is included in ml/data. The trained model, evaluation, browser export, native inference script, and reproducible training pipeline are included. Sensor fields now match the specified cow tag and milk analyser, and JSON packet import is available. See MODEL-CARD.md and ../hardware/README.md.
