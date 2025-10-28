# MediAssist AI Datasets

Place all preprocessed datasets, model files, and auxiliary assets in this directory following the structure below.

```
/datasets
  /models
    symptom_model.json
    symptom_metadata.json
    pill_model
      model.json
      group1-shard1of1.bin
  /lookups
    medicines.json
    diseases.json
    interactions.json
    symptoms.csv
```

These files are referenced by backend services via relative paths defined in `.env`. Ensure the filenames match the configuration or update the environment variables accordingly.
