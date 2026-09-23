import React,{useState} from 'react';
import {ArrowRight,Check,Pause,Play,RotateCcw,Move,Sun,Orbit,CarFront} from 'lucide-react';
import ShowroomScene from './ShowroomScene';
import './garage.css';
const paints=[{color:'#d5ef66',name:'Electric lime',code:'EL-01'},{color:'#f09969',name:'Sunset copper',code:'SC-02'},{color:'#a7bddd',name:'Glacier blue',code:'GB-03'},{color:'#eeeae0',name:'Pearl white',code:'PW-04'},{color:'#ba8be0',name:'Ultraviolet',code:'UV-05'},{color:'#e5524d',name:'Racing red',code:'RR-06'}];
export default function Garage({color,onColorChange,onClose}){
 const [rotating,setRotating]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[lighting,setLighting]=useState('neon'),[view,setView]=useState({kind:'hero',id:0});
 const paint=paints.find(p=>p.color===color)||paints[0];
 function chooseView(kind){setView(v=>({kind,id:v.id+1}));}
 return <div className="showroom">
  <header className="showroom-header"><div><div className="modal-eyebrow"><CarFront size={15}/> SHIFT CUSTOMS <span>/</span> THE SHOWROOM</div><h2 id="modal-title">BUILT TO TURN HEADS<span>.</span></h2></div><span className="showroom-collection">COLLECTION <b>001</b></span></header>
  <div className="showroom-body"><section className="showroom-viewer" aria-label="Interactive car showroom">
   <div className="showroom-model"><span>YOUR CURRENT RIDE</span><strong>458 <em>SPIDER</em></strong><small>360° SHOWROOM VIEW</small></div>
   <ShowroomScene color={color} rotating={rotating} lighting={lighting} view={view}/>
   <div className="showroom-view-options" role="group" aria-label="Camera presets">{[['hero','3/4 VIEW'],['side','SIDE'],['rear','REAR']].map(([key,label])=><button key={key} className={view.kind===key?'active':''} onClick={()=>chooseView(key)} aria-pressed={view.kind===key}>{label}</button>)}</div>
   <div className="showroom-view-controls"><span><Move size={12}/> DRAG TO EXPLORE <b>·</b> SCROLL TO ZOOM</span><div><button onClick={()=>setRotating(!rotating)} aria-label={rotating?'Pause showroom rotation':'Resume showroom rotation'} title={rotating?'Pause rotation':'Resume rotation'}>{rotating?<Pause size={14}/>:<Play size={14}/>}</button><button onClick={()=>chooseView('hero')} aria-label="Reset showroom camera" title="Reset camera"><RotateCcw size={14}/></button></div></div>
   <div className="showroom-lighting" role="group" aria-label="Showroom lighting"><button className={lighting==='neon'?'active':''} aria-pressed={lighting==='neon'} onClick={()=>setLighting('neon')}><Orbit size={12}/> NEON</button><button className={lighting==='studio'?'active':''} aria-pressed={lighting==='studio'} onClick={()=>setLighting('studio')}><Sun size={12}/> STUDIO</button></div>
  </section><aside className="showroom-customize"><div className="paint-heading"><span>01 / PAINTWORK</span><span>06 FINISHES</span></div><h3>MAKE A STATEMENT.</h3><p>The first thing they see.<br/>The last thing they catch.</p><div className="showroom-paints" role="group" aria-label="Car paint finishes">{paints.map(p=><button key={p.color} className={color===p.color?'selected':''} aria-pressed={color===p.color} aria-label={p.name} onClick={()=>onColorChange(p.color)}><span className="paint-chip" style={{'--paint':p.color}}>{color===p.color&&<Check size={16}/>}</span><span>{p.name}</span></button>)}</div><div className="paint-selection"><span className="paint-selection-dot" style={{background:color}}/><div><strong>{paint.name}</strong><span>METALLIC FINISH / {paint.code}</span></div><Check size={14}/></div><div className="showroom-save-note"><span/> PAINT SAVED TO YOUR GARAGE</div><button className="primary showroom-drive" onClick={onClose}>TAKE IT TO THE TRACK <ArrowRight size={18}/></button></aside></div>
  <footer className="showroom-footer"><span><i/> SHOWROOM MODE</span><span>YOUR CAR. YOUR COLOR. YOUR LEGACY.</span><span>SHIFT CUSTOMS <b>///</b></span></footer>
 </div>;
}
