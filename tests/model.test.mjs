import {test} from 'node:test';
import assert from 'node:assert/strict';
import fixtures from '../ml/artifacts/parity-fixtures.json' with {type:'json'};
import {predictRaw,predictReading} from '../src/inference.mjs';
test('JavaScript matches Python XGBoost across all rows and split boundaries',()=>{
 let max=0;for(const row of fixtures){const p=predictRaw(row);max=Math.max(max,Math.abs(p.probability-row.expected));assert.equal(p.predictedClass,row.expected>=.5?1:0);}
 assert.ok(max<1e-6,`Maximum probability difference: ${max}`);console.log(`Parity: ${fixtures.length} cases, max error ${max}`);
});
test('model rejects absent, nonnumeric, and out-of-training-range inputs',()=>{
 for(const ph of [null,undefined,'',NaN,'text',true,20]) assert.throws(()=>predictReading({milkTemperature:36,ph}));
 assert.throws(()=>predictReading({milkTemperature:31.2,ph:6.6}),/outside/);
});
test('prediction depends on milk features, never TDS, activity, or cow identity',()=>{
 const low=predictReading({milkTemperature:35.5,ph:6.6});const high=predictReading({milkTemperature:38.1,ph:7.1});
 assert.equal(low.predictedClass,0);assert.equal(high.predictedClass,1);assert.ok(high.probability>low.probability);
 assert.deepEqual(low,predictReading({milkTemperature:35.5,ph:6.6,tds:5000,ax:8,tag:'different'}));
});
