import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {calculateTrade,validateTrade,CONTRACTS} from '../src/lib/calculations.ts';
const base={symbol:'NQ',tick_size:0.25,point_value:20,direction:'long' as const,status:'closed' as const,entry_price:20000,stop_price:19990,target_price:20030,exit_price:20020,contracts:2,commission:4,fees:2,adjustment:0,adjustment_reason:'',entry_at:'2026-11-05T14:30:00Z',exit_at:'2026-11-05T15:00:00Z'};
test('long trade uses points, quantity, fees and initial planned risk',()=>{
  const r=calculateTrade(base); assert.equal(r.gross,800);assert.equal(r.net,794);assert.equal(r.risk,400);assert.equal(r.plannedRR,3);assert.equal(r.realizedR,1.985);assert.equal(r.points,20);assert.equal(r.ticks,80);assert.equal(r.durationMinutes,30);assert.equal(r.outcome,'Win');
});
test('short reverses direction for profit and loss',()=>{
  assert.equal(calculateTrade({...base,direction:'short',stop_price:20010,target_price:19970,exit_price:19980}).net,794);
  assert.equal(calculateTrade({...base,direction:'short',stop_price:20010,target_price:19970,exit_price:20010}).net,-406);
});
test('each standard futures tick has the specified dollar value',()=>{
  for(const [symbol,tickValue] of Object.entries({NQ:5,MNQ:.5,ES:12.5,MES:1.25,GC:10,MGC:1,CL:10,MCL:1})) {
    const spec=CONTRACTS.find(s=>s.symbol===symbol)!;
    const r=calculateTrade({...base,...spec,entry_price:100,exit_price:100+spec.tick_size,contracts:1,commission:0,fees:0});assert.equal(r.gross,tickValue,symbol);
  }
});
test('exact decimal inputs do not accumulate binary floating point errors',()=>{
  assert.equal(calculateTrade({...base,tick_size:.01,point_value:1000,entry_price:71.15,exit_price:71.18,contracts:3,commission:2.1,fees:.2,adjustment:.1}).net,87.8);
});
test('draft and open entries are excluded from realized results',()=>{
  for(const status of ['open','draft'] as const){const r=calculateTrade({...base,status});assert.equal(r.net,null);assert.equal(r.gross,null);assert.equal(r.realizedR,null);assert.equal(r.outcome,null);assert.equal(r.risk,400);}
});
test('missing values and zero risk produce unavailable results',()=>{
  assert.equal(calculateTrade({...base,exit_price:null}).net,null);
  assert.equal(calculateTrade({...base,stop_price:null}).risk,null);
  assert.equal(calculateTrade({...base,stop_price:base.entry_price}).realizedR,null);
  assert.equal(calculateTrade({...base,contracts:null}).gross,null);
});
test('breakeven includes fees and documented adjustments',()=>{
  const r=calculateTrade({...base,exit_price:20000,adjustment:6,adjustment_reason:'Fee reimbursement'});assert.equal(r.net,0);assert.equal(r.outcome,'Breakeven');
});
test('validation rejects direction, price increments, chronology and undocumented money',()=>{
  assert.equal(validateTrade(base).length,0);
  for(const update of [{stop_price:20010},{target_price:19970},{entry_price:20000.1},{contracts:0},{contracts:1.5},{adjustment:10},{exit_at:'2026-11-05T12:00:00Z'},{commission:-1},{entry_price:NaN}])assert.ok(validateTrade({...base,...update}).length>0,JSON.stringify(update));
});
test('drafts support incomplete records and open trades require execution data',()=>{
  assert.equal(validateTrade({...base,status:'draft',entry_price:null,exit_price:null,contracts:null,entry_at:null,exit_at:null}).length,0);
  assert.ok(validateTrade({...base,status:'open',entry_price:null}).length>0);
  assert.ok(validateTrade({...base,exit_at:null}).length>0);
});
