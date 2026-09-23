import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export default function ShowroomScene({color, rotating, lighting, view}) {
 const mount=useRef(null),live=useRef({color,rotating,lighting,view});
 const [status,setStatus]=useState('loading');
 live.current={color,rotating,lighting,view};
 useEffect(()=>{
  const host=mount.current;let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setStatus('error');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.setClearColor('#0d0e18',1);
  renderer.domElement.setAttribute('aria-label','Drag to orbit around the 3D showroom car. Scroll to zoom.');
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog('#0d0e18',18,38);
  const camera=new THREE.PerspectiveCamera(36,1,.1,60);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=7;controls.maxDistance=16;controls.minPolarAngle=.4;controls.maxPolarAngle=1.42;controls.target.set(0,.9,0);controls.rotateSpeed=.6;controls.zoomSpeed=.7;
  let interacting=false,lastInteraction=0;
  controls.addEventListener('start',()=>{interacting=true;});controls.addEventListener('end',()=>{interacting=false;lastInteraction=performance.now();});
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.05);scene.environment=environment.texture;
  const ambient=new THREE.HemisphereLight('#e8eafa','#16162d',.8);scene.add(ambient);
  const key=new THREE.DirectionalLight('#fff5e9',2.2);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.015;key.shadow.bias=-.0002;scene.add(key);
  const violet=new THREE.SpotLight('#ac67ff',45,25,.65,.7,1.4);violet.position.set(-5,5,-4);violet.target.position.set(0,.8,0);scene.add(violet,violet.target);
  const cyan=new THREE.SpotLight('#5bcfff',35,25,.7,.8,1.4);cyan.position.set(5,4,2);cyan.target.position.set(0,1,0);scene.add(cyan,cyan.target);
  const fill=new THREE.DirectionalLight('#c0d6ff',1.3);fill.position.set(3,3,-5);scene.add(fill);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:'#060710',roughness:.85,metalness:.12,envMapIntensity:.06}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.55,3.66,.18,128),new THREE.MeshStandardMaterial({color:'#10111d',metalness:.8,roughness:.3}));base.position.y=.01;scene.add(base);
  const turntable=new THREE.Group();scene.add(turntable);
  const deckMaterial=new THREE.MeshStandardMaterial({color:'#232633',metalness:.72,roughness:.38,envMapIntensity:.42});
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(3.48,3.48,.22,128),deckMaterial);deck.position.y=.20;deck.receiveShadow=true;deck.castShadow=true;turntable.add(deck);
  const rimMaterial=new THREE.MeshBasicMaterial({color:'#9f6dff',toneMapped:false});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.49,.022,10,192),rimMaterial);rim.rotation.x=-Math.PI/2;rim.position.y=.16;turntable.add(rim);
  const trim=new THREE.Mesh(new THREE.TorusGeometry(3.43,.012,8,192),new THREE.MeshBasicMaterial({color:'#4a4767'}));trim.rotation.x=-Math.PI/2;trim.position.y=.314;turntable.add(trim);
  for(const radius of [2.9,3.17,3.3]){const groove=new THREE.Mesh(new THREE.TorusGeometry(radius,.005,4,128),new THREE.MeshBasicMaterial({color:'#444353',transparent:true,opacity:.45}));groove.rotation.x=-Math.PI/2;groove.position.y=.314;turntable.add(groove);}
  const tickMaterial=new THREE.MeshBasicMaterial({color:'#9290ac',transparent:true,opacity:.6});
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2;const mark=new THREE.Mesh(new THREE.PlaneGeometry(.014,i%8===0?.13:.045),tickMaterial);mark.rotation.x=-Math.PI/2;mark.rotation.z=-a;mark.position.set(Math.sin(a)*3.36,.316,Math.cos(a)*3.36);turntable.add(mark);}
  // A soft pool of light beneath the platform keeps the raised edge readable.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const ctx=glowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(154,92,255,0)');gradient.addColorStop(.72,'rgba(154,92,255,0.22)');gradient.addColorStop(1,'rgba(154,92,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const glowTexture=new THREE.CanvasTexture(glowCanvas);const glow=new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,toneMapped:false}));glow.rotation.x=-Math.PI/2;glow.position.y=-.055;scene.add(glow);

  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext('2d'),shadowGradient=shadowContext.createRadialGradient(64,64,16,64,64,64);
  shadowGradient.addColorStop(0,'rgba(0,0,0,.65)');shadowGradient.addColorStop(.65,'rgba(0,0,0,.4)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,128,128);
  const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(5.7,2.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.318;turntable.add(contactShadow);
  let bodyMaterial,disposed=false,raf,seenView,seenLighting;
  const draco=new DRACOLoader();draco.setDecoderPath('/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);
  const disposeGraph=root=>{const materials=new Set(),geometries=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
  loader.load('/models/ferrari.glb',gltf=>{
   if(disposed){disposeGraph(gltf.scene);return;}
   const car=gltf.scene;
   bodyMaterial=new THREE.MeshPhysicalMaterial({color:live.current.color,metalness:.7,roughness:.22,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.8});
   const glassMaterial=new THREE.MeshPhysicalMaterial({color:'#222b3f',metalness:.12,roughness:.08,transparent:true,opacity:.78,envMapIntensity:1});
   car.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;if(o.name==='body'||o.material?.name==='Body_Color'){o.material.dispose();o.material=bodyMaterial;}if(o.name==='glass'){o.material.dispose();o.material=glassMaterial;}});
   car.rotation.y=-Math.PI/2;car.updateMatrixWorld(true);
   let box=new THREE.Box3().setFromObject(car),size=box.getSize(new THREE.Vector3());car.scale.setScalar(4.9/Math.max(size.x,size.z));car.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(car);const center=box.getCenter(new THREE.Vector3());car.position.set(-center.x,.32-box.min.y,-center.z);turntable.add(car);setStatus('ready');
  },undefined,()=>{if(!disposed)setStatus('error');});
  const applyView=(kind)=>{
   const aspect=host.clientWidth/Math.max(host.clientHeight,1),factor=aspect<1.12?1.15:1;
   const positions={hero:[7,4.3,7],side:[0,2.8,10],rear:[-7,3.5,-7]};
   const p=positions[kind]||positions.hero;camera.position.set(p[0]*factor,p[1]*factor,p[2]*factor);controls.target.set(0,.85,0);turntable.rotation.y=0;controls.update();
  };
  let narrowViewport;
  const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();const narrow=width/height<1.12;if(narrow!==narrowViewport){narrowViewport=narrow;applyView(live.current.view.kind);}};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();applyView('hero');
  const clock=new THREE.Clock();
  const animate=()=>{const dt=Math.min(clock.getDelta(),.05),state=live.current;
   if(state.view!==seenView){seenView=state.view;applyView(state.view.kind);}
   if(state.rotating&&!interacting&&performance.now()-lastInteraction>600)turntable.rotation.y+=dt*.24;
   if(bodyMaterial)bodyMaterial.color.set(state.color);
   if(state.lighting!==seenLighting){seenLighting=state.lighting;const neon=state.lighting==='neon';violet.color.set(neon?'#ac67ff':'#e8e3ff');cyan.color.set(neon?'#5bcfff':'#fff1db');rimMaterial.color.set(neon?'#9f6dff':'#dadcf5');violet.intensity=neon?45:32;cyan.intensity=neon?35:30;glow.visible=neon;ambient.intensity=neon?.8:1.1;}
   controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(animate);
  };animate();
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();draco.dispose();disposeGraph(scene);environment.dispose();room.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="showroom-canvas" ref={mount} role="img" aria-label="Realistic sports car slowly rotating on a raised illuminated showroom platform">{status==='loading'&&<div className="showroom-loading"><span/>ROLLING INTO THE SHOWROOM…</div>}{status==='error'&&<div className="showroom-loading">3D preview unavailable on this device. You can still choose your paint below.</div>}</div>;
}
