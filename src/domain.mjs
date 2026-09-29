// Shared application rules and trained-model prediction. Not clinically validated.
import {predictReading} from './inference.mjs';
export const uid = () => globalThis.crypto.randomUUID();
export const riskLabel = n => n == null ? 'Unassessed' : n >= 50 ? 'High' : 'Low';
export const latest = (state, cowId) => state.readings.filter(r => r.cowId === cowId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
export const predictionFor = (state, cowId) => state.predictions.filter(r => r.cowId === cowId && r.source === 'xgboost').sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
export function farmSummary(state, farmId) {
  const cows = state.cows.filter(c => c.farmId === farmId);
  const ids = new Set(cows.map(c => c.id));
  const milk = cows.reduce((sum,c) => sum + (latest(state,c.id)?.milkYield || 0),0);
  const devices = state.devices.filter(d => ids.has(d.cowId));
  return {cows, milk, devices, high: cows.filter(c => riskLabel(predictionFor(state,c.id)?.riskPercent) === 'High').length,
    watch: cows.filter(c => riskLabel(predictionFor(state,c.id)?.riskPercent) === 'Watch').length,
    alerts: state.alerts.filter(a => ids.has(a.cowId) && !a.acknowledged),
    treatments: state.treatments.filter(t => ids.has(t.cowId) && t.status === 'Ongoing')};
}
export function validateCow(cow, cows, existingId) {
  if (!cow.tag?.trim() || !cow.name?.trim()) return 'Cow tag and name are required.';
  if (cows.some(c => c.id !== existingId && c.farmId === cow.farmId && c.tag.toLowerCase() === cow.tag.trim().toLowerCase())) return 'This cow tag already exists in this farm.';
  if (!Number.isFinite(+cow.age) || +cow.age < 0 || +cow.age > 40) return 'Enter an age between 0 and 40 years.';
  return '';
}
export const sensorFields = [
  ['cowTemperature','Cow-tag temperature','°C',0,60,0.1],
  ['ax','Accelerometer X','g',-32,32,0.001], ['ay','Accelerometer Y','g',-32,32,0.001], ['az','Accelerometer Z','g',-32,32,0.001],
  ['milkTemperature','Milk temperature','°C',0,100,0.01], ['ph','Milk pH','',0,14,0.01], ['tds','Milk TDS','ppm',0,100000,1],
  ['conductivity','Conductivity (optional reference)','mS/cm',0,100,0.01], ['milkYield','Daily milk yield (manual)','L/day',0,100,0.1]
];
export function validateReading(r) {
  for (const [key,label,,min,max] of sensorFields) {
    if (r[key]===null || r[key]===undefined || r[key]==='') continue;
    if (typeof r[key]==='boolean'||!Number.isFinite(Number(r[key]))||Number(r[key])<min||Number(r[key])>max) return `${label} must be between ${min} and ${max}.`;
  }
  if (r.activity && !['Normal','Reduced','Low','Not assessed'].includes(r.activity)) return 'Select a valid activity level.';
  return '';
}
export function runModelAnalysis(state,cowId) {
  const reading=latest(state,cowId);
  if (!reading) throw new Error('Record milk temperature and pH before running a prediction.');
  const result=predictReading(reading), timestamp=new Date().toISOString();
  const prediction={id:uid(),cowId,riskPercent:Number((result.probability*100).toFixed(2)),riskLevel:result.predictedClass===1?'HIGH':'LOW',
    probability:result.probability,predictedClass:result.predictedClass,timestamp,modelVersion:result.modelVersion,source:'xgboost',inputSource:reading.source,
    featuresUsed:result.featuresUsed,readingId:reading.id,inputs:{...reading}};
  const alert={id:uid(),cowId,type:'Mastitis risk',severity:'High',message:`XGBoost classified this reading as class 1 (assumed mastitis-positive). Score ${(result.probability*100).toFixed(1)}%. Input source: ${reading.source}. Veterinary confirmation is required.`,timestamp,acknowledged:false};
  return {...state,predictions:[prediction,...state.predictions],alerts:result.predictedClass===1?[alert,...state.alerts]:state.alerts};
}
export function csv(rows) {
  return rows.map(row=>row.map(v=>{let s=String(v??''); if (/^[=+\-@\t\r]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}
export function validateBackup(s) {
  if (!s || s.version !== 1) throw new Error('Unsupported backup version.');
  for (const k of ['farms','cows','devices','readings','predictions','alerts','treatments']) {
    if (!Array.isArray(s[k]) || s[k].length > 50000) throw new Error(`Invalid ${k} collection.`);
    const ids = new Set();
    for (const item of s[k]) { if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error(`Invalid or duplicate ${k} ID.`); ids.add(item.id); }
  }
  if (!s.farms.length || !s.settings || typeof s.settings.email!=='string' || typeof s.settings.phone!=='string' || typeof s.settings.name!=='string' || !['en','hi','pa'].includes(s.settings.language) || typeof s.settings.dark!=='boolean') throw new Error('Invalid workspace settings.');
  const farms=new Set(s.farms.map(f=>f.id)), cows=new Set(s.cows.map(c=>c.id));
  if (s.farms.some(f=>typeof f.name!=='string'||typeof f.description!=='string')) throw new Error('Invalid farm.');
  for (const c of s.cows) if (!farms.has(c.farmId) || typeof c.tag!=='string' || typeof c.name!=='string' || typeof c.breed!=='string' || !['Pregnant','Not Pregnant'].includes(c.pregnancy) || typeof c.lactation!=='string' || typeof c.dueDate!=='string' || !Number.isFinite(c.baselineTemp) || c.baselineTemp<0 || c.baselineTemp>60 || !Number.isFinite(c.baselineMilk) || c.baselineMilk<0 || c.baselineMilk>100 || validateCow(c,s.cows,c.id)) throw new Error('Invalid cow record.');
  for (const k of ['devices','readings','predictions','alerts','treatments']) for (const r of s[k]) if (!cows.has(r.cowId)) throw new Error(`Unknown cow in ${k}.`);
  for (const k of ['readings','predictions','alerts']) for (const r of s[k]) if (typeof r.timestamp!=='string'||!Number.isFinite(Date.parse(r.timestamp))) throw new Error(`Invalid timestamp in ${k}.`);
  for (const r of s.readings) if (typeof r.source!=='string' || validateReading(r)) throw new Error('Invalid sensor reading.');
  for (const p of s.predictions) if (typeof p.modelVersion!=='string'||!Number.isFinite(p.riskPercent)||p.riskPercent<0||p.riskPercent>100) throw new Error('Invalid risk score.');
  for (const p of s.predictions) {
    if (p.source==='xgboost' && (!Number.isFinite(p.probability)||p.probability<0||p.probability>1||![0,1].includes(p.predictedClass)||typeof p.inputSource!=='string'||!Array.isArray(p.featuresUsed)||p.featuresUsed.some(f=>typeof f!=='string')||!p.inputs||typeof p.inputs!=='object'||validateReading(p.inputs))) throw new Error('Invalid XGBoost prediction.');
  }
  for (const d of s.devices) if (typeof d.name!=='string'||typeof d.type!=='string'||!['Online','Offline'].includes(d.status)||!Number.isFinite(+d.battery)||+d.battery<0||+d.battery>100) throw new Error('Invalid device.');
  for (const a of s.alerts) if (typeof a.message!=='string'||typeof a.type!=='string'||typeof a.acknowledged!=='boolean') throw new Error('Invalid alert.');
  for (const t of s.treatments) if (typeof t.dosage!=='string'||typeof t.veterinarian!=='string'||typeof t.followUp!=='string'||typeof t.diagnosis!=='string'||typeof t.medicine!=='string'||typeof t.notes!=='string'||!Number.isFinite(Date.parse(t.date))||!['Ongoing','Completed'].includes(t.status)) throw new Error('Invalid treatment.');
  return s;
}
export function assistantReply(question,state,farmId,language='en') {
  const s=farmSummary(state,farmId), q=question.toLowerCase();
  const cow=s.cows.find(c=>q.includes(c.name.toLowerCase()) || q.includes('#'+c.tag));
  if (cow) { const r=latest(state,cow.id),p=predictionFor(state,cow.id); return `${cow.name} #${cow.tag}: ${r?`${r.cowTemperature??'not recorded'} °C, ${r.milkYield??'not recorded'} L/day`:'no readings yet'}. Latest XGBoost score: ${p?p.riskPercent+'% ('+riskLabel(p.riskPercent)+')':'unassessed'}. ${language==='hi'?'यह मॉडल का परिणाम है, बीमारी की पुष्टि नहीं।':'Model scores are not a diagnosis.'}`; }
  if (/milk|doodh|दूध|ਦੁੱਧ/.test(q)) return language==='hi'?`इस फार्म में दर्ज दैनिक दूध: ${s.milk.toFixed(1)} लीटर। कुल गायें: ${s.cows.length}।`:`Recorded daily milk: ${s.milk.toFixed(1)} L across ${s.cows.length} cows. This is the sum of the latest daily reading for each cow.`;
  if (/sensor|device|collar|सेंसर/.test(q)) return `${s.devices.length} demo devices; ${s.devices.filter(d=>d.status==='Offline').length} marked offline. Open Sensors to inspect or edit each device.`;
  if (/risk|check|health|mastitis|जोखिम|जांच/.test(q)) { const names=s.cows.filter(c=>riskLabel(predictionFor(state,c.id)?.riskPercent)==='High').map(c=>c.name+' #'+c.tag); return `${s.high} positive model results, ${s.watch} under observation. ${names.length?'Records to review: '+names.join(', ')+'.':'No positive model results records.'} XGBoost uses milk temperature and pH only; a veterinarian must assess actual health concerns.`; }
  if (/alert|अलर्ट/.test(q)) return `${s.alerts.length} unacknowledged alerts in this farm. Open Alerts to review them.`;
  return language==='hi'?'गाय का नाम, दूध, सेंसर या जोखिम के बारे में पूछें। यह सहायक दर्ज डेटा से जवाब देता है।':'Ask about a cow by name, milk, sensors, alerts, or risk. This local assistant answers from your current farm records; it is not a connected AI model.';
}
