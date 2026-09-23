import React, { forwardRef, memo, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createCaretMotion } from './caretMotion';
import './typing.css';

const TypingSurface = memo(forwardRef(function TypingSurface({ text, value, onChange, disabled, label }, ref) {
 const field = useRef(null), viewport = useRef(null), words = useRef(null), caret = useRef(null);
 const geometry = useRef({positions:[],lineHeight:0,maxScroll:0}), nodes = useRef([]), motion = useRef(null), idleTimer = useRef(null);
 const [focused, setFocused] = useState(false);
 const hint = useId();
 useImperativeHandle(ref, () => field.current, []);

 function positionCaret(snap=false) {
  const {positions,lineHeight,maxScroll} = geometry.current;
  const index = Math.min(field.current?.selectionStart ?? 0, text.length);
  const point = positions[index];
  if (!point) return;
  motion.current?.move({x:point.x, y:point.y+lineHeight*.16, scroll:Math.max(0,Math.min(point.y-lineHeight,maxScroll))},snap);
 }
 function paintInput() {
  const input = field.current;
  if (!input) return;
  // React owns the fixed passage; only changed character classes are written here.
  // There are no geometry/style reads in this input path.
  nodes.current.forEach((node,i) => {
   const state = i<input.value.length ? (input.value[i]===text[i] ? ' is-correct' : ' is-error') : '';
   const selected = i>=input.selectionStart && i<input.selectionEnd ? ' is-selected' : '';
   const next = `flow-letter${state}${selected}`;
   if (node.className!==next) node.className=next;
  });
  positionCaret();
 }
 useLayoutEffect(() => {
  let alive = true;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.current = createCaretMotion({reducedMotion:()=>preference.matches,paint:({x,y,scroll})=>{
   words.current.style.transform=`translate3d(0,${-scroll}px,0)`;
   caret.current.style.transform=`translate3d(${x}px,${y-scroll}px,0)`;
  }});
  const measure = () => {
   if (!alive) return;
   const base=words.current.getBoundingClientRect();
   const letters=[...words.current.querySelectorAll('[data-letter]')];
   const lineHeight=parseFloat(getComputedStyle(words.current).lineHeight);
   geometry.current={positions:letters.map(letter=>{
    const rect=letter.getBoundingClientRect();
    return {x:rect.left-base.left,y:rect.top-base.top};
   }),lineHeight,maxScroll:Math.max(0,words.current.offsetHeight-lineHeight*3)};
   nodes.current=letters.slice(0,-1);
   caret.current.style.height=`${lineHeight*.68}px`;
   paintInput(); positionCaret(true);
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(viewport.current);
  document.fonts?.ready.then(measure);
  document.fonts?.addEventListener('loadingdone',measure);
  preference.addEventListener('change',measure);
  return () => {
   alive=false; observer.disconnect(); motion.current.dispose();
   document.fonts?.removeEventListener('loadingdone',measure);
   preference.removeEventListener('change',measure);
   clearTimeout(idleTimer.current);
  };
 }, [text]);
 useLayoutEffect(() => { paintInput(); }, [value]);
 const letters = useMemo(() => {
  let index=0;
  return (text.match(/\S+\s*|\s+/g)||[]).map((word,wordIndex)=><span className="flow-word" key={wordIndex}>{[...word].map(char=><span data-letter="" key={index++} className="flow-letter">{char}</span>)}</span>);
 }, [text]);
 function focusEnd() {
  if (disabled) return;
  field.current.focus({preventScroll:true});
  field.current.setSelectionRange(field.current.value.length,field.current.value.length);
  paintInput();
 }
 function change(event) {
  caret.current.classList.add('is-moving');
  clearTimeout(idleTimer.current);
  idleTimer.current=setTimeout(()=>caret.current?.classList.remove('is-moving'),450);
  paintInput();
  onChange(event);
 }
 return <div className={`typing-surface ${focused?'is-focused':''} ${disabled?'is-disabled':'is-enabled'}`}>
  <div className="flow-viewport" ref={viewport} onMouseDown={event=>{event.preventDefault();focusEnd();}} onClick={focusEnd}>
   <div className="flow-words" ref={words} aria-label="Text to type">{letters}<span data-letter="" className="flow-end">&#8203;</span></div>
   <span className="flow-caret" ref={caret} aria-hidden="true"/>
  </div>
  <textarea ref={field} className="flow-input" aria-label={label} aria-describedby={hint} value={value} onChange={change} onSelect={paintInput} disabled={disabled} maxLength={text.length} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" inputMode="text" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPaste={event=>event.preventDefault()} onDrop={event=>event.preventDefault()}/>
  {!disabled&&!focused&&<button className="flow-focus" onClick={focusEnd}>Click to focus <span>and find your flow</span></button>}
  <span className="flow-sr" id={hint}>Type the passage exactly, including punctuation. Use Backspace to correct errors. Your race clock continues if you leave this field.</span>
 </div>;
}));
export default TypingSurface;
