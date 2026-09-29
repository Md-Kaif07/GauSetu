import model from './model/model.json' with {type:'json'};
import metadata from './model/metadata.json' with {type:'json'};
export {metadata};
export const modelVersion=model.modelVersion;
// XGBoost numeric gbtree evaluator. Traverses the actual exported trained trees.
// float32 comparisons/accumulation match the Python CPU predictor; no retraining in JS.
export function predictRaw(reading) {
  const values=model.features.map(f=>{
    const raw=reading[f.key];
    if(raw===null||raw===undefined||raw===''||typeof raw==='boolean'||!Number.isFinite(Number(raw))) throw new Error(`${f.datasetName} is required.`);
    return Math.fround(Number(raw));
  });
  let margin=Math.fround(model.baseMargin);
  for(const tree of model.trees){
    let node=0;
    while(tree.left_children[node]!==-1){
      const value=values[tree.split_indices[node]],threshold=Math.fround(tree.split_conditions[node]);
      node=value<threshold?tree.left_children[node]:tree.right_children[node];
    }
    margin=Math.fround(margin+Math.fround(tree.split_conditions[node]));
  }
  const probability=1/(1+Math.exp(-margin));
  return {probability,predictedClass:probability>=model.decisionThreshold?1:0};
}
export function predictReading(reading) {
  // Reject unsupported ranges in the app; never replace absent inputs with a mean.
  for(const f of model.features){
    const raw=reading[f.key];
    if(raw===null||raw===undefined||raw===''||typeof raw==='boolean'||!Number.isFinite(Number(raw))) throw new Error(`Enter ${f.datasetName} before predicting.`);
    if(Math.fround(Number(raw))<f.min||Math.fround(Number(raw))>f.max) throw new Error(`${f.datasetName} is outside the trained range (${f.min.toFixed(2)}–${f.max.toFixed(2)} ${f.unit}). Check sensor units/calibration; no prediction was saved.`);
  }
  return {...predictRaw(reading),modelVersion,featuresUsed:['milkTemperature','ph'],calibrated:false};
}
