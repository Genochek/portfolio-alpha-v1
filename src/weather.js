import * as THREE from '../vendor/three.module.js';

// Rain occupies fixed eight metre world cells. Only cells beyond the visible rain
// radius are recycled, so walking never drags a curtain of rain through the forest.
export function createWeather(scene,resources,reduced,options={}){
 const {geometries,materials}=resources,ownedGeometry=[],ownedMaterials=[],patched=[];
 const wet={value:0},rainTime={value:0},eye={value:new THREE.Vector3()},cellSize=8,extent=3;
 const root=new THREE.Group();root.name='world-anchored-rain';root.userData.weather='rain';scene.add(root);
 let target=0,amount=0,disposed=false,frozenTime=0,knownMaterialCount=-1;
 function geometry(g){geometries.push(g);ownedGeometry.push(g);return g;}
 function material(m){materials.push(m);ownedMaterials.push(m);return m;}
 const rainMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{wet,rainTime,eye},vertexShader:`
  uniform float rainTime;uniform vec3 eye;attribute float endPoint;varying float distanceToEye;varying float dropEnd;
  void main(){
   vec3 p=position;float height=mod(p.y-rainTime*8.4,24.);p.y=height-3.8-endPoint*.23;
   p.x+=(24.-height)*.026;p.z+=(24.-height)*.012;
   vec4 world=modelMatrix*vec4(p,1.);distanceToEye=length(world.xz-eye.xz);dropEnd=endPoint;
   gl_Position=projectionMatrix*viewMatrix*world;
  }`,fragmentShader:`uniform float wet;varying float distanceToEye;varying float dropEnd;
   void main(){float fade=smoothstep(.5,2.,distanceToEye)*(1.-smoothstep(14.,21.,distanceToEye));
    gl_FragColor=vec4(vec3(.59,.72,.78),wet*fade*.32*(1.-dropEnd*.72));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`}));
 let seed=729184;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=[],ends=[],drops=typeof innerWidth!=='undefined'&&innerWidth<700?32:62;
 for(let i=0;i<drops;i++){const x=random()*cellSize,y=random()*24,z=random()*cellSize;positions.push(x,y,z,x,y,z);ends.push(0,1);}
 const rainGeometry=geometry(new THREE.BufferGeometry());rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));rainGeometry.setAttribute('endPoint',new THREE.Float32BufferAttribute(ends,1));
 const cells=[];for(let i=0;i<(extent*2+1)**2;i++){const mesh=new THREE.LineSegments(rainGeometry,rainMaterial);mesh.frustumCulled=false;root.add(mesh);cells.push({mesh,key:null});}
 function moveDistantCells(camera){
  const x=Math.floor(camera.position.x/cellSize),z=Math.floor(camera.position.z/cellSize),wanted=new Map();
  for(let dz=-extent;dz<=extent;dz++)for(let dx=-extent;dx<=extent;dx++)wanted.set((x+dx)+','+(z+dz),[x+dx,z+dz]);
  const unused=[];for(const cell of cells){if(wanted.has(cell.key))wanted.delete(cell.key);else unused.push(cell);}
  for(const [key,[cx,cz]] of wanted){const cell=unused.pop();cell.key=key;cell.mesh.position.set(cx*cellSize,0,cz*cellSize);cell.mesh.rotation.y=((cx*13+cz*7)&1)?Math.PI:0;
   // Mirroring is around the tile centre so a recycled cell stays inside its cell.
   if(cell.mesh.rotation.y)cell.mesh.position.add(new THREE.Vector3(cellSize,0,cellSize));
  }
 }
 const wetDeformation='transformed=mix(transformed,position,forestWetness*.38);\n transformed.y-=forestWetness*.038*pow(clamp(position.y,0.,1.5),2.);\n#include <project_vertex>';
 function applyWetVertex(shader,deform=true){
  // A custom depth hook may dynamically forward to an already wrapped surface hook.
  if(!shader.vertexShader.includes('uniform float forestWetness;'))shader.vertexShader='uniform float forestWetness;\n'+shader.vertexShader;
  if(deform&&!shader.vertexShader.includes('transformed=mix(transformed,position,forestWetness*.38);'))shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',wetDeformation);
 }
 function patchFoliageDepth(m){
  if(!m?.isMeshDepthMaterial||patched.some(p=>p.material===m))return;
  const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey,originalCacheKey=previousKey.call(m);
  const hook=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.forestWetness=wet;applyWetVertex(shader);};
  m.onBeforeCompile=hook;m.customProgramCacheKey=()=>originalCacheKey+'-forest-rain-depth-v2';m.needsUpdate=true;patched.push({material:m,previous,previousKey,hook});
 }
 function patchMaterial(m){
  if(patched.some(p=>p.material===m)||(!m.isMeshStandardMaterial&&!m.isMeshToonMaterial))return;
  const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey,originalCacheKey=previousKey.call(m);
  const foliage=m.side===THREE.DoubleSide&&(m.map||m.color?.g>m.color?.r*.92);
  const hook=function(shader,renderer){
   previous.call(this,shader,renderer);shader.uniforms.forestWetness=wet;
   if(!shader.fragmentShader.includes('uniform float forestWetness;'))shader.fragmentShader='uniform float forestWetness;\n'+shader.fragmentShader;
   if(m.isMeshStandardMaterial)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,max(.19,roughnessFactor*.34),forestWetness);');
   if(foliage){
    applyWetVertex(shader,Boolean(m.map));
    // A shallow water lens refracts the painted leaf map. Depth sampling stays untouched,
    // including when a custom depth hook forwards dynamically into this surface hook.
    if(m.map&&shader.fragmentShader.includes('#include <opaque_fragment>')&&!shader.fragmentShader.includes('vec3 forestWaterBead(')){
     shader.fragmentShader=`#ifdef USE_MAP
      vec3 forestWaterBead(vec2 uv){
       vec2 beadUV=uv*vec2(11.,19.),tile=floor(beadUV);
       vec2 centre=.23+.54*fract(sin(vec2(dot(tile,vec2(127.1,311.7)),dot(tile,vec2(269.5,183.3))))*43758.5453);
       vec2 bead=(fract(beadUV)-centre)*vec2(1.,.72);
       float present=step(.75,fract(sin(dot(tile,vec2(39.346,11.135)))*47453.5453));
       return vec3(bead,(1.-smoothstep(.055,.17,length(bead)))*present);
      }
      #endif
     `+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec3 forestLensBead=forestWaterBead(vMapUv);
      vec2 forestLensXY=forestLensBead.xy/.17;
      vec3 forestLensNormal=normalize(vec3(forestLensXY,sqrt(max(.001,1.-min(dot(forestLensXY,forestLensXY),1.)))));
      vec3 forestLensRay=refract(vec3(0.,0.,-1.),forestLensNormal,1./1.333);
      vec2 forestRefractedUv=vMapUv+forestLensRay.xy*.004*forestLensBead.z*forestWetness;
      #define vMapUv forestRefractedUv
      #endif
      #include <map_fragment>
      #ifdef USE_MAP
      #undef vMapUv
      #endif`);
    }
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float rainBeads=0.;
     #ifdef USE_MAP
      rainBeads=forestWaterBead(vMapUv).z;
     #endif
     float rainGlint=pow(max(0.,dot(reflect(normalize(-vViewPosition),normal),normalize(vec3(-.35,.8,.5)))),30.);
     outgoingLight*=1.-forestWetness*.1;
     outgoingLight+=vec3(.55,.7,.77)*forestWetness*(rainGlint*.24+rainBeads*(.006+rainGlint*.64));
     #include <opaque_fragment>`);
   }
  };
  m.onBeforeCompile=hook;m.customProgramCacheKey=function(){return originalCacheKey+'-forest-rain-v2';};m.needsUpdate=true;
  patched.push({material:m,previous,previousKey,hook});
 }
 function discoverMaterials(){
  for(const m of materials)patchMaterial(m);
  scene.traverse(object=>{if(!object.customDepthMaterial)return;const surfaces=Array.isArray(object.material)?object.material:[object.material];if(surfaces.some(m=>m?.map&&m.side===THREE.DoubleSide&&(m.isMeshToonMaterial||m.isMeshStandardMaterial)))patchFoliageDepth(object.customDepthMaterial);});
  for(const m of options.foliageDepthMaterials||[])patchFoliageDepth(m);knownMaterialCount=materials.length;
 }
 discoverMaterials();root.visible=false;
 return {
  setRain(enabled){target=enabled?1:0;},
  addFoliageDepthMaterial(material){patchFoliageDepth(material);},
  get amount(){return amount;},
  update(time,dt,camera){
   if(disposed)return;const step=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
   amount=reduced?.matches?target:THREE.MathUtils.damp(amount,target,1.15,step);if(Math.abs(amount-target)<.0005)amount=target;wet.value=amount;
   if(!reduced?.matches)frozenTime=time;rainTime.value=frozenTime;
   root.visible=amount>.001;eye.value.copy(camera.position);if(root.visible)moveDistantCells(camera);
   // Late-created leaf LOD materials receive the same shader wrapper.
   if(knownMaterialCount!==materials.length)discoverMaterials();
  },
  dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const p of patched){if(p.material.onBeforeCompile===p.hook){p.material.onBeforeCompile=p.previous;p.material.customProgramCacheKey=p.previousKey;p.material.needsUpdate=true;}}for(const g of ownedGeometry){g.dispose();const i=geometries.indexOf(g);if(i>=0)geometries.splice(i,1);}for(const m of ownedMaterials){m.dispose();const i=materials.indexOf(m);if(i>=0)materials.splice(i,1);}}
 };
}

const sunIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>';
const rainIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 15a4 4 0 0 1 0-8 5 5 0 0 1 9.4-1A4.5 4.5 0 1 1 18 15H6Zm2 3-1 3m6-3-1 3m6-3-1 3"/></svg>';
let controlNumber=0;
export function createWeatherControl(callback){
 const element=document.createElement('div');element.className='weather-control';element.dataset.weather='sun';
 const panelId='weather-options-'+(++controlNumber);
 element.innerHTML='<button class="weather-trigger" type="button" aria-label="Погода: солнечно. Изменить погоду" aria-expanded="false" aria-controls="'+panelId+'">'+sunIcon+'<span class="weather-trigger-label">Погода</span><span class="weather-chevron" aria-hidden="true">⌄</span></button><div class="weather-options" id="'+panelId+'" role="group" aria-label="Погода в лесу" hidden><span class="weather-caption">Небо над лесом</span><button type="button" data-weather-choice="sun" aria-pressed="true">'+sunIcon+'<span>Солнечно</span><i aria-hidden="true"></i></button><button type="button" data-weather-choice="rain" aria-pressed="false">'+rainIcon+'<span>Дождливо</span><i aria-hidden="true"></i></button></div>';
 const trigger=element.querySelector('.weather-trigger'),panel=element.querySelector('.weather-options'),choices=[...element.querySelectorAll('[data-weather-choice]')];let selected='sun',closeTimer=null,hovered=false;
 function open(value){clearTimeout(closeTimer);panel.hidden=!value;trigger.setAttribute('aria-expanded',String(value));element.classList.toggle('is-open',value);}
 function select(value,notify=true){selected=value==='rain'?'rain':'sun';element.dataset.weather=selected;for(const button of choices)button.setAttribute('aria-pressed',String(button.dataset.weatherChoice===selected));trigger.querySelector('svg').outerHTML=selected==='rain'?rainIcon:sunIcon;trigger.setAttribute('aria-label','Погода: '+(selected==='rain'?'дождливо':'солнечно')+'. Изменить погоду');if(notify)callback(selected==='rain');}
 function deferClose(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!hovered&&!element.contains(document.activeElement))open(false);},160);}
 const onEnter=e=>{if(e.pointerType==='touch')return;hovered=true;open(true);},onLeave=()=>{hovered=false;deferClose();},onFocusOut=()=>deferClose();
 const onTrigger=e=>{if(e.detail===0||matchMedia('(hover:none)').matches)open(panel.hidden);else open(true);},onOutside=e=>{if(!element.contains(e.target))open(false);},onKey=e=>{if(e.key==='Escape'&&!panel.hidden){open(false);trigger.focus();}};
 trigger.addEventListener('click',onTrigger);for(const button of choices)button.addEventListener('click',()=>{select(button.dataset.weatherChoice);open(false);trigger.focus();});document.addEventListener('pointerdown',onOutside);element.addEventListener('keydown',onKey);element.addEventListener('pointerenter',onEnter);element.addEventListener('pointerleave',onLeave);element.addEventListener('focusout',onFocusOut);
 return {element,setRain(value){select(value?'rain':'sun',false);},dispose(){clearTimeout(closeTimer);document.removeEventListener('pointerdown',onOutside);element.remove();}};
}
