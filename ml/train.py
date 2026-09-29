"""Train the hardware-compatible model; no test-set selection or ID leakage.
Run from any directory: python ml/train.py
"""
from pathlib import Path
import hashlib, json, math, platform
import numpy as np
import pandas as pd
import sklearn
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, log_loss, confusion_matrix, brier_score_loss
import xgboost as xgb

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'ml/artifacts'
WEB = ROOT / 'src/model'
ART.mkdir(parents=True, exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)
DATA = ROOT / 'ml/data/cow_milk_mastitis_dataset.csv'
FEATURES = ['Milk_Temperature', 'Milk_pH']
df = pd.read_csv(DATA)
assert set(df.class1.unique()) == {0, 1}
assert not df[FEATURES + ['class1']].isna().any().any()
assert df.Cow_ID.is_unique, 'This split expects one row per cow; use cow-group splitting for repeated cows.'
X = df[FEATURES].astype(np.float32)
y = df.class1.astype(int)
# Exact identical feature pairs must remain together, even for different Cow_IDs.
groups = df[FEATURES].astype(str).agg('|'.join, axis=1)
outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
trainval, test = next(outer.split(X, y, groups))
inner = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=43)
tr, va = next(inner.split(X.iloc[trainval], y.iloc[trainval], groups.iloc[trainval]))
train, val = trainval[tr], trainval[va]
assert set(groups.iloc[train]).isdisjoint(groups.iloc[val])
assert set(groups.iloc[trainval]).isdisjoint(groups.iloc[test])
base = dict(objective='binary:logistic', eval_metric='logloss', tree_method='hist', n_jobs=1, random_state=42,
            subsample=1.0, colsample_bytree=1.0, reg_lambda=5.0, min_child_weight=3.0, base_score=0.5)
candidates=[]
for depth in [2,3]:
    for trees in [40,80,120]:
        params=dict(max_depth=depth,n_estimators=trees,learning_rate=0.08)
        model=xgb.XGBClassifier(**base, **params)
        model.fit(X.iloc[train],y.iloc[train])
        prob=model.predict_proba(X.iloc[val])[:,1]
        candidates.append(dict(**params,validation_log_loss=float(log_loss(y.iloc[val],prob)),validation_auc=float(roc_auc_score(y.iloc[val],prob))))
selected=min(candidates,key=lambda c:c['validation_log_loss'])
params={k:selected[k] for k in ['max_depth','n_estimators','learning_rate']}
model=xgb.XGBClassifier(**base,**params)
model.fit(X.iloc[trainval],y.iloc[trainval])
prob=model.predict_proba(X.iloc[test])[:,1]
pred=(prob>=0.5).astype(int)
tn,fp,fn,tp=confusion_matrix(y.iloc[test],pred,labels=[0,1]).ravel()
metrics={name:float(fn_(y.iloc[test], pred)) for name,fn_ in [('accuracy',accuracy_score),('precision',precision_score),('recall',recall_score),('f1',f1_score)]}
metrics.update(roc_auc=float(roc_auc_score(y.iloc[test],prob)),average_precision=float(average_precision_score(y.iloc[test],prob)),log_loss=float(log_loss(y.iloc[test],prob)),brier_score=float(brier_score_loss(y.iloc[test],prob)),confusion_matrix=[[int(tn),int(fp)],[int(fn),int(tp)]])
# Wilson interval for held-out accuracy, descriptive only.
n=len(test);phat=metrics['accuracy'];z=1.96;den=1+z*z/n
mid=(phat+z*z/(2*n))/den;half=z*math.sqrt(phat*(1-phat)/n+z*z/(4*n*n))/den
metrics['accuracy_wilson_95']=[mid-half,mid+half]
model.get_booster().save_model(ART/'mastitis-xgboost.json')
saved=json.loads((ART/'mastitis-xgboost.json').read_text())
learner=saved['learner'];trees=learner['gradient_booster']['model']['trees']
assert learner['objective']['name']=='binary:logistic'
assert all(all(t==0 for t in tree['split_type']) for tree in trees), 'Only numerical split export supported.'
# base_score is explicitly 0.5, so initial margin is logit(0.5)=0.
portable={'format':'gausetu-xgboost-numeric-v1','modelVersion':'xgb-milk-2f-v1','objective':'binary:logistic','baseMargin':0.0,
          'features':[{'datasetName':f,'key':k,'unit':u,'min':float(X.iloc[trainval][f].min()),'max':float(X.iloc[trainval][f].max())} for f,k,u in [('Milk_Temperature','milkTemperature','°C'),('Milk_pH','ph','pH')]],
          'decisionThreshold':0.5,'trees':[{k:t[k] for k in ['left_children','right_children','split_indices','split_conditions','default_left']} for t in trees]}
