import * as THREE from '../vendor/three.module.js';
import {createFilmPass} from './effects.js';
import {paintWordmark} from './lettering.js';
import {createLandmarks} from './landmarks.js';
import {createForestTree} from './trees.js';
import {createLeafContacts} from './leaf-contacts.js';
import {createForestDepth} from './forest-depth.js';
import {createLeafReflections} from './leaf-reflections.js';
import {decorateInfoOak} from './info-focal.js';
import {createPuddles} from './puddles.js';
import {createWeather,createWeatherControl} from './weather.js';
import {routeOffset} from './journey-path.mjs';
import {createSky} from './sky.js';
import {createEcosystem} from './ecosystem.js';
import {clearOfFlowers} from './ecosystem-rules.mjs';

// All botanical geometry and textures are original, generated locally.
export function createGarden(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!context)throw new Error('WebGL2 unavailable');renderer = new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:false,powerPreference:'high-performance'}); }
  catch { document.querySelector('#scene-status').hidden=false; return {travel:()=>Promise.resolve(),setView(){},setScroll(){},dispose(){}}; }
  host.append(renderer.domElement);
  renderer.setClearColor(0x394c3e);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFShadowMap;
  const film=createFilmPass(renderer);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x92c5c0);scene.fog=null;
  const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100);
  camera.position.set(0,-1.75,8);
  scene.add(new THREE.HemisphereLight(0xc9e8f0,0x173d2b,.48));
  const sun=new THREE.DirectionalLight(0xffe6a6,3.8);sun.position.set(-12,15,-31);sun.castShadow=true;sun.shadow.mapSize.setScalar(innerWidth<700?2048:4096);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-12;sun.shadow.camera.far=65;sun.shadow.bias=-.0004;sun.shadow.normalBias=.012;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight(0xa1bfe8,.25);fill.position.set(5,3,8);scene.add(fill);
  const backlight=new THREE.PointLight(0xf6e1ba,42,38,1.4);backlight.position.set(-3,5,-12);scene.add(backlight);
  let seed=9271;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  const rand=(a,b)=>a+(b-a)*random();
  const textures=[],geometries=[],materials=[];
  const wordCanvas=document.createElement('canvas');wordCanvas.width=2048;wordCanvas.height=512;
  const wordTexture=new THREE.CanvasTexture(wordCanvas);wordTexture.colorSpace=THREE.SRGBColorSpace;wordTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(wordTexture);
  const wordGeo=new THREE.PlaneGeometry(1,1);geometries.push(wordGeo);
  const wordMaterial=new THREE.MeshBasicMaterial({map:wordTexture,transparent:true,alphaTest:.02,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});materials.push(wordMaterial);
  const wordmark=new THREE.Mesh(wordGeo,wordMaterial);wordmark.layers.set(1);scene.add(wordmark);wordmark.position.set(0,2.45,0);document.body.classList.add('scene-wordmark');
  const inkLight={value:0};wordMaterial.onBeforeCompile=shader=>{shader.uniforms.inkLight=inkLight;shader.fragmentShader='uniform float inkLight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.rgb*=.92+.18*sin(vMapUv.x*5.-inkLight*.4);\n#include <opaque_fragment>');};
  function drawWordmark(name){paintWordmark(wordCanvas,name);wordTexture.needsUpdate=true;}
  function texture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;}
  function leafTexture(){
    const c=document.createElement('canvas');c.width=512;c.height=1024;const x=c.getContext('2d');x.scale(2,2);
    x.fillStyle='#95c567';x.fillRect(0,0,256,512);
    // Broad translucent brush strokes, seven pen veins, a drawn contour.
    for(let i=0;i<40;i++){x.strokeStyle=i%3?'#e4e5bb0c':'#426b5d0e';x.lineWidth=rand(5,22);x.beginPath();let xx=rand(0,256);x.moveTo(xx,rand(-80,100));x.bezierCurveTo(xx-14,140,xx+18,340,xx+rand(-15,15),550);x.stroke();}
    x.strokeStyle='#42694e70';x.lineWidth=2.0;x.beginPath();x.moveTo(126,0);x.bezierCurveTo(132,150,122,300,129,512);x.stroke();
    for(let i=0;i<7;i++){const y=35+i*74;for(const side of [-1,1]){x.strokeStyle='#547d6357';x.lineWidth=1.4;x.beginPath();x.moveTo(128,y);x.bezierCurveTo(128+side*35,y-5,128+side*80,y-38,128+side*125,y-63);x.stroke();}}
    for(const side of [0,1]){x.strokeStyle='#355e525e';x.lineWidth=4;x.beginPath();for(let y=0;y<=512;y+=12){const xx=side?253+Math.sin(y*.03)*1.2:3+Math.sin(y*.025)*1.3;if(y===0)x.moveTo(xx,y);else x.lineTo(xx,y);}x.stroke();}
    return texture(c);
  }
  const leafMap=leafTexture();
  // Soft hand-painted tonal steps, rather than glossy PBR shading.
  const rampData=new Uint8Array([20,20,20,255,50,50,50,255,95,95,95,255,160,160,160,255,220,220,220,255,255,255,255,255]);
  const paintRamp=new THREE.DataTexture(rampData,6,1,THREE.RGBAFormat);paintRamp.minFilter=THREE.NearestFilter;paintRamp.magFilter=THREE.NearestFilter;paintRamp.needsUpdate=true;textures.push(paintRamp);
  function leafGeometry(kind=0,detail=1){
    const vertices=[],uv=[],indices=[];const rows=detail===1?16:detail<.3?6:10,cols=detail===1?6:detail<.3?2:4;
    for(let i=0;i<=rows;i++){const t=i/rows;let width=Math.pow(Math.sin(Math.PI*t),kind===1?.82:.72)*(kind===1?.13:.3)*(1+.045*Math.sin(t*17));if(kind===2)width*=1+.22*Math.pow(Math.sin(t*9*Math.PI),3);
      for(let j=0;j<=cols;j++){const s=j/cols*2-1;vertices.push(s*width,t,Math.sin(t*Math.PI)*.085+Math.pow(Math.abs(s),1.6)*.045*Math.sin(t*Math.PI)+s*.012*Math.sin(t*15));uv.push(j/cols,t);}}
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();geometries.push(g);return g;
  }
  const leafGeometries=[leafGeometry(0,.2),leafGeometry(1,.2),leafGeometry(2,.2)];
  const nearLeafGeometries=[leafGeometry(0,innerWidth<700?.4:1),leafGeometry(1,innerWidth<700?.4:1),leafGeometry(2,innerWidth<700?.4:1)];
  const canopyLeaf=leafGeometry(0,.2),canopyNearLeaf=leafGeometry(0,.4);
  const thinLight={value:1};const wind={value:0},gust={value:0},passage={value:0};const sky=createSky(scene,{geometries,materials,textures},wind);
  function windMaterial(color,map=leafMap){
    const m=new THREE.MeshToonMaterial({color,map,gradientMap:paintRamp,side:THREE.DoubleSide});
    m.onBeforeCompile=shader=>{shader.uniforms.gardenThinLight=thinLight;shader.uniforms.gardenTransmission={value:map===leafMap?.085:.48};shader.uniforms.gardenTime=wind;shader.uniforms.gardenGust=gust;shader.uniforms.gardenPassage=passage;
      shader.vertexShader='uniform float gardenTime;uniform float gardenGust;uniform float gardenPassage;varying float gardenEdge;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 gardenOrigin=vec3(0.0);
        #ifdef USE_INSTANCING
          gardenOrigin=instanceMatrix[3].xyz;
        #endif
        float phase=gardenTime*0.68+gardenOrigin.x*0.61+gardenOrigin.z*0.32;
        float wave=sin(phase)*0.065+sin(phase*1.71+gardenOrigin.y)*0.025;
        float passing=exp(-pow((mod(gardenTime*1.9-gardenOrigin.z+gardenOrigin.x*0.7+28.0,42.0)-21.0)/4.0,2.0));
        transformed.x+=(wave+passing*gardenGust*0.16+sign(gardenOrigin.x)*gardenPassage*0.19)*position.y*position.y;
        transformed.z+=cos(phase*0.81)*0.045*position.y;
        float flutter=pow(.5+.5*sin(gardenTime*.47+gardenOrigin.x*.7+gardenOrigin.z),28.0);
        transformed.z+=flutter*sin(gardenTime*7.+gardenOrigin.y)*.13*position.y;
        gardenEdge=pow(abs(uv.x-0.5)*2.0,3.0);`);
      shader.fragmentShader='uniform float gardenThinLight;uniform float gardenTransmission;varying float gardenEdge;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <output_fragment>','#include <output_fragment>');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec3 thinSun=normalize((viewMatrix*vec4(-7.,19.,-38.,0.)).xyz);
        float throughLeaf=pow(max(0.,dot(-normal,thinSun)),.7);
        outgoingLight+=diffuseColor.rgb*throughLeaf*gardenTransmission*gardenThinLight;
        outgoingLight += vec3(0.13,0.17,0.055)*gardenEdge*0.18;
        float gardenRim=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);
        outgoingLight+=vec3(.32,.38,.12)*gardenRim*.24;
        #include <opaque_fragment>`);
    };materials.push(m);return m;
  }
  const leafMat=windMaterial(0xc8efad);leafMat.emissive.set(0x204527);leafMat.emissiveIntensity=.035;
  const leafWindHook=leafMat.onBeforeCompile;const leafDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:leafMap,side:THREE.DoubleSide});leafDepth.onBeforeCompile=shader=>{leafWindHook(shader);};materials.push(leafDepth);
  const twigMaterial=new THREE.MeshToonMaterial({color:0x63754e,gradientMap:paintRamp});materials.push(twigMaterial);
  function petalTexture(){const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#c9cddd');g.addColorStop(.3,'#eee6f1');g.addColorStop(.7,'#fffaf4');g.addColorStop(1,'#f9e8ee');x.fillStyle=g;x.fillRect(0,0,256,512);for(let i=0;i<110;i++){const p=i/109;x.lineWidth=rand(1,5);x.strokeStyle=i%3===0?'#b7959220':'#fffae92a';x.beginPath();x.moveTo(128+rand(-8,8),0);x.bezierCurveTo(128,150,p*256,260,p*256,512);x.stroke();}return texture(c);}
  const petalMap=petalTexture();
  const flowerMaterials=[windMaterial(0xf9efdb,petalMap),windMaterial(0xe4b2a3,petalMap),windMaterial(0xd1bfdc,petalMap)];
  flowerMaterials.forEach((m,i)=>{m.emissive.set([0xf0d5b9,0xdeaeaa,0xc3b4d1][i]);m.emissiveIntensity=.12;});
  // A soft atmospheric opening behind the geometry, not a background photograph.
  function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,248,211,.6)');g.addColorStop(.2,'rgba(228,235,197,.25)');g.addColorStop(1,'rgba(221,235,198,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return texture(c);}
  const glow=glowTexture();const sunMat=new THREE.SpriteMaterial({map:glow,color:0xf4edc8,transparent:true,opacity:.26,depthWrite:false});materials.push(sunMat);
  const halo=new THREE.Sprite(sunMat);halo.position.set(-5,8,-30);halo.scale.set(18,18,1);scene.add(halo);
  const inkHaloMat=new THREE.SpriteMaterial({map:glow,color:0xbca0ff,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(inkHaloMat);const inkHalo=new THREE.Sprite(inkHaloMat);scene.add(inkHalo);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const stations=[],mist=[];
  function makeStation(slot){
    const group=new THREE.Group();scene.add(group);seed=3197+slot*719;
    const lists=[[],[],[]],stems=[];const leafVolumes=[];group.userData.leafVolumes=leafVolumes;
    const heads=Array.from({length:11},(_,f)=>({x:(f%2?1:-1)*rand(1.6,4.3),y:rand(-1.3,1.5),z:rand(-3.1,2),r:rand(.24,.52),species:(slot+f)%4,roll:rand(-1,1)}));
    group.userData.heads=heads;
    function stem(points){for(let i=1;i<points.length;i++)stems.push(...points[i-1],...points[i]);}
    function leaf(kind,p,rotation,scale,tint){const center=new THREE.Vector3(0,scale[1]*.5,0).applyEuler(new THREE.Euler(...rotation)).add(new THREE.Vector3(...p));if(p[1]>1.5&&Math.abs(p[0])<1.1)return;if(clearOfFlowers(center.toArray(),Math.max(...scale)*.8,heads)){lists[kind].push({p,rotation,scale,tint});leafVolumes.push({x:center.x,y:center.y,z:center.z,r:Math.max(...scale)*.6});}}
    // Broad leaves at the edge create a near, middle and far frame.
    for(let side of [-1,1]){
      for(let j=0;j<34;j++){
        const species=Math.floor(random()*3),azimuth=rand(-2,2);const z=rand(-14,3),baseX=side*rand(2.45,6.7),baseY=-3.35,height=rand(3.7,8.6);
        const stemPts=[];
        for(let k=0;k<6;k++)stemPts.push([baseX-side*k*.10,baseY+height*k/5,z-Math.sin(k/5*Math.PI)*.2]);stem(stemPts);
        for(let k=0;k<7;k++){
          const y=baseY+height*Math.pow((k+.2+random()*.7)/8,.75+species*.15),x=baseX-side*(k+1)*.08,len=rand(.38,1.95);
          leaf(species,[x,y,z],[rand(-1.3,1.3),azimuth+k*2.399+rand(-.4,.4),-side*rand(.3,2.1)], [len*rand(.7,1.3),len*rand(.7,1.6),len],rand(.56,1.18));
          if(k%2===0)leaf(0,[x,y+.12,z-.15],[rand(-.6,.5),rand(-.6,.6),side*rand(.4,1.1)],[len*.6,len*.85,len*.7],rand(.65,1.1));
        }
      }
      // Individually articulated fern fronds, not flat textured cards.
      for(let f=0;f<15;f++){
        const bx=side*rand(1.8,6),by=-3.35,bz=rand(-13,2),len=rand(2.8,5),direction=-side*rand(.4,.9);
        const pts=[];
        for(let k=0;k<17;k++){
          const t=Math.max(0,Math.min(1,k/16+rand(-.018,.018))),x=bx+direction*Math.sin(t*1.7)*len*.55,y=by+t*len,z=bz-Math.sin(t*2)*.35;pts.push([x,y,z]);
          if(k>1&&k<16)for(let s of [-1,1]){const l=Math.sin(t*Math.PI)*rand(.25,.8);leaf(1,[x,y+s*rand(.025,.10),z+rand(-.09,.09)],[rand(-.7,.7),rand(-1,1),s*rand(.75,1.35)+direction*.3],[l,l*1.2,l],rand(.75,1.22));}
        }stem(pts);
      }

    }
    // Overhead foliage grows from rooted arching vines, never isolated leaves.
    for(let v=0;v<10;v++){
      const side=v%2?1:-1,z=rand(-15,2),x=side*rand(4.5,6.5);
      const roof=4.8+Math.max(0,-z)*.25;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-3.35,z),new THREE.Vector3(x*.94,2.9,z-.4),new THREE.Vector3(x*.58,roof,z),new THREE.Vector3(-x*.45,roof+.2,z-.8),new THREE.Vector3(-x*.95,3.3,z-1.2),new THREE.Vector3(-x,-3.35,z-1.5)]);
      const geometry=new THREE.TubeGeometry(curve,35,.04,5,false);geometries.push(geometry);group.add(new THREE.Mesh(geometry,twigMaterial));
      for(let k=0;k<18;k++){const t=.19+k*.035,p=curve.getPoint(t),s=rand(.85,1.7);leaf(0,p.toArray(),[rand(-.5,.5),rand(-1,1),Math.PI+side*rand(-.8,.8)],[s,s,s],rand(.58,1.1));}
      if(v%2===0){const anchor=curve.getPoint(.25+random()*.4),depth=rand(1.8,3.8),points=[];for(let j=0;j<=24;j++){const t=j/24,p=anchor.clone().add(new THREE.Vector3(Math.sin(t*6)*.12,-t*depth,.08*Math.sin(t*8)));points.push(p);if(j%3===0&&j>0){const s=rand(.2,.4);leaf(0,p.toArray(),[.3,rand(-1,1),(j%2?1:-1)*1.1],[s,s,s],rand(.7,1));}}const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.012,4,false);geometries.push(g);group.add(new THREE.Mesh(g,twigMaterial));}
    }
    // Near creepers close the upper corners while preserving the central sightline.
    for(const side of [-1,1]){const z=rand(.3,1.3),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*4.8,-3.35,z),new THREE.Vector3(side*4.5,1.4,z),new THREE.Vector3(side*3.9,3.9,z-.2),new THREE.Vector3(side*1.7,5.35,z-.6)]);const g=new THREE.TubeGeometry(curve,22,.028,5,false);geometries.push(g);group.add(new THREE.Mesh(g,twigMaterial));for(let k=0;k<23;k++){const t=.22+k*.033,p=curve.getPoint(t),s=rand(.9,1.55);leaf(0,p.toArray(),[rand(-.4,.4),rand(-.5,.5),side*(k%2?-.9:1.1)+Math.PI],[s,s,s],rand(.6,.95));}}
    // Low planted ground cover fills the space below the wordmark with depth.
    for(let i=0;i<42;i++){const x=rand(-2.7,2.7),z=rand(-15,2),h=rand(.3,1.0);const pts=[];for(let k=0;k<6;k++){const t=k/5,y=-3.35+t*h,xx=x+Math.sin(t*1.8)*h*.3;pts.push([xx,y,z]);if(k>0)for(const side of [-1,1]){const l=Math.sin(t*Math.PI)*h*.48;leaf(1,[xx,y,z],[.1,rand(-.3,.3),side*1.1],[l,l*1.3,l],rand(.65,1.2));}}stem(pts);}
    function instances(list,geo,mat){const mesh=new THREE.InstancedMesh(geo,mat,list.length);list.forEach((l,i)=>{dummy.position.fromArray(l.p);dummy.rotation.set(...l.rotation);dummy.scale.fromArray(l.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setRGB(l.tint,l.tint,l.tint);mesh.setColorAt(i,color);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;}
    lists.forEach((list,i)=>{const lod=new THREE.LOD(),near=new THREE.Group(),far=new THREE.Group();group.add(near);const n=instances(list,nearLeafGeometries[i],leafMat);group.remove(n);near.add(n);n.castShadow=true;n.receiveShadow=true;n.customDepthMaterial=leafDepth;group.remove(near);group.add(far);const f=instances(list,leafGeometries[i],leafMat);group.remove(f);far.add(f);f.castShadow=true;f.customDepthMaterial=leafDepth;f.receiveShadow=true;group.remove(far);lod.addLevel(near,0);lod.addLevel(far,25);group.add(lod);});
    // Each petal is a drawn, asymmetric surface; no spheres or ellipsoid petals.
    const pv=[],pu=[],pi=[],pr=24,ps=14;
    for(let row=0;row<=pr;row++){const t=row/pr;const width=Math.pow(Math.sin(Math.PI*t),.53)*.61;for(let col=0;col<=ps;col++){const s=col/ps*2-1;const x=s*width*(1+.07*Math.sin(t*9+s*3));const y=t*1.35-Math.exp(-s*s*30)*Math.pow(t,9)*.085;const z=.12*Math.sin(t*Math.PI)-.2*t*t+s*s*.17*Math.sin(t*Math.PI)+.018*Math.sin(s*11+t*13)*t;pv.push(x,y,z);pu.push(col/ps,t);}}
    for(let row=0;row<pr;row++)for(let col=0;col<ps;col++){const a=row*(ps+1)+col,b=a+ps+1;pi.push(a,b,a+1,b,b+1,a+1);}
    const petalGeo=new THREE.BufferGeometry();petalGeo.setAttribute('position',new THREE.Float32BufferAttribute(pv,3));petalGeo.setAttribute('uv',new THREE.Float32BufferAttribute(pu,2));petalGeo.setIndex(pi);petalGeo.computeVertexNormals();geometries.push(petalGeo);
    const seedGeo=new THREE.SphereGeometry(.022,5,4);geometries.push(seedGeo);
    const seedMat=new THREE.MeshToonMaterial({color:0xc4a16c,gradientMap:paintRamp});materials.push(seedMat);
    const flowerPetals=[],flowerSeeds=[];
    for(let f=0;f<heads.length;f++){
      const {x,y,z,r,species,roll}=heads[f],side=Math.sign(x);
      const center=new THREE.Vector3(x,y,z);const face=new THREE.Quaternion().setFromEuler(new THREE.Euler(.15+random()*.6,side*-.3,roll));
      stem([[x+side*.25,-3.35,z],[x+side*.14,y*.4,z-.03],[x,y,z]]);
      const q=new THREE.Quaternion(),local=new THREE.Vector3();
      const count=[5,8,12,4][species],palette=[0xffedbd,0xf5b6d1,0xcbb4ec,0xe1efd9,0xffd8be];
      for(let p=0;p<count;p++){const a=p/count*Math.PI*2;local.set(Math.sin(a)*r*.09,Math.cos(a)*r*.09,0).applyQuaternion(face).add(center);q.setFromEuler(new THREE.Euler((species===3?.5:.06)*Math.sin(a),.08*Math.cos(a),-a));q.premultiply(face);flowerPetals.push({p:local.toArray(),q:q.clone(),scale:[r*(species===2?.36:species===3?1.05:rand(.65,.95)),r*rand(.8,1.2),r],tint:new THREE.Color(palette[f%palette.length]).offsetHSL(rand(-.04,.04),rand(-.08,.1),rand(-.07,.07)).getHex()});}
      for(let s=0;s<19;s++){const a=s*2.4,rr=Math.sqrt(s/19)*r*.22;const end=new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr,.045+Math.sin(s)*.025).applyQuaternion(face).add(center);flowerSeeds.push(end);}
    }
    const petalMesh=new THREE.InstancedMesh(petalGeo,flowerMaterials[0],flowerPetals.length);flowerPetals.forEach((p,i)=>{dummy.position.fromArray(p.p);dummy.quaternion.copy(p.q);dummy.scale.fromArray(p.scale);dummy.updateMatrix();petalMesh.setMatrixAt(i,dummy.matrix);color.set(p.tint);petalMesh.setColorAt(i,color);});petalMesh.castShadow=true;petalMesh.receiveShadow=true;group.add(petalMesh);
    const seedMesh=new THREE.InstancedMesh(seedGeo,seedMat,flowerSeeds.length);flowerSeeds.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();seedMesh.setMatrixAt(i,dummy.matrix);});group.add(seedMesh);
    const sg=new THREE.CylinderGeometry(.012,.017,1,5);geometries.push(sg);const stemMesh=new THREE.InstancedMesh(sg,twigMaterial,stems.length/6),axis=new THREE.Vector3(0,1,0),start=new THREE.Vector3(),end=new THREE.Vector3(),delta=new THREE.Vector3();for(let i=0;i<stems.length/6;i++){start.fromArray(stems,i*6);end.fromArray(stems,i*6+3);delta.subVectors(end,start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(axis,delta.clone().normalize());dummy.scale.set(1,delta.length(),1);dummy.updateMatrix();stemMesh.setMatrixAt(i,dummy.matrix);}group.add(stemMesh);
    for(let layer=0;layer<3;layer++){const m=new THREE.SpriteMaterial({map:glow,color:0xa9c4ae,transparent:true,opacity:.065,depthWrite:false});materials.push(m);const fog=new THREE.Sprite(m);fog.position.set(rand(-2,2),rand(-1,2),-5-layer*5);fog.scale.set(12+layer*3,3.5+layer,1);group.add(fog);mist.push({material:m,phase:slot*2+layer});}
    stations.push({group,slot});
  }
  for(let i=0;i<6;i++)makeStation(i);
  const infoBorder=stations[1].group.clone(true);scene.add(infoBorder);infoBorder.visible=false;
  // A real branching tree for the scroll journey from canopy to root system.
  function barkTexture(){const c=document.createElement('canvas');c.width=128;c.height=512;let ctx=c.getContext('2d');ctx.fillStyle='#6b7051';ctx.fillRect(0,0,128,512);for(let i=0;i<400;i++){ctx.strokeStyle=random()>.5?'#303f333b':'#b4b28935';ctx.lineWidth=rand(.4,3);ctx.beginPath();let x=rand(0,128),y=rand(0,512);ctx.moveTo(x,y);ctx.bezierCurveTo(x-7,y+30,x+6,y+65,x+rand(-5,5),y+120);ctx.stroke();}return texture(c);}
  const bark=new THREE.MeshToonMaterial({map:barkTexture(),color:0xa5a78d,gradientMap:paintRamp});materials.push(bark);
  const treeFactory=options=>createForestTree({...options,resources:{geometries,materials,textures},bark,leafMaterial:leafMat,leafDepth,leafGeometry:canopyLeaf,nearLeafGeometry:canopyNearLeaf});
  const tree=treeFactory({seed:9271,type:'oak',swing:true});scene.add(tree);
  const swing=tree.getObjectByName('swing');
  const earthGeo=new THREE.PlaneGeometry(160,160);geometries.push(earthGeo);const soilCanvas=document.createElement('canvas');soilCanvas.width=soilCanvas.height=512;const sx=soilCanvas.getContext('2d');sx.fillStyle='#36463a';sx.fillRect(0,0,512,512);for(let i=0;i<230;i++){sx.fillStyle=['#82916812','#1b2c261c','#a5a47c0c'][i%3];sx.beginPath();sx.ellipse(rand(0,512),rand(0,512),rand(8,45),rand(4,25),rand(0,6),0,Math.PI*2);sx.fill();}const soilMap=texture(soilCanvas);soilMap.wrapS=soilMap.wrapT=THREE.RepeatWrapping;soilMap.repeat.set(20,20);const earthMat=new THREE.MeshToonMaterial({map:soilMap,color:0x82917a,gradientMap:paintRamp});materials.push(earthMat);const earth=new THREE.Mesh(earthGeo,earthMat);earth.rotation.x=-Math.PI/2;earth.position.y=-2.0;tree.add(earth);
  const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=128;const sh=shadeCanvas.getContext('2d'),shadowGradient=sh.createRadialGradient(64,64,4,64,64,64);shadowGradient.addColorStop(0,'#081f1680');shadowGradient.addColorStop(1,'#081f1600');sh.fillStyle=shadowGradient;sh.fillRect(0,0,128,128);const shadeMaterial=new THREE.MeshBasicMaterial({map:texture(shadeCanvas),transparent:true,opacity:.65,depthWrite:false});materials.push(shadeMaterial);const shadeGeometry=new THREE.PlaneGeometry(12,10);geometries.push(shadeGeometry);const shade=new THREE.Mesh(shadeGeometry,shadeMaterial);shade.rotation.x=-Math.PI/2;shade.position.y=-1.035;tree.add(shade);
  const grassGeometry=leafGeometry(1,.4),grass=new THREE.InstancedMesh(grassGeometry,leafMat,350);for(let i=0;i<350;i++){const a=rand(0,Math.PI*2),radius=rand(1.5,7),height=rand(.4,1);dummy.position.set(Math.cos(a)*radius,-1.04,Math.sin(a)*radius);dummy.rotation.set(rand(-.4,.4),a,rand(-.9,.9));dummy.scale.set(height,height,height);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);color.setRGB(rand(.7,1),rand(.8,1.1),rand(.65,.9));grass.setColorAt(i,color);}tree.add(grass);
  tree.visible=false;
  swing.name='swing';
  const stationTrees=[];
  for(const station of stations){const phase=station.slot%3,t=treeFactory({seed:9271+station.slot*173,type:phase===1?'willow':'oak',swing:phase===0});station.group.add(t);stationTrees.push({tree:t,swing:t.getObjectByName('swing'),phase:station.slot});}
  const landmarks=createLandmarks(stationTrees,{geometries,materials,textures},bark,treeFactory);
  // A deliberately open patch in the canopy keeps the sun/sky visible through the leaves.
  const skyMatrix=new THREE.Matrix4(),skyPoint=new THREE.Vector3(),emptyMatrix=new THREE.Matrix4().makeScale(0,0,0);
  for(const station of stations){const zones=station.group.userData.heads.map(f=>({...f,r:f.r*1.75+.12}));station.group.userData.leafVolumes=[];station.group.updateMatrixWorld(true);station.group.traverse(mesh=>{if(!mesh.isInstancedMesh||mesh.material!==leafMat)return;mesh.geometry.computeBoundingSphere();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,skyMatrix);skyPoint.copy(mesh.geometry.boundingSphere.center).applyMatrix4(skyMatrix).applyMatrix4(mesh.matrixWorld);const depth=8-skyPoint.z;if(depth>.2){const x=skyPoint.x/depth,y=(skyPoint.y+1.75)/depth;const radius=mesh.geometry.boundingSphere.radius*Math.max(skyMatrix.elements[0]*skyMatrix.elements[0]+skyMatrix.elements[1]*skyMatrix.elements[1]+skyMatrix.elements[2]*skyMatrix.elements[2],skyMatrix.elements[4]*skyMatrix.elements[4]+skyMatrix.elements[5]*skyMatrix.elements[5]+skyMatrix.elements[6]*skyMatrix.elements[6],skyMatrix.elements[8]*skyMatrix.elements[8]+skyMatrix.elements[9]*skyMatrix.elements[9]+skyMatrix.elements[10]*skyMatrix.elements[10])**.5*mesh.matrixWorld.getMaxScaleOnAxis();const skylight=!mesh.name.startsWith('attached-leaves')&&y>.24+Math.sin(skyPoint.x*1.7+skyPoint.z)*.025&&x<-.10&&x>-.46;if(skylight||!clearOfFlowers(skyPoint.toArray(),radius,zones))mesh.setMatrixAt(i,emptyMatrix);else station.group.userData.leafVolumes.push({x:skyPoint.x,y:skyPoint.y,z:skyPoint.z,r:radius});}}mesh.instanceMatrix.needsUpdate=true;});}
  const forestFloor=new THREE.Mesh(earthGeo,earthMat);forestFloor.rotation.x=-Math.PI/2;forestFloor.position.y=-4.2;scene.add(forestFloor);
  const subterranean=new THREE.Group();scene.add(subterranean);subterranean.visible=false;
  const soilMaterial=new THREE.MeshToonMaterial({map:soilMap,color:0x7c7560,gradientMap:paintRamp,side:THREE.DoubleSide});materials.push(soilMaterial);
  const wallGeometry=new THREE.PlaneGeometry(160,26);geometries.push(wallGeometry);const wall=new THREE.Mesh(wallGeometry,soilMaterial);wall.position.set(0,-10,-7);subterranean.add(wall);
  const ceiling=new THREE.Mesh(earthGeo,soilMaterial);ceiling.rotation.x=Math.PI/2;ceiling.position.y=-3.4;subterranean.add(ceiling);
  const fibers=[];for(let i=0;i<75;i++){const x=rand(-21,21),z=rand(-5,5),length=rand(1.4,7);let previous=new THREE.Vector3(x,-5.06,z);for(let j=1;j<=12;j++){const t=j/12,next=new THREE.Vector3(x+Math.sin(t*4+i)*t*.45,-5.06-t*length,z+Math.sin(t*5+i)*.22);fibers.push(...previous.toArray(),...next.toArray());previous=next;}}
  const fiberGeometry=new THREE.BufferGeometry();fiberGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fibers,3));geometries.push(fiberGeometry);const fiberMaterial=new THREE.LineBasicMaterial({color:0xc5bca4,transparent:true,opacity:.26});materials.push(fiberMaterial);subterranean.add(new THREE.LineSegments(fiberGeometry,fiberMaterial));
  const underLight=new THREE.PointLight(0xa4c7a5,23,30,1.4);underLight.position.set(3,-8,3);subterranean.add(underLight);
  // Background sectors are fixed in the world and recycled outside the view.
  const grove=new THREE.Group();scene.add(grove);
  const trunkGeo=new THREE.CylinderGeometry(.17,.37,16,8);geometries.push(trunkGeo);
  const trunks=new THREE.InstancedMesh(trunkGeo,bark,36),groveLeaves=[],groveBranches=[];
  for(let i=0;i<36;i++){const scale=rand(.75,1.25),x=(i%2?1:-1)*rand(4.5,21),z=rand(-58,-5),top=-3.35+16*scale;dummy.position.set(x,-3.35+8*scale,z);dummy.rotation.set(0,0,rand(-.025,.025));dummy.scale.setScalar(scale);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<10;j++){const a=j*2.399+i,origin=new THREE.Vector3(x,top-rand(1,3),z),end=new THREE.Vector3(x+Math.cos(a)*rand(2.2,4.1),top+rand(-.4,1.5),z+Math.sin(a)*rand(2,4));groveBranches.push(...origin.toArray(),...end.toArray());for(let k=0;k<7;k++)groveLeaves.push({p:origin.clone().lerp(end,.3+k*.1),r:[rand(-1,1),a,rand(-2,2)],size:rand(1.1,2.1)});}
  }grove.add(trunks);
  const distantLeaves=new THREE.InstancedMesh(canopyLeaf,leafMat,groveLeaves.length);groveLeaves.forEach((l,i)=>{dummy.position.copy(l.p);dummy.rotation.set(...l.r);dummy.scale.setScalar(l.size);dummy.updateMatrix();distantLeaves.setMatrixAt(i,dummy.matrix);color.setRGB(.65+random()*.3,.75+random()*.3,.66+random()*.25);distantLeaves.setColorAt(i,color);});grove.add(distantLeaves);
  const branchLines=new THREE.BufferGeometry();branchLines.setAttribute('position',new THREE.Float32BufferAttribute(groveBranches,3));geometries.push(branchLines);const distantWood=new THREE.LineBasicMaterial({color:0x405640});materials.push(distantWood);grove.add(new THREE.LineSegments(branchLines,distantWood));
  const undergrowth=new THREE.InstancedMesh(canopyLeaf,leafMat,3600);for(let i=0;i<3600;i++){const cluster=Math.floor(i/120),rng=cluster*2.399,side=cluster%2?1:-1,cx=side*(7+Math.sin(rng)*3.5),cz=-10-(cluster%15)*3.2,a=rand(0,6.283),r=Math.sqrt(random())*2.1;dummy.position.set(cx+Math.cos(a)*r,-3.1+rand(.1,3.7)*Math.sqrt(Math.max(0,1-r/3)),cz+Math.sin(a)*r);dummy.rotation.set(rand(-1.5,1.5),rand(-3,3),rand(-3,3));dummy.scale.setScalar(rand(.35,.95));dummy.updateMatrix();undergrowth.setMatrixAt(i,dummy.matrix);color.setHSL(rand(.23,.35),rand(.4,.65),rand(.24,.43));undergrowth.setColorAt(i,color);}grove.add(undergrowth);
  const forestSectors=[grove,grove.clone(true),grove.clone(true)];scene.add(forestSectors[1],forestSectors[2]);
  // Soft sun shafts: sparse tapered meshes, never placed over the interface.
  const rayCanvas=document.createElement('canvas');rayCanvas.width=64;rayCanvas.height=256;const rx=rayCanvas.getContext('2d');const rg=rx.createLinearGradient(0,0,64,0);rg.addColorStop(0,'rgba(245,239,202,0)');rg.addColorStop(.5,'rgba(245,239,202,.15)');rg.addColorStop(1,'rgba(245,239,202,0)');rx.fillStyle=rg;rx.fillRect(0,0,64,256);const rayMap=texture(rayCanvas);
  const rayGeo=new THREE.PlaneGeometry(1,1);geometries.push(rayGeo);const rayMat=new THREE.MeshBasicMaterial({map:rayMap,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});materials.push(rayMat);const rays=new THREE.Group();for(let i=0;i<4;i++){const ray=new THREE.Mesh(rayGeo,rayMat);ray.position.set(-7+i*3,4,-19-i*4);ray.scale.set(1.2+i*.4,23,1);ray.rotation.z=-.45;rays.add(ray);}scene.add(rays);
  // Restrained airborne pollen with perspective-correct point sizes.
  const pc=innerWidth<700?65:130,pp=new Float32Array(pc*3);for(let i=0;i<pc;i++){pp[i*3]=rand(-9,9);pp[i*3+1]=rand(-3,8);pp[i*3+2]=rand(-45,6);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));geometries.push(pg);
  const pm=new THREE.PointsMaterial({color:0xe4edb4,size:.085,map:glow,transparent:true,opacity:.78,depthWrite:false,fog:false,blending:THREE.AdditiveBlending});materials.push(pm);const pollen=new THREE.Points(pg,pm);scene.add(pollen);const pollenFields=[pollen,pollen.clone(),pollen.clone()];scene.add(pollenFields[1],pollenFields[2]);
  const up=new Float32Array(50*3);for(let i=0;i<50;i++){up[i*3]=rand(-12,12);up[i*3+1]=rand(-13,-6);up[i*3+2]=rand(-8,8);}const ug=new THREE.BufferGeometry();ug.setAttribute('position',new THREE.BufferAttribute(up,3));geometries.push(ug);subterranean.add(new THREE.Points(ug,pm));
  const life=createEcosystem(scene,stations,{geometries,materials,textures},wind,passage,reduced);
  grass.visible=false;earthMat.map=life.soil;earthMat.color.set(0xb5a379);earthMat.needsUpdate=true;
  const listeningGrove=stations[2].group.clone(true);listeningGrove.rotation.y=.32;listeningGrove.scale.set(1.1,1,1.1);listeningGrove.position.set(0,0,-5);life.portfolio.add(listeningGrove);
  const forestDepth=createForestDepth(scene,{geometries,materials,textures},{treeSources:stationTrees.map(s=>s.tree),infoAnchor:life.info,portfolioAnchor:life.portfolio});
  const oldInfoGrove=life.info.getObjectByName('info-right-layered-grove');if(oldInfoGrove)oldInfoGrove.visible=false;
  const infoFocal=decorateInfoOak(tree,{geometries,materials,textures},reduced);
  const contacts=createLeafContacts(stations,leafMat,nearLeafGeometries);
  // World-space texture coordinates prevent the moving floor from dragging its grain.
  earthMat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 floorWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nfloorWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 floorWorld;\n'+shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, floorWorld.xz*.125 )'));};
  earthMat.customProgramCacheKey=()=> 'world-ground-v1';
  const wallMap=life.soil.clone();wallMap.repeat.set(64,10);textures.push(wallMap);soilMaterial.map=wallMap;soilMaterial.color.set(0xc3a383);soilMaterial.needsUpdate=true;subterranean.children.find(o=>o.isLight).color.set(0xffd3a0);
  const ceilingMap=life.soil.clone();ceilingMap.repeat.set(40,40);textures.push(ceilingMap);const ceilingMaterial=soilMaterial.clone();ceilingMaterial.map=ceilingMap;materials.push(ceilingMaterial);ceiling.material=ceilingMaterial;
  scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material===bark){o.castShadow=true;o.receiveShadow=true;}});
  const puddles=createPuddles(scene,renderer,{geometries,materials,textures},reduced,{stations,portfolioAnchor:life.portfolio,infoAnchor:life.info});
  const weather=createWeather(scene,{geometries,materials,textures},reduced);
  const leafReflections=createLeafReflections(scene,renderer,{geometries,materials,textures},reduced,{leafMaterials:[leafMat,...flowerMaterials],source:puddles.reflectionSource});
  const weatherControl=createWeatherControl(value=>{weather.setRain(value);document.dispatchEvent(new CustomEvent('garden:weather',{detail:{rain:value}}));wake();viewFrames=12;});document.body.append(weatherControl.element);
  let shadowStamp=-Infinity;let infoDive=0,position=0,travelState=null,mode='artists',scroll=0,time=0,last=0,raf=0,lost=false,disposed=false,quality=1,slowFrames=0;
  const infoAnchor=new THREE.Vector3(),infoProjected=new THREE.Vector3(),anchorCamera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100);
  function anchorInfo(){const mobile=innerWidth<700,z=8-position*18;anchorCamera.aspect=innerWidth/innerHeight;anchorCamera.updateProjectionMatrix();anchorCamera.position.set(mobile?-.8:-.6,1.6,z+(mobile?15:10));anchorCamera.lookAt(mobile?1.2:1.7,1.8,z-7);anchorCamera.updateMatrixWorld(true);infoAnchor.set(mobile?-.82:-.76,mobile?.64:.48,0).unproject(anchorCamera).sub(anchorCamera.position).normalize().multiplyScalar(mobile?13:12).add(anchorCamera.position);}
  let infoY=1.6,viewFrames=0,transitionStart=-10000;const look=new THREE.Vector3(0,-.2,-9);
  function size(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.max(1,Math.min(devicePixelRatio,innerWidth<700?1.3:1.6)*quality));renderer.setSize(innerWidth,innerHeight);const drawingSize=renderer.getDrawingBufferSize(new THREE.Vector2());film.resize(drawingSize.x,drawingSize.y);}
  function onResize(){size();if(mode==='info')anchorInfo();wake();}size();addEventListener('resize',onResize);
  const smooth=t=>t*t*t*(t*(t*6-15)+10);
  function render(now){
    raf=0;if(disposed||lost||document.hidden)return;const dt=Math.min((now-last)/1000||.016,.05);last=now;time+=dt;
    wind.value=reduced.matches?0:time;gust.value=reduced.matches?0:.8;passage.value=travelState&&!reduced.matches?Math.pow(Math.sin(Math.min(1,(now-travelState.start)/travelState.duration)*Math.PI),2):0;
    if(travelState){const t=Math.min(1,(now-travelState.start)/travelState.duration);position=THREE.MathUtils.lerp(travelState.from,travelState.to,smooth(t));if(t===1){const done=travelState.resolve;travelState=null;done();}}
    const z=8-position*18;
    landmarks.update(time,passage.value,reduced.matches,camera);
    const route=routeOffset(position),ahead=routeOffset(position+.08);
    for(const s of stations){let index=s.slot+Math.floor((position-s.slot+2.45)/6)*6;s.group.position.z=-index*18;s.group.visible=mode==='artists';s.group.position.y=0;s.group.scale.x=innerWidth<700?.66:1;}
    for(let i=0;i<forestSectors.length;i++){const sector=i+Math.floor((position/3-i+1)/3)*3;forestSectors[i].position.set(0,0,-sector*54);forestSectors[i].visible=!(mode==='info'&&infoDive>.35);}
    infoBorder.visible=mode==='info'&&infoDive<.4;infoBorder.position.set(0,0,z-13);infoBorder.scale.x=innerWidth<700?1.05:1.5;
    subterranean.visible=false;subterranean.position.z=z-7;
    const descent=infoDive;
    
    const mobile=innerWidth<700;
    const wordDistance=6.2+(mobile?1.2:0),visibleHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*wordDistance;
    const wordWidth=Math.min(7.2,visibleHeight*camera.aspect*(mobile?.88:.61));wordmark.scale.set(wordWidth,wordWidth/4,1);wordmark.position.y=-.45;inkLight.value=reduced.matches?0:time;inkHalo.position.copy(wordmark.position);inkHalo.position.z-=.15;inkHalo.scale.set(wordWidth*1.5,wordWidth*.65,1);inkHalo.layers.set(1);inkHalo.visible=wordmark.visible;inkHaloMat.opacity=wordMaterial.opacity*.26;
    if(travelState){const progress=Math.min(1,(now-travelState.start)/travelState.duration);wordMaterial.opacity=progress<.5?Math.max(0,1-progress*4):Math.max(0,(progress-.65)/.35);}else wordMaterial.opacity=1;
    if(mode==='info'){
      tree.scale.setScalar(1.22);
      infoY=1.6-Math.min(1,scroll/.75)*4.35-descent*2.4;camera.position.x=THREE.MathUtils.damp(camera.position.x,mobile?-.8:-.6,3.5,dt);camera.position.y=THREE.MathUtils.damp(camera.position.y,infoY,7,dt);camera.position.z=THREE.MathUtils.damp(camera.position.z,z+(mobile?15:10)-scroll*3,3.5,dt);look.set(mobile?1.2:1.7,camera.position.y+.2,z-7);camera.lookAt(look);tree.position.set(mobile?1.6:2.0,-2.10,z-8.5);
    }else{
      const targetY=mode==='portfolio'?-1.3:-1.75+route.y;camera.position.x=THREE.MathUtils.damp(camera.position.x,mode==='artists'?route.x:0,6,dt);camera.position.y=THREE.MathUtils.damp(camera.position.y,targetY,4,dt);camera.position.z=viewFrames>0?THREE.MathUtils.damp(camera.position.z,z+(mobile?1.2:0),4,dt):z+(mobile?1.2:0);look.lerp(new THREE.Vector3(mode==='artists'?route.x+(ahead.x-route.x)*1.7:0,mode==='portfolio'?-1.1:-.2+route.y*.4,z-17),1-Math.exp(-5*dt));camera.lookAt(look);
    }
    if(reduced.matches&&viewFrames>0){camera.position.x=mode==='info'?-.6:0;camera.position.y=mode==='info'?1.6-Math.min(1,scroll/.75)*4.35-descent*2.4:mode==='portfolio'?-1.3:-1.75;camera.position.z=z+(mode==='info'?(mobile?15:10)-scroll*3:mobile?1.2:0);camera.lookAt(mode==='info'?1.7:0,mode==='info'?camera.position.y+.2:mode==='artists'?-.2:-1.1,z-7);viewFrames=0;}
    if(mode==='info'){camera.updateMatrixWorld(true);infoProjected.copy(infoAnchor).project(camera);const info=document.querySelector('#info');info.style.setProperty('--info-world-x',((infoProjected.x+1)*innerWidth*.5)+'px');info.style.setProperty('--info-world-y',((1-infoProjected.y)*innerHeight*.5)+'px');info.style.setProperty('--info-world-scale',String(Math.min(1.25,(mobile?13:12)/Math.max(1,infoAnchor.distanceTo(camera.position)))));}
    halo.visible=false;rays.visible=false;backlight.position.z=z-18;for(let i=0;i<3;i++){const cell=i+Math.floor((position/3-i+1)/3)*3;pollenFields[i].position.z=-cell*54;}rays.position.z=z;forestFloor.position.z=z-25;forestFloor.visible=mode!=='info';earth.visible=mode==='info';swing.rotation.x=reduced.matches?0:Math.sin(time*.65)*.075;
    stationTrees.forEach(s=>{s.swing.rotation.x=reduced.matches?0:Math.sin(time*.65+s.phase)*.075;s.tree.rotation.z=reduced.matches?0:Math.sin(time*.38+s.phase)*.012;});
    sun.position.set(-7,17,z-30);sun.target.position.set(0,-2,z+8);weather.update(time,dt,camera);thinLight.value=1-weather.amount*.78;sun.intensity=3.8*(1-weather.amount*.8);backlight.intensity=42*(1-weather.amount*.8);sky.update(camera,weather.amount);scene.updateMatrixWorld(true);life.setLeafObstacles(contacts.update(camera,dt,reduced.matches));life.update(time,camera,z,mode);forestDepth.update(camera,z,mode,time,reduced.matches);infoFocal.update(time,weather.amount);leafReflections.update(time,camera,weather.amount,mode);
    mist.forEach(m=>m.material.visible=false);
    pm.opacity=reduced.matches?.65:.6+Math.sin(time*.7)*.17;
    if(!reduced.matches){const a=pg.attributes.position;for(let i=0;i<pc;i++){a.array[i*3]+=(Math.sin(time*.3+i)*.025+.015)*dt;a.array[i*3+1]+=.035*dt;if(a.array[i*3+1]>8)a.array[i*3+1]=-3;}a.needsUpdate=true;}
    const viewMotion=reduced.matches?0:Math.sin(Math.min(1,Math.max(0,(now-transitionStart)/1900))*Math.PI)*.65;
    puddles.update(time,dt,camera,weather.amount,z,mode);leafReflections.capture(camera);host.dataset.wetness=weather.amount.toFixed(3);
    if(!sun.shadow.map||now-shadowStamp>=1000/30){renderer.shadowMap.needsUpdate=true;shadowStamp=now;}
    const stats=film.render(scene,camera,reduced.matches?0:Math.max(passage.value*.8,viewMotion),sun,wind.value,mode==='info'?1-infoDive:1,weather.amount);host.dataset.triangles=stats.triangles;host.dataset.draws=stats.calls;host.dataset.samples=stats.samples;host.dataset.cameraY=stats.cameraY;host.dataset.cameraX=stats.cameraX;host.dataset.cameraZ=stats.cameraZ;host.dataset.renderWidth=stats.width;host.dataset.renderHeight=stats.height;
    if(dt>.035&&!travelState)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    // Resolution remains stable through flight and landing; no arrival-time resize.
    viewFrames=Math.max(0,viewFrames-dt);if(!reduced.matches||travelState||viewFrames>0)raf=requestAnimationFrame(render);
  }
  function wake(){if(!raf&&!lost&&!disposed&&!document.hidden){last=performance.now();raf=requestAnimationFrame(render);}}
  function onVisibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();}
  function releaseGPU(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});sun.shadow.dispose();puddles.releaseGPU();film.dispose();}
  function onLost(e){e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;releaseGPU();if(travelState){position=travelState.to;const done=travelState.resolve;travelState=null;done();}document.querySelector('#scene-status').hidden=false;document.body.classList.remove('scene-wordmark');}
  function onRestored(){lost=false;shadowStamp=-Infinity;size();document.querySelector('#scene-status').hidden=true;document.body.classList.add('scene-wordmark');wake();}
  document.addEventListener('visibilitychange',onVisibility);renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestored);reduced.addEventListener('change',wake);film.warmup(scene,camera).catch(()=>{});wake();
  return {
    travel(direction){if(lost){position+=direction;return Promise.resolve();}if(travelState)return Promise.resolve();return new Promise(resolve=>{travelState={from:position,to:position+direction,start:performance.now(),duration:reduced.matches?70:4800,resolve};wake();});},
    setArtist(name){drawWordmark(name);wordmark.position.z=1.8-18*(travelState?travelState.to:Math.round(position));wake();},
    transition(){transitionStart=performance.now();viewFrames=2.3;wake();},
    setView(view,initial=false){const fromEarth=mode==='info'&&infoDive>.2;mode=view;if(view==='info'){scroll=0;infoDive=0;infoY=1.6;anchorInfo();}if(initial||fromEarth){camera.position.set(view==='info'?-.6:0,view==='info'?1.6:view==='portfolio'?-1.3:-1.75,8-position*18+(view==='info'?(innerWidth<700?15:10):innerWidth<700?1.2:0));look.set(view==='info'?1.7:0,view==='info'?1.8:view==='portfolio'?-1.1:-.2,8-position*18-17);camera.lookAt(look);}tree.visible=view==='info';wordmark.visible=view==='artists';viewFrames=2;wake();},
    setScroll(value){scroll=value;viewFrames=1.8;wake();},
    setInfoState(surface,dive){scroll=surface;infoDive=dive;viewFrames=1.8;wake();},
    dispose(){disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',onVisibility);removeEventListener('resize',onResize);reduced.removeEventListener('change',wake);renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);weatherControl.dispose();leafReflections.dispose();weather.dispose();infoFocal.dispose();forestDepth.dispose();puddles.dispose();contacts.dispose();releaseGPU();renderer.dispose();renderer.domElement.remove();}
  };
}

