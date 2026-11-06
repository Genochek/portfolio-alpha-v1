import {puddleLayout,insidePuddleClearing} from './puddle-layout.mjs';
import * as THREE from '../vendor/three.module.js';
import {terrainHeight,seeded,clearOfFlowers} from './ecosystem-rules.mjs';
import {grassClumps,leafSurface} from './natural-growth.mjs';


// Reuse only botanical tree groups, never a station's terrain, UI or flower field.
export function createInfoGrove(stations){
 const grove=new THREE.Group();grove.name='info-right-layered-grove';
 const sources=stations.flatMap(station=>station.group.children.filter(o=>o.isGroup&&o.userData.species&&o.getObjectByName('attached-leaves')));
 if(!sources.length)return grove;
 const poses=[[8.2,-6,.93],[12,-11,1.1],[7.4,-16,1.02],[15.5,-19,1.28],[10.7,-25,.95],[16,-30,1.18],[7.8,-35,.88]];
 poses.forEach(([x,z,scale],i)=>{
  const source=sources[(i*5+1)%sources.length],tree=source.clone(true),originals=[];source.traverse(o=>originals.push(o));let childIndex=0;
  tree.traverse(o=>{const original=originals[childIndex++];if(o.isMesh){o.castShadow=false;o.customDepthMaterial=original.customDepthMaterial;if(o.isInstancedMesh){o.instanceMatrix=original.instanceMatrix;o.instanceColor=original.instanceColor;}}});
  tree.name='info-right-grove-tree-'+i;tree.userData.landmark='info-right-grove-tree';tree.position.set(x,-3.35+scale,z);tree.scale.set(scale*(i%2?1.08:1),scale,scale);tree.rotation.set(0,i*1.73+.4,0);
  const swing=tree.getObjectByName('swing');if(swing)swing.visible=false;const hollow=tree.getObjectByName('recessed-hollow-interior');if(hollow)hollow.visible=false;
  grove.add(tree);
 });
 // A few broad young trees overlap the low gaps below the mature crowns.
 for(let i=0;i<3;i++){const scale=.22+i*.035,tree=sources[(i+2)%sources.length].clone(true);tree.name='info-right-sapling-'+i;tree.position.set(7.2+i*3.4,-3.35+scale,-8-i*7);tree.scale.set(scale*1.7,scale,scale*1.5);tree.rotation.y=i*2.1;tree.traverse(o=>{if(o.isMesh)o.castShadow=false;});const swing=tree.getObjectByName('swing');if(swing)swing.visible=false;grove.add(tree);}
 grove.userData.depthLayers=3;return grove;
}