metadata={'modelVersion':portable['modelVersion'],'datasetFile':'cow_milk_mastitis_dataset.csv','datasetSha256':hashlib.sha256(DATA.read_bytes()).hexdigest(),
 'rows':len(df),'classCounts':{str(k):int(v) for k,v in y.value_counts().sort_index().items()},'features':portable['features'],
 'target':'class1','labelAssumption':'0 = negative and 1 = mastitis-positive; semantic labels are assumed, not documented in the source CSV.',
 'split':{'training':len(train),'validation':len(val),'finalTraining':len(trainval),'test':len(test),'method':'StratifiedGroupKFold: identical feature pairs grouped; 5-fold outer first split, 4-fold inner first split. All Cow_IDs unique. Seeds 42/43.'},
 'testClassCounts':{str(k):int(v) for k,v in y.iloc[test].value_counts().sort_index().items()},'selectedParameters':{**base,**params},'candidates':candidates,
 'metrics':metrics,'majorityBaselineAccuracy':float(max(y.iloc[test].value_counts())/len(test)),
 'featureImportanceGainNormalized':dict(zip(FEATURES,map(float,model.feature_importances_))),
 'versions':{'python':platform.python_version(),'xgboost':xgb.__version__,'scikit-learn':sklearn.__version__,'numpy':np.__version__,'pandas':pd.__version__},
 'limitations':['Source provenance and veterinary label validation are unknown.','Two matching sensors only; body temperature, accelerometer and TDS absent from training data.','No conversion from TDS to conductivity is performed.','Single-source held-out test; not external clinical validation.','Probabilities are uncalibrated model scores.','Milk temperature and pH are strongly separated by class in this file; field performance may differ.']}
(ART/'evaluation.json').write_text(json.dumps(metadata,indent=2))
(WEB/'model.json').write_text(json.dumps(portable,separators=(',',':')))
(WEB/'metadata.json').write_text(json.dumps(metadata,indent=2))
# Audit assignments and individual held-out predictions.
split=np.full(len(df),'trainval',dtype=object);split[test]='test';split[train]='train';split[val]='validation'
pd.DataFrame({'row_index':df.index,'Cow_ID':df.Cow_ID,'split':split,'class1':y}).to_csv(ART/'split-assignments.csv',index=False)
result=df.iloc[test].copy();result['predicted_probability']=prob;result['predicted_class']=pred;result.to_csv(ART/'heldout-predictions.csv',index=False)
# Parity cases: every dataset row plus values exactly on learned split boundaries.
parity=[]
for idx in df.index:
    parity.append({'milkTemperature':float(X.loc[idx,'Milk_Temperature']),'ph':float(X.loc[idx,'Milk_pH'])})
for tree in trees:
    for node,left in enumerate(tree['left_children']):
        if left<0:continue
        key=portable['features'][tree['split_indices'][node]]['key'];threshold=np.float32(tree['split_conditions'][node])
        for v in [np.nextafter(threshold,np.float32(-np.inf)),threshold,np.nextafter(threshold,np.float32(np.inf))]:
            row={'milkTemperature':36.0,'ph':6.7};row[key]=float(v);parity.append(row)
parityX=pd.DataFrame([[r['milkTemperature'],r['ph']] for r in parity],columns=FEATURES,dtype=np.float32)
expected=model.predict_proba(parityX)[:,1]
(ART/'parity-fixtures.json').write_text(json.dumps([dict(**r,expected=float(p)) for r,p in zip(parity,expected)]))
# Actual dataset examples for interactive loading. They are explicitly dataset samples.
examples=[]
for label in [0,1]:
    indices=[idx for idx in test if y.iloc[idx]==label][:3]
    for idx in indices:
        row=df.iloc[idx];examples.append({'cowTag':row.Cow_ID,'milkTemperature':float(row.Milk_Temperature),'ph':float(row.Milk_pH),'label':int(row.class1)})
(WEB/'examples.json').write_text(json.dumps(examples,indent=2))
(ROOT/'ml/requirements.txt').write_text('\n'.join(f'{k}=={v}' for k,v in metadata['versions'].items() if k!='python')+'\n')
print(json.dumps({'split':metadata['split'],'metrics':metrics,'parameters':params,'parity_cases':len(parity)},indent=2))
