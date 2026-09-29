"""Optional native Python inference using the saved XGBoost model."""
import argparse,json
from pathlib import Path
import numpy as np
import xgboost as xgb
p=argparse.ArgumentParser()
p.add_argument('--milk-temperature',type=float,required=True)
p.add_argument('--ph',type=float,required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'ml/artifacts/evaluation.json').read_text())
values=[a.milk_temperature,a.ph]
for v,f in zip(values,meta['features']):
    if not np.isfinite(v) or not f['min'] <= np.float32(v) <= f['max']:
        p.error(f"{f['datasetName']} is outside the training range {f['min']:.2f}–{f['max']:.2f}")
booster=xgb.Booster()
booster.load_model(root/'ml/artifacts/mastitis-xgboost.json')
score=float(booster.predict(xgb.DMatrix(np.array([values],dtype=np.float32),feature_names=['Milk_Temperature','Milk_pH']))[0])
print(json.dumps({'probability':score,'predictedClass':int(score>=.5),'modelVersion':meta['modelVersion'],'featuresUsed':['Milk_Temperature','Milk_pH'],'clinicalValidation':False},indent=2))
