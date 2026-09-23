// One animation owns the caret and paragraph scroll, so line changes stay in sync.
// Retargeting never restarts a CSS transition or reads layout on a keystroke.
export function createCaretMotion({paint, requestFrame=requestAnimationFrame, cancelFrame=cancelAnimationFrame, reducedMotion=()=>false}) {
 let current = null, target = null, frame = null, lastTime = null, disposed = false;
 const render = () => paint({...current});
 function tick(time) {
  frame = null;
  if (disposed) return;
  const dt = lastTime === null ? 1000/60 : Math.min(64, Math.max(0,time-lastTime));
  lastTime = time;
  const blend = reducedMotion() ? 1 : 1-Math.exp(-dt/24);
  let moving = false;
  for (const axis of ['x','y','scroll']) {
   current[axis] += (target[axis]-current[axis])*blend;
   if (Math.abs(target[axis]-current[axis]) < .08) current[axis] = target[axis];
   else moving = true;
  }
  render();
  if (moving) frame = requestFrame(tick);
  else lastTime = null;
 }
 return {
  move(next, snap=false) {
   if (disposed) return;
   target = {...next};
   if (!current || snap || reducedMotion()) {
    if (frame !== null) cancelFrame(frame);
    frame = null; lastTime = null; current = {...target}; render();
   } else if (frame === null && Object.keys(target).some(axis=>target[axis]!==current[axis])) {
    frame = requestFrame(tick);
   }
  },
  dispose() { disposed = true; if (frame !== null) cancelFrame(frame); frame = null; }
 };
}
