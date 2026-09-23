import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCaretMotion} from '../src/caretMotion.js';
function harness(reduced=false) {
 let id=0,time=0,last;const frames=new Map();
 const motion=createCaretMotion({paint:value=>last=value,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id),reducedMotion:()=>reduced});
 return {motion,get point(){return last;},get pending(){return frames.size;},step(dt=1000/60){time+=dt;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}};
}
test('caret preserves subpixels, eases toward each key, and never schedules duplicate loops',()=>{
 const h=harness();h.motion.move({x:0,y:0,scroll:0});
 h.motion.move({x:13.8125,y:0,scroll:0});h.step();
 assert.ok(h.point.x>0&&h.point.x<13.8125);
 const prior=h.point.x;h.motion.move({x:27.625,y:0,scroll:0});h.motion.move({x:41.4375,y:0,scroll:0});
 assert.equal(h.pending,1);assert.equal(h.point.x,prior);
 h.step();assert.ok(h.point.x>prior&&h.point.x<41.4375);
 for(let i=0;i<30;i++)h.step();assert.equal(h.point.x,41.4375);assert.equal(h.pending,0);
});
test('line wrapping, backspace, and scrolling follow one animation without snapping',()=>{
 const h=harness();h.motion.move({x:420,y:42,scroll:0});h.motion.move({x:0,y:84,scroll:42});h.step();
 assert.ok(h.point.x>0&&h.point.x<420);assert.ok(h.point.y>42&&h.point.y<84);
 assert.ok(Math.abs(h.point.y-h.point.scroll-42)<1e-9);
 h.motion.move({x:420,y:42,scroll:0});h.step();
 assert.ok(h.point.x<420);for(let i=0;i<30;i++)h.step();assert.deepEqual(h.point,{x:420,y:42,scroll:0});
});
test('reduced motion and resize resets land immediately; unmount cancels work',()=>{
 const reduced=harness(true);reduced.motion.move({x:0,y:0,scroll:0});reduced.motion.move({x:100,y:42,scroll:0});assert.equal(reduced.point.x,100);assert.equal(reduced.pending,0);
 const h=harness();h.motion.move({x:0,y:0,scroll:0});h.motion.move({x:100,y:0,scroll:0});h.motion.move({x:5,y:42,scroll:0},true);assert.equal(h.pending,0);assert.equal(h.point.x,5);
 h.motion.move({x:20,y:42,scroll:0});h.motion.dispose();assert.equal(h.pending,0);h.motion.move({x:0,y:0,scroll:0});assert.equal(h.point.x,5);
});
test('60Hz and 120Hz displays converge at the same rate',()=>{
 const a=harness(),b=harness();for(const h of [a,b]){h.motion.move({x:0,y:0,scroll:0});h.motion.move({x:100,y:0,scroll:0});h.step();}
 for(let i=0;i<6;i++)a.step(1000/60);for(let i=0;i<12;i++)b.step(1000/120);
 assert.ok(Math.abs(a.point.x-b.point.x)<.001);
});
