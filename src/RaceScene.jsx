import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default function RaceScene({ progress, running, color, solo, colors, activeCount }) {
  const mount = useRef(null), live = useRef({ progress, running, color, solo, colors, activeCount });
  const [error, setError] = useState(false), [loaded, setLoaded] = useState(false);
  live.current = { progress, running, color, solo, colors, activeCount };
  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setError(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#0c0d20', 30, 65);
    const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
    camera.position.set(10, 12, 23); camera.lookAt(0, 0, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(); const env = pmrem.fromScene(room, .04);
    scene.environment = env.texture;
    scene.add(new THREE.HemisphereLight('#ffffff', '#37305d', 1.1));
    const light = new THREE.DirectionalLight('#d9e6ff', 2.5);
    light.position.set(-5, 14, 7); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -20; light.shadow.camera.right = 20;
    light.shadow.camera.top = 18; light.shadow.camera.bottom = -18; light.shadow.bias = -.001;
    scene.add(light);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(150, 19), new THREE.MeshStandardMaterial({ color: '#0b0c17', roughness: .65, metalness: .35, envMapIntensity: .18 }));
    road.rotation.x = -Math.PI / 2; road.position.y = -.015; road.receiveShadow = true; scene.add(road);
    const markings = new THREE.Group(); scene.add(markings);
    const lineMat = new THREE.MeshBasicMaterial({ color: '#6671a5', transparent: true, opacity: .35 });
    for (let x = -60; x <= 60; x += 4) for (const z of [-2.2, 2.2]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .055), lineMat);
      line.rotation.x = -Math.PI/2; line.position.set(x,.005,z); markings.add(line);
    }
    for (const z of [-6.8, 6.8]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(150,.085), lineMat);
      line.rotation.x = -Math.PI/2; line.position.set(0,.006,z); scene.add(line);
    }
    const grid = new THREE.GridHelper(150, 180, '#4b5147', '#363c33'); grid.position.y = -.01; 
    const neonMat = new THREE.MeshBasicMaterial({color:'#834fff'});
    for(const z of [-6.65,6.65]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(150,.045,.11),neonMat);rail.position.set(0,.08,z);scene.add(rail);
      for(let x=-45;x<45;x+=3){const edge=new THREE.Mesh(new THREE.BoxGeometry(.6,.045,.35),new THREE.MeshBasicMaterial({color:z<0?'#3ba8ce':'#55349a'}));edge.position.set(x,.06,z+.35);scene.add(edge);}
    }
    const rimLight=new THREE.PointLight('#9958ff',100,25);rimLight.position.set(-3,4,-5);scene.add(rimLight);
    const blueLight=new THREE.PointLight('#33caff',60,20);blueLight.position.set(4,3,6);scene.add(blueLight);
    const cars = [], materials = [], wheels = [];
    let disposed = false;
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
    loader.load('/models/ferrari.glb', gltf => {
      if (disposed) return;
      [0,1,2].forEach((index) => {
        const car = gltf.scene.clone(true);
        const body = new THREE.MeshPhysicalMaterial({ color: index===0 ? live.current.color : index===1 ? '#aa79f5' : '#5faed7', metalness: .75, roughness: .22, clearcoat: 1, clearcoatRoughness: .12 });
        materials.push(body);
        car.traverse(obj => {
          if (obj.isMesh) {
            obj.castShadow = true; obj.receiveShadow = true;
            if (obj.name==='body' || obj.material?.name==='Body_Color') obj.material = body;
            if (obj.name==='glass') obj.material = new THREE.MeshPhysicalMaterial({ color:'#18221d', metalness:.3, roughness:.1, transparent:true, opacity:.83 });
          }
          if (['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].includes(obj.name)) wheels.push(obj);
        });
        car.rotation.y = -Math.PI/2; car.scale.setScalar(1.55);
        car.position.set(index===0 ? -2 : index===1 ? 1.8 : -2.8, 0, index===0 ? 4.3 : index===1 ? 0 : -4.3);
        scene.add(car); cars.push(car);
      });
      setLoaded(true);
    }, undefined, () => { if (!disposed) setError(true); });
    const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width,height); camera.aspect=width/height; camera.position.z=width<600?32:23; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    // Offscreen cars should not compete with the typing surface for GPU time.
    let visible=true, raf, lastFrame=0;
    const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});
    visibility.observe(host);
    function frame(time) {
      raf=requestAnimationFrame(frame);
      if (!visible || document.hidden) {lastFrame=0;return;}
      if (lastFrame && time-lastFrame < 1000/30-1) return;
      const dt=lastFrame?Math.min((time-lastFrame)/1000,.1):1/30, state=live.current;
      lastFrame=time;
      if (state.running) { markings.position.x = (markings.position.x - dt*12) % 4; wheels.forEach(w=>w.rotation.x-=dt*18); }
      cars.forEach((car,i) => {
        const target = state.activeCount !== undefined ? -5 + (state.progress[i] || 0) * 13 : state.progress[i] > 0 ? -5 + state.progress[i] * 13 : i===0 ? -2 : i===1 ? 1.8 : -2.8;
        car.position.x += (target-car.position.x)*Math.min(dt*3,1);
        car.visible = state.activeCount !== undefined ? i < state.activeCount : i===0 || !state.solo;
      });
      if(materials[0]) materials[0].color.set(state.color);
      if(state.colors) materials.forEach((material, i) => { if(state.colors[i]) material.color.set(state.colors[i]); });
      renderer.render(scene,camera);
    }
    raf=requestAnimationFrame(frame);
    return () => {
      disposed=true; cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect(); draco.dispose();
      scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(v=>v.dispose());}});
      env.dispose(); room.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="scene" ref={mount} role="img" aria-label="Three realistic 3D sports cars on a three-lane race track">{!loaded && <div className="scene-loading">{error ? '3D rendering unavailable on this device. Your typing race is still ready.' : 'Preparing your cars…'}</div>}</div>;
}
