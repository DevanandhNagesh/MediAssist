# Raw Dataset Dropzone

Use this folder to park unprocessed CSV/JSON files that still require cleaning or schema alignment. These files are ignored by Git (see `.gitignore`) so you can freely copy large or noisy exports here without affecting version control.

## Suggested workflow

1. Place the original sources in this directory, grouped by feature (e.g., `symptoms_raw.csv`, `diseases_raw.xlsx`).
2. Track any transformation steps in notes or a notebook so they can be reproduced later.
3. When the data is ready for the app, move the cleaned artifacts into the structured locations under `datasets/models/` or import them into MongoDB.
4. Delete or archive outdated raw files to keep the workspace tidy.

This folder is meant for temporary reference only; the application never reads from it directly.