// Ground-level life shares one wind clock and uses instancing rather than one mesh per blade.
export function createEcosystem(scene,stations,resources,wind,passage,reduced){
 const {geometries,materials,textures}=resources,random=seeded(824117),rand=(a,b)=>a+(b-a)*random();
 const G=g=>(geometries.push(g),g),M=m=>(materials.push(m),m),d=new THREE.Object3D(),c=new THREE.Color();
 const cameraWorld={value:new THREE.Vector3()},clock=wind,leafObstacles={value:Array.from({length:8},()=>new THREE.Vector4())},grassCells=[];
 const grassMat=M(new THREE.MeshStandardMaterial({color:0xe0e7be,roughness:.88,side:THREE.DoubleSide}));
 function deform(shader){
  shader.uniforms.lifeTime=clock;shader.uniforms.lifeCamera=cameraWorld;shader.uniforms.lifePassage=passage;shader.uniforms.lifeLeaves=leafObstacles;
  shader.vertexShader='uniform float lifeTime;uniform vec3 lifeCamera;uniform float lifePassage;uniform vec4 lifeLeaves[8];varying float lifeTip;\n'+shader.vertexShader;
  shader.fragmentShader='varying float lifeTip;\n'+shader.fragmentShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 base=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   float phase=base.x*1.7+base.z*.74;
   float gust=pow(.5+.5*sin(lifeTime*.57-base.z*.55+base.x*.17),9.);
   float tip=pow(max(position.y,0.),1.6);
   vec2 delta=base.xz-lifeCamera.xz;
   float nearEye=1.-smoothstep(.2,2.1,length(delta));
   transformed.x+=(sin(lifeTime*1.7+phase)*.13+gust*.36)*tip;
   transformed.x+=sign(delta.x+.001)*nearEye*.8*tip;
   transformed.z+=cos(lifeTime*1.1+phase)*.09*tip;
   transformed.y-=nearEye*.38*tip;
   if(length(delta)<6.){
    vec3 axisX=(modelMatrix*vec4(instanceMatrix[0].xyz,0.)).xyz;
    vec3 axisZ=(modelMatrix*vec4(instanceMatrix[2].xyz,0.)).xyz;
    vec3 push=vec3(0.);
    for(int i=0;i<8;i++){
     vec4 obstacle=lifeLeaves[i];vec2 separation=base.xz-obstacle.xz;
     float contact=(1.-smoothstep(obstacle.w*.58,obstacle.w+.24,length(separation)))*step(.001,obstacle.w);
     contact*=1.-smoothstep(.1,1.25,abs(base.y+position.y*.6-obstacle.y));
     push.xz+=normalize(separation+vec2(.001))*contact*.52;
    }
    transformed.x+=dot(push,axisX)/max(dot(axisX,axisX),.001)*tip;
    transformed.z+=dot(push,axisZ)/max(dot(axisZ,axisZ),.001)*tip;
    transformed.y-=min(length(push)*.24,.24)*tip;
   }
   lifeTip=position.y;`);
  if(shader.fragmentShader.includes('#include <color_fragment>'))shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(vec3(.50,.65,.36),vec3(1.15,1.12,.78),clamp(lifeTip,0.,1.));');
 }
 grassMat.onBeforeCompile=deform;
 const depth=M(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}));
 depth.onBeforeCompile=shader=>{deform(shader);};
 function bladeGeometry(rows){const g=G(new THREE.BufferGeometry()),p=[],uv=[],ix=[];for(let row=0;row<=rows;row++){const t=row/rows,w=.029*Math.pow(Math.sin((t*.94+.03)*Math.PI),.55)*(1-t*.8);for(let side=0;side<3;side++){const u=side-1;p.push(u*w+Math.pow(t,2)*.48,t-.22*Math.pow(t,3),Math.sin(t*2)*.08+(1-Math.abs(u))*.012);uv.push(side/2,t);}if(row<rows)for(let side=0;side<2;side++){const a=row*3+side;ix.push(a,a+1,a+3,a+1,a+4,a+3);}}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
 const blade=bladeGeometry(7),midBlade=bladeGeometry(3),farBlade=bladeGeometry(2);
 const dirt=document.createElement('canvas');dirt.width=dirt.height=512;const ctx=dirt.getContext('2d');ctx.fillStyle='#455d32';ctx.fillRect(0,0,512,512);
 for(let i=0;i<15000;i++){ctx.fillStyle=['#273f2688','#77905155','#9ba46133','#20351e77'][i%4];ctx.beginPath();ctx.ellipse(rand(0,512),rand(0,512),rand(.4,5),rand(.3,3),rand(0,6.28),0,6.28);ctx.fill();}
 for(let row=0;row<24;row++){ctx.strokeStyle=row%2?'#9ba96c24':'#273f2644';ctx.lineWidth=rand(1,4);ctx.beginPath();for(let x=0;x<=512;x+=8){const y=row*22+Math.sin(x*.022+row)*7;if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 const soil=new THREE.CanvasTexture(dirt);soil.colorSpace=THREE.SRGBColorSpace;soil.wrapS=soil.wrapT=THREE.RepeatWrapping;soil.repeat.set(8,10);textures.push(soil);
 const earthMat=M(new THREE.MeshStandardMaterial({map:soil,color:0x8b9d68,roughness:1}));
 const stoneMat=M(new THREE.MeshStandardMaterial({color:0x8c9178,roughness:1})),stone=G(new THREE.IcosahedronGeometry(1,1));
 const flowerMat=M(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.78,side:THREE.DoubleSide,vertexColors:false}));
 const petal=G(new THREE.SphereGeometry(1,7,5)),stemGeo=G(new THREE.CylinderGeometry(.012,.019,1,5));
 const stemMat=M(new THREE.MeshStandardMaterial({color:0x497536,roughness:1})),heartMat=M(new THREE.MeshStandardMaterial({color:0xf2b733,roughness:.65}));
 const smallPetal=(()=>{const g=G(new THREE.BufferGeometry()),p=[],uv=[],ix=[];for(let i=0;i<=10;i++){const t=i/10,w=Math.pow(Math.sin(t*Math.PI),.65)*.48;for(let j=0;j<=4;j++){const x=j/4*2-1;p.push(x*w,t,.17*Math.sin(t*Math.PI)+x*x*.12);uv.push(j/4,t);}if(i<10)for(let j=0;j<4;j++){const a=i*5+j;ix.push(a,a+5,a+1,a+1,a+5,a+6);}}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;})();
 const bellGeo=G(new THREE.LatheGeometry(Array.from({length:11},(_,i)=>{const t=i/10;return new THREE.Vector2(.12+Math.sin(t*Math.PI*.6)*.8,-t);}),10));
 const critters=[],moths=[],spiders=[],birds=[],drifters=[],wisps=[];
 const wingShape=new THREE.Shape();wingShape.moveTo(0,0);wingShape.bezierCurveTo(.08,.20,.30,.25,.21,.05);wingShape.bezierCurveTo(.31,-.10,.11,-.16,0,0);const wingGeo=G(new THREE.ShapeGeometry(wingShape,12)),wingMaterials=[M(new THREE.MeshStandardMaterial({color:0xe6cea2,roughness:.8,side:THREE.DoubleSide})),M(new THREE.MeshStandardMaterial({color:0xcab9db,roughness:.8,side:THREE.DoubleSide}))];
 flowerMat.onBeforeCompile=shader=>{shader.uniforms.lifeTime=clock;shader.vertexShader='uniform float lifeTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(lifeTime*1.3+instanceMatrix[3].x*.6+instanceMatrix[3].z)*.035*position.y;');};
 function instances(geo,mat,poses,parent,shadow=true){const mesh=new THREE.InstancedMesh(geo,mat,poses.length);poses.forEach((p,i)=>{d.position.set(...p.p);d.rotation.set(...(p.r||[0,0,0]));d.scale.set(...p.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);if(p.color){c.set(p.color);mesh.setColorAt(i,c);}});mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;}

 const mossMaterial=M(new THREE.MeshStandardMaterial({color:0x617942,roughness:1}));
 const understoryMaterial=M(new THREE.MeshStandardMaterial({color:0x73954d,roughness:.93,side:THREE.DoubleSide}));
 const fernLeaf=G(new THREE.SphereGeometry(1,5,3));
 const silhouetteCanvas=document.createElement('canvas');silhouetteCanvas.width=512;silhouetteCanvas.height=512;
 const forestInk=silhouetteCanvas.getContext('2d');
 // An original transparent tree atlas; irregular crowns fade naturally at each outer edge.
 for(let tree=0;tree<17;tree++){const x=18+tree*29+rand(-10,10),top=rand(25,170),width=rand(24,53);forestInk.fillStyle='#172d25';forestInk.beginPath();forestInk.moveTo(x-3,512);forestInk.lineTo(x-1,top);forestInk.lineTo(x+2,top);forestInk.lineTo(x+7,512);forestInk.fill();
  for(let j=0;j<31;j++){const y=top+rand(10,250),spread=width*(.35+.65*(y-top)/250);forestInk.beginPath();forestInk.ellipse(x+rand(-spread,spread),y,rand(12,29),rand(13,29),rand(0,6.28),0,6.28);forestInk.fill();}
 }
 const edgeFade=forestInk.createLinearGradient(0,0,512,0);edgeFade.addColorStop(0,'rgba(255,255,255,0)');edgeFade.addColorStop(.12,'white');edgeFade.addColorStop(.88,'white');edgeFade.addColorStop(1,'rgba(255,255,255,0)');forestInk.globalCompositeOperation='destination-in';forestInk.fillStyle=edgeFade;forestInk.fillRect(0,0,512,512);forestInk.globalCompositeOperation='source-over';
 const silhouetteTexture=new THREE.CanvasTexture(silhouetteCanvas);silhouetteTexture.colorSpace=THREE.SRGBColorSpace;textures.push(silhouetteTexture);
 const silhouettePlane=G(new THREE.PlaneGeometry(22,20));
 const silhouetteMaterials=[0x6a816e,0x738873,0x7e907e].map(color=>M(new THREE.MeshBasicMaterial({map:silhouetteTexture,color,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:false,fog:true})));
 function addUnderstory(parent,id,rr){
  const foliage=[];
  // Fern fans, low shrubs and saplings overlap along the edges, leaving flower heads clear.
  for(let plant=0;plant<(innerWidth<700?46:78);plant++){const side=plant%2?1:-1,x=side*rr(4.6,11.4),z=rr(-18,4),y=terrainHeight(x,z),height=rr(.3,1.7),fronds=5+Math.floor(rr(0,4));
   for(let j=0;j<fronds;j++){const angle=j/fronds*6.283+rr(-.2,.2),length=height*rr(.65,1.1);for(let k=0;k<5;k++){const t=(k+1)/5;foliage.push({p:[x+Math.cos(angle)*length*t*.55,y+Math.sin(t*Math.PI*.7)*height*.65,z+Math.sin(angle)*length*t*.55],r:[Math.cos(angle)*.5,angle,Math.sin(angle)*.5],s:[length*(1-t*.65)*.19,.025+height*.018,length*.24],color:new THREE.Color().setHSL(rr(.23,.34),rr(.3,.58),rr(.2,.39)).getHex()});}}
  }
  const ferns=instances(fernLeaf,understoryMaterial,foliage,parent,false);ferns.name='layered-fern-understory';
  const backdrop=new THREE.Group();backdrop.name='forest-silhouette-layers';backdrop.userData.silhouetteLayers=3;parent.add(backdrop);
  for(let layer=0;layer<3;layer++)for(const side of [-1,1]){const screen=new THREE.Mesh(silhouettePlane,silhouetteMaterials[layer]);screen.position.set(side*(18+layer*6),1.4+layer*.5,-45-layer*17);screen.rotation.y=-side*.35;screen.scale.set(1.2+layer*.18,.6+layer*.06,1);screen.name='fixed-forest-silhouette-'+layer;screen.renderOrder=-2;backdrop.add(screen);}
 }
 const silkMaterial=M(new THREE.LineBasicMaterial({color:0xc4d0b6,transparent:true,opacity:.24,depthWrite:false}));
 const birdMaterial=M(new THREE.MeshBasicMaterial({color:0x2f493f,side:THREE.DoubleSide,fog:true}));
 const birdShape=new THREE.Shape();birdShape.moveTo(0,0);birdShape.quadraticCurveTo(.23,.13,.48,-.045);birdShape.quadraticCurveTo(.19,.045,0,-.04);birdShape.closePath();const birdWing=G(new THREE.ShapeGeometry(birdShape,5));
 const spiderBodyMaterial=M(new THREE.MeshStandardMaterial({color:0x52604b,roughness:.85}));
 function addSmallLife(parent,id,rr){
  for(let i=0;i<3;i++){const group=new THREE.Group(),base=new THREE.Vector3((i%2?1:-1)*rr(2.9,5.8),rr(.5,2.5),rr(-14,-3));
   const body=new THREE.Mesh(petal,spiderBodyMaterial);body.scale.set(.035,.052,.028);group.add(body);const legs=[];for(let j=0;j<8;j++){const side=j%2?1:-1,h=(Math.floor(j/2)-1.5)*.018;legs.push(0,h,0,side*.065,h+.035,0,side*.065,h+.035,0,side*.095,h-.025,0);}
   const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(legs,3));group.add(new THREE.LineSegments(geo,silkMaterial));parent.add(group);
   const threadGeo=G(new THREE.BufferGeometry());threadGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,-1,0],3));const thread=new THREE.Line(threadGeo,silkMaterial);thread.position.copy(base);thread.frustumCulled=false;parent.add(thread);spiders.push({group,thread,base,phase:id*.8+i*2.3,travel:rr(.7,1.8)});group.position.copy(base);group.position.y-=.7;
  }
  for(let i=0;i<3;i++){const group=new THREE.Group(),wings=[];for(const side of [-1,1]){const wing=new THREE.Mesh(birdWing,birdMaterial);wing.scale.x=side;group.add(wing);wings.push(wing);}group.scale.setScalar(rr(.25,.48));const base=new THREE.Vector3(rr(-12,12),rr(10,17),rr(-32,-15));group.position.copy(base);parent.add(group);birds.push({group,wings,base,phase:id+i*3});}
  for(let i=0;i<5;i++){const group=new THREE.Group(),filaments=[];for(let j=0;j<7;j++){const a=j/7*6.283;filaments.push(0,-.07,0,Math.cos(a)*.07,.04,Math.sin(a)*.07);}filaments.push(0,-.07,0,0,-.15,0);const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(filaments,3));group.add(new THREE.LineSegments(geo,silkMaterial));const base=new THREE.Vector3(rr(-7,7),rr(-1.7,3),rr(-15,2));group.position.copy(base);parent.add(group);drifters.push({group,base,phase:id+i*1.7});}
  // Fine wind traces are small world-space curves, with no enclosing transparent planes.
  for(let i=0;i<2;i++){const points=[];for(let j=0;j<22;j++){const t=j/21;points.push(new THREE.Vector3(t*1.7,Math.sin(t*Math.PI)*.045,Math.sin(t*4)*.13));}const geo=G(new THREE.BufferGeometry().setFromPoints(points)),material=M(new THREE.LineBasicMaterial({color:0xc8dab5,transparent:true,opacity:.04,depthWrite:false})),group=new THREE.Line(geo,material),base=new THREE.Vector3(rr(-6,5),rr(-2,.5),rr(-13,0));group.position.copy(base);parent.add(group);wisps.push({group,base,material,phase:id+i*4});}
  const pollen=[];for(let i=0;i<(innerWidth<700?22:45);i++)pollen.push(rr(-9,9),rr(-2.5,4),rr(-17,3));const geo=G(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(pollen,3));const pollenMaterial=M(new THREE.PointsMaterial({color:0xc4cd8b,size:.018,transparent:true,opacity:.36,depthWrite:false})),group=new THREE.Points(geo,pollenMaterial),base=new THREE.Vector3();parent.add(group);drifters.push({group,base,phase:id*1.3});
 }
 function populate(parent,id,portfolio=false){
  const rng=seeded(2931+id*9329),rr=(a,b)=>a+(b-a)*rng();
  const terrain=G(new THREE.PlaneGeometry(19,20,32,36)),a=terrain.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=-a.getY(i)-6;a.setXYZ(i,x,terrainHeight(x,z),z);}terrain.computeVertexNormals();
  const land=new THREE.Mesh(terrain,earthMat);land.receiveShadow=true;parent.add(land);
  const poses=[],rocks=[],stems=[],petals=[],bells=[],hearts=[];
  const grassPlan=grassClumps(2931+id*9329,innerWidth<700?(id===53?750:500):(id===53?1600:1000)),flowerClearances=[...(parent.userData.heads||[])];
  for(const leaf of grassPlan){const x=leaf.x,z=leaf.z;
   const pathX=Math.sin(z*.31+id*.6)*1.5+.7;if(Math.abs(x-pathX)<.27+Math.sin(z*.9)*.09&&leaf.clump%7!==0)continue;
   {const p={p:[x,terrainHeight(x,z)-.02+leaf.rise,z],r:[rr(-.15,.15),leaf.yaw,leaf.lean*.18],s:[leaf.width,leaf.height,1],color:new THREE.Color().setHSL(leaf.hue,rr(.44,.67),leaf.light).getHex()};poses.push(p);}
  }
  // Loose gravel is rooted in the moss and follows a narrow winding foot trail.
  for(let i=0;i<300;i++){const z=rr(-15.5,3.5),pathX=Math.sin(z*.31+id*.6)*1.5+.7,x=i<220?pathX+rr(-.55,.55)*rr(.3,1):rr(-9,9),size=rr(.022,.13);rocks.push({p:[x,terrainHeight(x,z)-size*.12,z],r:[rr(-1,1),rr(0,6),rr(-1,1)],s:[size*rr(1,1.8),size*rr(.5,.8),size],color:new THREE.Color().setHSL(.17,rr(.08,.19),rr(.23,.4)).getHex()});}
  for(let i=0;i<6;i++){const x=(i%2?1:-1)*rr(4.8,8.5),z=rr(-15,2),size=rr(.48,1.28);rocks.push({p:[x,terrainHeight(x,z)-size*.28,z],r:[rr(-.3,.3),rr(0,6),rr(-.3,.3)],s:[size*rr(1.1,1.7),size*.85,size],color:new THREE.Color().setHSL(.23,rr(.2,.38),rr(.23,.35)).getHex()});const cap=new THREE.Mesh(stone,mossMaterial);cap.position.set(x,terrainHeight(x,z)+size*.24,z);cap.scale.set(size*1.04,size*.25,size*.9);cap.rotation.y=rr(0,6);cap.receiveShadow=true;parent.add(cap);}
  addUnderstory(parent,id,rr);
  instances(stone,stoneMat,rocks,parent).name='buried-gravel-and-mossy-boulders';
  // Six silhouettes, per-bloom colour variation; each head and its solid stem share a pivot.
  const palettes=[['#fff2b2','#fff5df','#f9d4b8'],['#e9b4ec','#dc8dc8','#c3a7f4'],['#f9ce5f','#ef9b52','#ffdd82'],['#bdddfb','#d1c5ff','#f5d6ee'],['#f8f2da','#ffe6dc','#d4edce'],['#a8c9ee','#c4afed','#ebbedc']];
  for(let cluster=0;cluster<19;cluster++){
   const species=(cluster+id)%6,bx=rr(-7,7),bz=rr(-14,2.5);
   for(let f=0;f<3+Math.floor(rng()*6);f++){
    const x=bx+rr(-.6,.6),z=bz+rr(-.65,.65),h=rr(.25,.86),y=terrainHeight(x,z),s=rr(.045,.10),tint=new THREE.Color(palettes[species][Math.floor(rng()*3)]).offsetHSL(rr(-.035,.035),rr(-.08,.08),rr(-.07,.06)).getHex();
    if(!clearOfFlowers([x,y+h,z],s*1.8,parent.userData.leafVolumes||[]))continue;
    flowerClearances.push({x,y:y+h,z,r:s*2+.1});
    stems.push({p:[x,y+h/2,z],r:[0,0,rr(-.12,.12)],s:[1,h,1]});
    if(species===3||species===5){
     for(let k=0;k<4;k++){const aa=k*2.4;bells.push({p:[x+Math.cos(aa)*.08,y+h-k*.12,z+Math.sin(aa)*.08],r:[.2,aa,.3],s:[s,s*1.6,s],color:tint});}
    }else{
     const n=[12,7,5,8,6,5][species]+Math.floor(rng()*3);for(let k=0;k<n;k++){const aa=k/n*6.283,rad=s*(species===0?1.2:1);petals.push({p:[x+Math.cos(aa)*rad*.06,y+h+Math.sin(aa)*rad*.035,z+Math.sin(aa)*rad*.06],r:[-1.2+rr(-.12,.12),0,aa+rr(-.1,.1)],s:[s*(species===0?.55:1.1),s*rr(1.5,2.3),s],color:tint});}
     hearts.push({p:[x,y+h+.025,z],s:[s*.48,s*.36,s*.48]});
    }
   }
  }
  // Short grass along the near sightline lets the wet trail remain visible
  // without removing the dense cover on either side.
  for(const pose of poses){const x=pose.p[0],z=pose.p[2];if(z>-5&&(Math.abs(x)<1.15||(z>-.5&&Math.abs(x-1.9)<1.15))){pose.s[1]*=id===53?.62:.22;pose.s[0]*=id===53?1.1:.85;}}
  const waterClearings=puddleLayout(id);
  function safeBlade(p){if(insidePuddleClearing(p.p[0],p.p[2],waterClearings))return false;const v=new THREE.Vector3(.2*p.s[1],.43*p.s[1],0).applyEuler(new THREE.Euler(...p.r)).add(new THREE.Vector3(...p.p));return clearOfFlowers(v.toArray(),p.s[1]*.57,flowerClearances);}
  // Four metre cells allow local detail without drawing every blade at full resolution.
  const cells=new Map();for(const pose of poses){if(!safeBlade(pose))continue;const key=Math.floor((pose.p[0]+10)/4)+','+Math.floor((pose.p[2]+18)/4);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(pose);}
  for(const [key,cell] of cells){const [cx,cz]=key.split(',').map(Number),root=new THREE.Group();root.position.set(cx*4-8,0,cz*4-16);parent.add(root);const local=cell.map(p=>({...p,p:[p.p[0]-root.position.x,p.p[1],p.p[2]-root.position.z]}));
   const near=instances(blade,grassMat,local,root,false),mid=instances(midBlade,grassMat,local.filter((_,i)=>i%2===0),root,false),far=instances(farBlade,grassMat,local.filter((_,i)=>i%3===0),root,false);near.customDepthMaterial=mid.customDepthMaterial=far.customDepthMaterial=depth;near.name='grass-cell-near';mid.name='grass-cell-mid';far.name='grass-cell-far';mid.visible=far.visible=false;grassCells.push({root,near,mid,far,world:new THREE.Vector3()});
  }
  instances(stemGeo,stemMat,stems,parent,false);instances(smallPetal,flowerMat,petals,parent,false);instances(bellGeo,flowerMat,bells,parent,false);instances(petal,heartMat,hearts,parent,false);
  // An anthill, sheltered mushrooms and a ladybird provide quiet discoveries close to ground.
  const mound=new THREE.Mesh(stone,earthMat);mound.position.set(-2.3,terrainHeight(-2.3,-3),-3);mound.scale.set(.62,.32,.55);mound.receiveShadow=true;mound.castShadow=true;parent.add(mound);
  {for(let i=0;i<3;i++){const moth=new THREE.Group(),wings=[];for(const side of [-1,1]){const pivot=new THREE.Group(),wing=new THREE.Mesh(wingGeo,wingMaterials[(id+i)%2]);wing.scale.x=side;pivot.add(wing);moth.add(pivot);wings.push({pivot,side});}moth.scale.setScalar(.32+rr(0,.2));const base=new THREE.Vector3(rr(-2.3,2.3),rr(-1.7,-.7),rr(-10,-3));moth.position.copy(base);parent.add(moth);moths.push({group:moth,wings,base,phase:id+i*3.4});}}
  const openingMat=M(new THREE.MeshStandardMaterial({color:0x28271a,roughness:1})),opening=new THREE.Mesh(G(new THREE.CircleGeometry(.055,10)),openingMat);opening.rotation.x=-Math.PI/2;opening.position.set(-2.3,mound.position.y+.30,-3);parent.add(opening);
  const mushroomStems=[],mushroomCaps=[];for(let i=0;i<12;i++){const x=-2.3+rr(-.65,.65),z=-3+rr(-.65,.65),y=terrainHeight(x,z),h=rr(.09,.23);mushroomStems.push({p:[x,y+h/2,z],s:[2,h,2]});mushroomCaps.push({p:[x,y+h,z],s:[h*.58,h*.27,h*.58],color:i%3?0xd7ae74:0xd58770});}instances(stemGeo,heartMat,mushroomStems,parent,false);instances(petal,flowerMat,mushroomCaps,parent,false);
  const insect=new THREE.Group(),red=M(new THREE.MeshStandardMaterial({color:id%3===0?0xffce56:0xed5f39,roughness:.43})),black=M(new THREE.MeshStandardMaterial({color:0x1b2520,roughness:.65}));
  const dome=G(new THREE.SphereGeometry(.065,20,12,0,Math.PI*2,0,Math.PI/2)),body=new THREE.Mesh(dome,red);body.scale.set(1,.65,1.35);body.position.y=.008;insect.add(body);
  const spotGeo=G(new THREE.CircleGeometry(.009,12)),normal=new THREE.Vector3(),zAxis=new THREE.Vector3(0,0,1);
  for(let k=0;k<6;k++){const x=(k%2?1:-1)*.025,z=(Math.floor(k/2)-1)*.043,y=Math.sqrt(Math.max(0,1-x*x/(.065*.065)-z*z/(.088*.088)))*.042;const dot=new THREE.Mesh(spotGeo,black);normal.set(x/(.065*.065),y/(.042*.042),z/(.088*.088)).normalize();dot.quaternion.setFromUnitVectors(zAxis,normal);dot.position.set(x,y+.008,z).addScaledVector(normal,.0008);insect.add(dot);}
  const insectRound=G(new THREE.SphereGeometry(1,14,10)),head=new THREE.Mesh(insectRound,black);head.scale.set(.032,.023,.025);head.position.set(0,.019,-.080);insect.add(head);
  const legPositions=[];for(let k=0;k<6;k++){const side=k%2?1:-1,z=(Math.floor(k/2)-1)*.043;legPositions.push(side*.035,.012,z,side*.067,.018,z+.009,side*.067,.018,z+.009,side*.082,-.013,z+.017);}const lg=G(new THREE.BufferGeometry());lg.setAttribute('position',new THREE.Float32BufferAttribute(legPositions,3));insect.add(new THREE.LineSegments(lg,M(new THREE.LineBasicMaterial({color:0x263b2c}))));
  insect.position.set(portfolio?2.6:1.4,portfolio?leafSurface(0,-5)+.026:terrainHeight(1.4,-2)+.025,portfolio?-5:-2);insect.scale.setScalar(portfolio?1.4:1);if(portfolio)insect.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,.32).normalize());parent.add(insect);critters.push({group:insect,base:insect.position.clone(),phase:id*2,perched:portfolio});
  for(let i=0;i<2;i++){const companion=insect.clone(true);companion.position.set(rr(-4,4),0,rr(-11,-2));companion.position.y=terrainHeight(companion.position.x,companion.position.z)+.025;companion.scale.setScalar(rr(.7,1.05));parent.add(companion);critters.push({group:companion,base:companion.position.clone(),phase:id*2+i*4.7+2,perched:false});}
  if(portfolio){const leafP=[],leafU=[],leafI=[];for(let k=0;k<=16;k++){const t=k/16,w=Math.pow(Math.sin(t*Math.PI),.7)*.62;for(let j=0;j<3;j++){const u=j-1;leafP.push(2.6+u*w,leafSurface(u*w,-5.9+t*1.8),-5.9+t*1.8);leafU.push(j/2,t);}if(k<16)for(let j=0;j<2;j++){const a=k*3+j;leafI.push(a,a+3,a+1,a+1,a+3,a+4);}}const leaf=G(new THREE.BufferGeometry());leaf.setAttribute('position',new THREE.Float32BufferAttribute(leafP,3));leaf.setAttribute('uv',new THREE.Float32BufferAttribute(leafU,2));leaf.setIndex(leafI);leaf.computeVertexNormals();const leafMaterial=M(new THREE.MeshStandardMaterial({color:0x99c55c,roughness:.7,side:THREE.DoubleSide}));const perch=new THREE.Mesh(leaf,leafMaterial);perch.castShadow=true;perch.receiveShadow=true;parent.add(perch);}
  addSmallLife(parent,id,rr);
  return parent;
 }
 stations.forEach((s,i)=>populate(s.group,i));
 const portfolio=new THREE.Group();scene.add(portfolio);populate(portfolio,97,true);portfolio.visible=false;
 const info=new THREE.Group();scene.add(info);populate(info,53);info.visible=false;
 // Ground cover continues through the whole listening glade, beyond the old 20m patch.
 // Low broad leaves fill between grass clumps instead of stretching tall blades uniformly.
 {
  const cover=new THREE.Group();cover.name='info-continuous-ground-cover';info.add(cover);
  const rr=seeded(617531),r=(a,b)=>a+(b-a)*rr(),pools=puddleLayout(53);
  const ground=G(new THREE.PlaneGeometry(34,72,48,88)),a=ground.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=-a.getY(i)-28;a.setXYZ(i,x,terrainHeight(x,z)-.035,z);}ground.computeVertexNormals();const soilPatch=new THREE.Mesh(ground,earthMat);soilPatch.receiveShadow=true;cover.add(soilPatch);
  const cells=new Map();for(const p of grassClumps(78193,innerWidth<700?1350:2900)){
   const x=p.x*1.75,z=p.z*3.35-8;if(insidePuddleClearing(x,z,pools))continue;
   const path=Math.sin(z*.31+53*.6)*1.5+.7;if(Math.abs(x-path)<.2)continue;
   const pose={p:[x,terrainHeight(x,z)+p.rise-.02,z],r:[r(-.15,.15),p.yaw,p.lean*.24],s:[p.width*1.18,p.height*.76,1],color:new THREE.Color().setHSL(p.hue,r(.4,.62),p.light*.9).getHex()},key=Math.floor((x+16)/6)+','+Math.floor((z+64)/6);
   if(!cells.has(key))cells.set(key,[]);cells.get(key).push(pose);
  }
  for(const [key,poses] of cells){const [cx,cz]=key.split(',').map(Number),root=new THREE.Group();root.position.set(cx*6-13,0,cz*6-61);cover.add(root);const local=poses.map(p=>({...p,p:[p.p[0]-root.position.x,p.p[1],p.p[2]-root.position.z]}));
   const near=instances(blade,grassMat,local,root,false),mid=instances(midBlade,grassMat,local.filter((_,i)=>i%2===0),root,false),far=instances(farBlade,grassMat,local.filter((_,i)=>i%4===0),root,false);near.customDepthMaterial=mid.customDepthMaterial=far.customDepthMaterial=depth;mid.visible=far.visible=false;grassCells.push({root,near,mid,far,world:new THREE.Vector3()});
  }
  const pos=[],uv=[],ix=[];for(let row=0;row<=5;row++){const t=row/5,w=Math.pow(Math.sin(t*Math.PI),.65)*.55;for(let col=0;col<3;col++){const u=col-1;pos.push(u*w,.09*Math.sin(t*Math.PI)+.05*u*u,t);uv.push(col/2,t);if(row<5&&col<2){const n=row*3+col;ix.push(n,n+3,n+1,n+1,n+3,n+4);}}}
  const leaf=G(new THREE.BufferGeometry());leaf.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));leaf.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));leaf.setIndex(ix);leaf.computeVertexNormals();const rosettes=[];
  for(let i=0;i<(innerWidth<700?1500:3400);i++){const x=r(-15.7,15.7),z=r(-62,5),path=Math.sin(z*.31+53*.6)*1.5+.7;if(Math.abs(x-path)<.25||insidePuddleClearing(x,z,pools))continue;const size=r(.13,.38),count=3+Math.floor(rr()*3),heading=r(0,6.283),tint=new THREE.Color().setHSL(r(.23,.34),r(.35,.6),r(.24,.4)).getHex();
   for(let k=0;k<count;k++){const angle=heading+k/count*6.283+r(-.18,.18);rosettes.push({p:[x,terrainHeight(x,z)+r(.04,.11),z],r:[r(-.18,.18),angle,r(-.12,.12)],s:[size*r(.8,1.2),size,size*r(.9,1.5)],color:tint});}
  }
  instances(leaf,understoryMaterial,rosettes,cover,false).name='info-clover-and-woodland-rosettes';
 }
 const restingTree=stations[1].group.children.find(o=>o.isGroup&&o.getObjectByName('swing'));if(restingTree){const t=restingTree.clone(true);t.position.set(-5,-2.55,-12);t.scale.setScalar(.76);info.add(t);}
 info.add(createInfoGrove(stations));
 info.userData.sportsNetRemoved=true;info.name='forest-listening-nook';
 // Branches rooted in this separate listening nook; the artist corridor is hidden here.
 const branchMat=M(new THREE.MeshStandardMaterial({color:0x647542,roughness:1}));
 for(const side of [-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*4,-3.4,2),new THREE.Vector3(side*3.3,-.2,-1),new THREE.Vector3(side*1.3,2,-4)]);const b=new THREE.Mesh(G(new THREE.TubeGeometry(curve,16,.09,6)),branchMat);b.castShadow=true;portfolio.add(b);}
 const webs=new THREE.Group();portfolio.add(webs);const linePositions=[];
 for(const side of [-1,1]){const cx=side*3.7,cy=.2,cz=-7;for(let k=0;k<9;k++){const a=k/8*Math.PI;linePositions.push(cx,cy,cz,cx+Math.cos(a)*.9,cy+Math.sin(a)*.8,cz);}for(let ring=1;ring<7;ring++)for(let k=0;k<16;k++){const a=k/16*Math.PI,b=(k+1)/16*Math.PI,r=ring/7;linePositions.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8,cz,cx+Math.cos(b)*r,cy+Math.sin(b)*r*.8,cz);}}
 const wg=G(new THREE.BufferGeometry());wg.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));const wm=M(new THREE.LineBasicMaterial({color:0xd9e5d0,transparent:true,opacity:.32}));webs.add(new THREE.LineSegments(wg,wm));
 const spider=new THREE.Group(),spiderMat=M(new THREE.MeshStandardMaterial({color:0xadbca3,roughness:.85}));const sb=new THREE.Mesh(petal,spiderMat);sb.scale.set(.08,.11,.06);spider.add(sb);const legs=[];for(let i=0;i<8;i++){let side=i%2?1:-1,y=(Math.floor(i/2)-1.5)*.04;legs.push(0,y,0,side*.13,y+.08,0,side*.13,y+.08,0,side*.2,y-.03,0);}const lg=G(new THREE.BufferGeometry());lg.setAttribute('position',new THREE.Float32BufferAttribute(legs,3));spider.add(new THREE.LineSegments(lg,wm));spider.position.set(3.3,.45,-.35);portfolio.add(spider);
 return {portfolio,info,soil,setLeafObstacles(obstacles){for(let i=0;i<8;i++){if(obstacles?.[i])leafObstacles.value[i].copy(obstacles[i]);else leafObstacles.value[i].set(0,0,0,0);}},update(time,camera,z,mode){cameraWorld.value.copy(camera.position);portfolio.visible=mode==='portfolio';portfolio.position.z=z-2;info.visible=mode==='info'&&camera.position.y>-3.5;info.position.z=z+10;
  for(const cell of grassCells){cell.root.getWorldPosition(cell.world);const distance=cell.world.distanceTo(camera.position);cell.near.visible=distance<9;cell.mid.visible=distance>=9&&distance<22;cell.far.visible=distance>=22;}
  if(!reduced.matches){
   for(const item of spiders){const t=time*.24+item.phase,drop=.35+(Math.sin(t)*.5+.5)*item.travel;item.group.position.set(item.base.x+Math.sin(t*.8)*.025,item.base.y-drop,item.base.z);const a=item.thread.geometry.attributes.position;a.setY(1,-drop);a.needsUpdate=true;}
   for(const item of birds){const t=time*.13+item.phase;item.group.position.set(item.base.x+Math.sin(t)*3,item.base.y+Math.sin(t*1.3)*.35,item.base.z+Math.cos(t)*1.4);item.group.rotation.y=Math.cos(t)*.35;item.wings[0].rotation.z=Math.sin(time*2.8+item.phase)*.32;item.wings[1].rotation.z=-Math.sin(time*2.8+item.phase)*.32;}
   for(const item of drifters){const t=time*.19+item.phase;item.group.position.copy(item.base);item.group.position.x+=Math.sin(t*.7)*.7;item.group.position.y+=Math.sin(t*.53)*.32;item.group.position.z+=Math.cos(t*.41)*.5;item.group.rotation.y=t*.3;}
   for(const item of wisps){const t=time*.24+item.phase;item.group.position.copy(item.base);item.group.position.x+=Math.sin(t)*.45;item.group.position.y+=Math.sin(t*.83)*.08;item.group.rotation.y=Math.sin(t*.37)*.12;item.material.opacity=.026+(.5+.5*Math.sin(t))*.032;}
  }
  if(!reduced.matches){for(const b of critters){const t=time*.22+b.phase;b.group.position.x=b.base.x+Math.sin(t)*.22;b.group.position.z=b.base.z+Math.cos(t)*.18;b.group.position.y=b.perched?leafSurface(b.group.position.x-b.base.x,b.group.position.z)+.026:terrainHeight(b.group.position.x,b.group.position.z)+.025;if(b.perched){const x=b.group.position.x-b.base.x,z=b.group.position.z,eps=.001,n=new THREE.Vector3(-(leafSurface(x+eps,z)-leafSurface(x-eps,z))/(2*eps),1,-(leafSurface(x,z+eps)-leafSurface(x,z-eps))/(2*eps)).normalize();b.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-t));}else b.group.rotation.y=-t;}spider.position.set(3.7,.45+Math.sin(time*.53)*.065,-7);}
  if(!reduced.matches)for(const m of moths){const t=time*.42+m.phase;m.group.position.copy(m.base).add(new THREE.Vector3(Math.sin(t)*.42,Math.sin(t*1.3)*.17,Math.cos(t)*.35));m.group.rotation.set(-.3,Math.sin(t)*.6,Math.sin(t*.7)*.2);for(const w of m.wings)w.pivot.rotation.y=w.side*(.3+Math.sin(time*12+m.phase)*.8);}
 }};
}
