import {test} from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const origin=process.env.SHIFT_TEST_URL;
async function client(){const ws=new WebSocket(origin.replace(/^http/,'ws')+'/ws',{origin});const queue=[],waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw);const i=waiters.findIndex(w=>w.predicate(m));if(i>=0){const [w]=waiters.splice(i,1);clearTimeout(w.timer);w.resolve(m);}else queue.push(m);});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});return {ws,send:m=>ws.send(JSON.stringify(m)),next(predicate){const i=queue.findIndex(predicate);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={predicate,resolve,timer:setTimeout(()=>reject(new Error('Timed out waiting for room event')),12000)};waiters.push(w);});}};}
test('real WebSocket race: three clients, start authority, shared clock, batched typing, finish order, rematch', {skip:!origin,timeout:30000},async t=>{
 const a=await client(),b=await client(),c=await client();t.after(()=>[a,b,c].forEach(x=>x.ws.close()));
 a.send({type:'create',name:'Network Host',color:'#ba8aff'});const joined=await a.next(m=>m.type==='joined');
 b.send({type:'join',code:joined.code,name:'Network Friend',color:'#55bbff'});await b.next(m=>m.type==='joined');
 c.send({type:'join',code:joined.code,name:'Network Third',color:'#ff9966'});await c.next(m=>m.type==='joined');
 b.send({type:'start'});assert.equal((await b.next(m=>m.type==='error')).code,'HOST_ONLY');
 for(const x of [a,b,c])x.send({type:'ready',value:true});
 await a.next(m=>m.type==='state'&&m.players.length===3&&m.players.every(p=>p.ready));a.send({type:'start'});
 const states=await Promise.all([a,b,c].map(x=>x.next(m=>m.type==='state'&&m.status==='countdown')));
 assert.equal(new Set(states.map(s=>s.startsAt)).size,1);assert.equal(new Set(states.map(s=>s.passage)).size,1);
 await a.next(m=>m.type==='state'&&m.status==='racing');const passage=states[0].passage,raceId=states[0].raceId;
 a.send({type:'inputs',updates:[{text:passage.slice(0,8),seq:1,raceId},{text:passage.slice(0,10)+'~',seq:2,raceId},{text:passage.slice(0,10),seq:3,raceId}]});
 const synced=await b.next(m=>m.type==='state'&&m.players.find(p=>p.name==='Network Host')?.progress===10/passage.length);assert.equal(synced.players[0].accuracy,91);
 b.send({type:'inputs',updates:[{text:passage,seq:1,raceId}]});const firstFinish=await b.next(m=>m.type==='state'&&m.players.find(p=>p.id===m.you)?.finishedAt);
 // Separate finishes on the server clock; localhost can deliver both within one millisecond.
 await a.next(m=>m.type==='state'&&m.serverTime>firstFinish.players.find(p=>p.id===firstFinish.you).finishedAt);
 a.send({type:'input',text:passage,seq:4,raceId});const secondFinish=await a.next(m=>m.type==='state'&&m.players.find(p=>p.id===m.you)?.finishedAt);
 await c.next(m=>m.type==='state'&&m.serverTime>secondFinish.players.find(p=>p.id===secondFinish.you).finishedAt);
 c.send({type:'input',text:passage,seq:1,raceId});const final=await a.next(m=>m.type==='state'&&m.status==='finished');assert.equal(final.players[1].rank,1);assert.equal(final.players[0].rank,2);assert.equal(final.players[2].rank,3);
 a.send({type:'rematch'});const next=await a.next(m=>m.type==='state'&&m.status==='lobby'&&m.raceId===1);assert.ok(next.players.every(p=>!p.ready&&p.progress===0));
 for(const x of [a,b,c])x.send({type:'leave'});
});
test('production server exposes only built assets; cross-origin WebSockets are rejected',{skip:!origin,timeout:15000},async()=>{
 assert.equal((await fetch(origin+'/api/health')).status,200);
 assert.equal((await fetch(origin+'/server/rooms.mjs')).status,404);
 assert.equal((await fetch(origin+'/package.json')).status,404);
 const html=await (await fetch(origin+'/')).text();assert.ok(html.includes('id="root"'));
 const denied=await new Promise(resolve=>{const ws=new WebSocket(origin.replace(/^http/,'ws')+'/ws',{origin:'https://unrelated.invalid'});ws.once('error',()=>resolve(true));ws.once('open',()=>{ws.close();resolve(false);});});assert.equal(denied,true);
});
