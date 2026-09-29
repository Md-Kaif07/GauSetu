import {predictReading} from './inference.mjs';
// Cow identities and sample observations adapted from the two uploaded projects.
export function seedData(now=Date.now()) {
  const farms=[{id:'farm-1',name:'Farm 1',description:'Main Dairy Farm'},{id:'farm-2',name:'Farm 2',description:'North Dairy Unit'},{id:'farm-3',name:'Farm 3',description:'South Dairy Unit'}];
  const values=[['012','Gauri','HF Cross',5,'Pregnant',39.4,8.2,94],['047','Radha','Jersey',4,'Not Pregnant',39.1,10.4,78],['081','Kamdhenu','HF',6,'Pregnant',39,7.8,71],['096','Sita','Jersey Cross',3,'Not Pregnant',38.6,11.2,18],['103','Nandini','HF Cross',5,'Pregnant',38.5,12.1,12],['118','Lakshmi','Gir Cross',4,'Not Pregnant',39.3,6.9,86]];
  const cows=[], readings=[],predictions=[],devices=[],alerts=[];
  farms.forEach((f,fi)=>values.slice(0,fi===0?6:3).forEach((v,i)=>{
    const [tag,name,breed,age,pregnancy,temp,milk,risk]=v, id=`${f.id}-${tag}`;
    cows.push({id,farmId:f.id,tag,name,breed,age,pregnancy,lactation:'2nd Lactation',dueDate:pregnancy==='Pregnant'?'2026-12-18':'',baselineTemp:38.5,baselineMilk:10.1});
    for(let d=14;d>=0;d--){
      const timestamp=new Date(now-d*86400000).toISOString();
      readings.push({id:`r-${id}-${d}`,cowId:id,timestamp,cowTemperature:+(temp+(d?Math.sin(d+i)*0.3:0)).toFixed(1),ax:0.02,ay:0.01,az:0.98,milkTemperature:risk>80?38.10:35.50,conductivity:i===0?5.8:5.2,tds:i===0?620:480,ph:risk>80?7.1:6.6,activity:risk>80?'Reduced':'Normal',milkYield:+(milk+(d?Math.sin(d)*1.1:0)).toFixed(1),source:'demo'});
      const reading=readings.at(-1), result=predictReading(reading);
      predictions.push({id:`p-${id}-${d}`,cowId:id,timestamp,riskPercent:Number((result.probability*100).toFixed(2)),probability:result.probability,predictedClass:result.predictedClass,
        source:'xgboost',inputSource:'demo',modelVersion:result.modelVersion,featuresUsed:result.featuresUsed,readingId:reading.id,inputs:{...reading}});
    }
    for(const [type,prefix] of [['Smart collar','COL'],['Milk analyser','MILK']]) devices.push({id:`d-${id}-${prefix}`,cowId:id,type,name:`${prefix}-${tag}-${fi+1}`,status:i===1&&prefix==='MILK'?'Offline':'Online',battery:i===1&&prefix==='MILK'?18:87-i*4,lastSync:new Date(now-(i===1?7200000:120000)).toISOString()});
    if(risk>=80) alerts.push({id:`a-${id}`,cowId:id,type:'Mastitis risk',severity:'High',message:`${name} has an positive XGBoost result on synthetic sample readings. Review the input source before taking action.`,timestamp:new Date(now-480000).toISOString(),acknowledged:false});
    if(i===1) alerts.push({id:`a-device-${id}`,cowId:id,type:'Sensor offline',severity:'Warning',message:'Milk sensor is marked offline in the demo device inventory.',timestamp:new Date(now-7200000).toISOString(),acknowledged:false});
  }));
  return {version:1,farms,cows,readings,predictions,devices,alerts,treatments:[],settings:{name:'Farm Manager',email:'',phone:'',language:'en',dark:false}};
}
