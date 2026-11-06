import * as THREE from '../vendor/three.module.js';

// A tree is a continuous bole plus overlapping, tapering branch junctions.
// Every ring closes at an identical sample; bark never opens along a UV seam.
export function createForestTree({seed=1,type='oak',resources,bark,leafMaterial,leafDepth,leafGeometry,nearLeafGeometry=leafGeometry,swing=false,hollow=false}) {
 const root=new THREE.Group();root.name=`${type}-tree`;root.userData={species:type,seed,landmark:'organic-tree',hollow};
 let state=seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),rand=(a,b)=>a+(b-a)*random();
 const positions=[],uvs=[],indices=[],leaves=[],rings=[],axis=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
 const birch=type==='birch',willow=type==='willow',height=birch?12.5:willow?11.1:11.7;
 function branch(points,radius,endRadius=.012,steps=12,radial=9,indent=false){
  const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(steps,false),base=positions.length/3;
  for(let i=0;i<=steps;i++){rings.push([base+i*(radial+1),radial]);const t=i/steps,p=curve.getPointAt(t),r=THREE.MathUtils.lerp(radius,endRadius,Math.pow(t,.85));
   for(let j=0;j<=radial;j++){const a=(j%radial)/radial*Math.PI*2;let rr=r*(1+.045*Math.sin(a*3+t*5)+.025*Math.cos(a*5-t*3));
    // The low cavity is sculpted into the front of the solid bole, not a split trunk.
    if(indent){const front=Math.max(0,frames.normals[i].z*Math.cos(a)+frames.binormals[i].z*Math.sin(a));rr-=.34*Math.pow(front,12)*Math.exp(-Math.pow((p.y-.38)/.49,4));}
    const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr);positions.push(v.x,v.y,v.z);uvs.push(j/radial,t*points[0].distanceTo(points.at(-1))*.24);
    if(i<steps&&j<radial){const n=base+i*(radial+1)+j;indices.push(n,n+1,n+radial+1,n+1,n+radial+2,n+radial+1);}
   }
  }
  return curve;
 }
 const v=(x,y,z)=>new THREE.Vector3(x,y,z),leanX=rand(-.38,.38),leanZ=rand(-.28,.28);
 const trunk=branch([v(0,-1,0),v(-.08,1.8,.04),v(leanX,4.8,leanZ),v(leanX+.2,8.1,leanZ-.15),v(leanX-.12,height,leanZ+.2)],birch?.43:.69,.035,48,24,hollow);
 // Buttress roots stay close to the ground; no separated supporting legs.
 for(let i=0;i<6;i++){const a=i*Math.PI/3+rand(-.2,.2);branch([v(Math.cos(a)*.25,-.55,Math.sin(a)*.25),v(Math.cos(a)*.75,-.88,Math.sin(a)*.75),v(Math.cos(a)*1.5,-1.025,Math.sin(a)*1.5)],birch?.15:.24,.018,8,8);}
 function leafSpray(curve,count,width=1){
  // Small connected fans repeat along the wood, including undersides and branch forks.
  const fans=Math.ceil(count/7),euler=new THREE.Euler(),quaternion=new THREE.Quaternion();
  for(let j=0;j<count;j++){
   const fan=Math.floor(j/7),t=Math.min(.99,.14+(fan+.45)/fans*.83+rand(-.025,.025)),p=curve.getPointAt(t);
   p.add(v(rand(-.10,.10)*width,rand(-.07,.07),rand(-.10,.10)*width));
   const azimuth=j*2.399+rand(-.4,.4),tilt=j%7<3?rand(1.75,2.8):j%7<5?rand(1.1,1.7):rand(.35,1.05);
   const direction=v(Math.cos(azimuth)*Math.sin(tilt),Math.cos(tilt),Math.sin(azimuth)*Math.sin(tilt));
   quaternion.setFromUnitVectors(axis,direction);euler.setFromQuaternion(quaternion);leaves.push({p,s:rand(.36,.79)*(birch?.83:1),r:[euler.x,euler.y,euler.z]});
  }
 }
 const limbs=birch?12:11;
 for(let i=0;i<limbs;i++){
  const t=.31+i/(limbs-1)*.54,a=i*2.399+rand(-.38,.38),start=trunk.getPointAt(t),spread=(birch?2.4:3.7)*(1-.4*Math.pow((t-.5)*2,2))*rand(.83,1.13),rise=birch?rand(1.9,3.1):rand(.9,2.1),dir=v(Math.cos(a),0,Math.sin(a));
  const end=start.clone().addScaledVector(dir,spread).add(v(0,rise,0));const main=branch([start.clone().addScaledVector(dir,-.09),start.clone().addScaledVector(dir,spread*.27).add(v(0,.6,0)),start.clone().addScaledVector(dir,spread*.7).add(v(0,rise*.8,0)),end],(birch?.14:.23)*(1-t*.48),.025,16,10);
  for(let j=0;j<5;j++){
   const u=.34+j*.135,s=main.getPointAt(u),angle=a+(j%2?1:-1)*rand(.55,1.15),length=rand(.8,1.55)*(birch?.82:1),e=s.clone().add(v(Math.cos(angle)*length,willow?-.3:rand(.35,.9),Math.sin(angle)*length));
   const twig=branch([s,s.clone().lerp(e,.5).add(v(0,.28,0)),e],.065*(1-u*.5),.008,8,6);leafSpray(twig,willow?25:24);
   for(let k=0;k<2;k++){const s2=twig.getPointAt(.48+k*.34),ang=angle+(k?-.8:.8),e2=s2.clone().add(v(Math.cos(ang)*rand(.4,.8),willow?-rand(.7,1.4):rand(.15,.55),Math.sin(ang)*rand(.4,.8)));const fine=branch([s2,s2.clone().lerp(e2,.5).add(v(0,.12,0)),e2],.023,.004,6,5);leafSpray(fine,willow?24:16,.8);}
  }
  leafSpray(main,62);
 }
 // A few small shoots close the top without a spherical crown shell.
 for(let i=0;i<5;i++){const a=i*2.4,s=trunk.getPointAt(.8+i*.035),e=s.clone().add(v(Math.cos(a)*1.3,.6,Math.sin(a)*1.3));leafSpray(branch([s,s.clone().lerp(e,.5).add(v(0,.3,0)),e],.065,.007,8,6),38);}
 // The swing bough is generated before instancing so its new shoots carry leaves.
 if(swing){
  const bough=branch([v(-.05,6.35,.04),v(-1.15,6.65,.16),v(-2.6,6.65,.2),v(-3.4,6.9,.22)],.17,.05,22,10);
  for(let i=0;i<8;i++){
   const t=.53+i*.061,start=bough.getPointAt(t),side=i%2?1:-1;
   const end=start.clone().add(v(-rand(.35,.85),rand(.45,1.1),side*rand(.35,.85)));
   const shoot=branch([start,start.clone().lerp(end,.48).add(v(-.06,.16,0)),end],rand(.034,.052),.006,9,6);leafSpray(shoot,48,.72);
   const forkStart=shoot.getPointAt(.64),forkEnd=forkStart.clone().add(v(-rand(.18,.44),rand(.2,.5),-side*rand(.2,.47)));
   leafSpray(branch([forkStart,forkStart.clone().lerp(forkEnd,.5).add(v(0,.08,0)),forkEnd],.018,.004,6,5),22,.6);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();resources.geometries.push(geometry);
 // Duplicate UV seam vertices share normals as well as exact coordinates.
 const normals=geometry.getAttribute('normal');for(const [first,last] of rings){const n=new THREE.Vector3().fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,first+last)).normalize();normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(first+last,n.x,n.y,n.z);}
 const wood=new THREE.Mesh(geometry,bark);wood.name='connected-branches';wood.castShadow=true;wood.receiveShadow=true;root.add(wood);
 if(hollow){const insetGeometry=new THREE.CircleGeometry(1,24),insetMaterial=new THREE.MeshStandardMaterial({color:0x30291f,roughness:1});resources.geometries.push(insetGeometry);resources.materials.push(insetMaterial);const inset=new THREE.Mesh(insetGeometry,insetMaterial);inset.name='recessed-hollow-interior';inset.position.set(-.045,.38,.36);inset.scale.set(.165,.34,1);root.add(inset);}
 const foliage=new THREE.InstancedMesh(nearLeafGeometry,leafMaterial,leaves.length);foliage.name='attached-leaves';foliage.castShadow=true;foliage.receiveShadow=true;if(leafDepth)foliage.customDepthMaterial=leafDepth;
 const tint=new THREE.Color();leaves.forEach((l,i)=>{dummy.position.copy(l.p);dummy.rotation.set(...l.r);dummy.scale.set(l.s*(willow?.62:1),l.s*(willow?1.15:1),l.s);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);tint.setRGB(rand(.76,1.04),rand(.86,1.06),rand(.71,.98));foliage.setColorAt(i,tint);});foliage.computeBoundingSphere();
 if(nearLeafGeometry!==leafGeometry){
  // Both levels share instance transforms/colors; only the leaf silhouette changes.
  const far=new THREE.InstancedMesh(leafGeometry,leafMaterial,leaves.length);far.name='attached-leaves-far';far.instanceMatrix=foliage.instanceMatrix;far.instanceColor=foliage.instanceColor;far.boundingSphere=foliage.boundingSphere.clone();far.receiveShadow=true;far.castShadow=false;if(leafDepth)far.customDepthMaterial=leafDepth;
  const lod=new THREE.LOD();lod.name='canopy-detail';lod.addLevel(foliage,0);lod.addLevel(far,24);root.add(lod);
 }else root.add(foliage);
 const seatGroup=new THREE.Group();seatGroup.name='swing';seatGroup.visible=swing;root.add(seatGroup);
 if(swing){
  // A dedicated bough makes both suspension points physically attached.
  seatGroup.position.set(-2.25,6.65,.2);
  const ropeMaterial=new THREE.MeshStandardMaterial({color:0xa89566,roughness:1}),seatMaterial=new THREE.MeshStandardMaterial({color:0x94744d,roughness:.9});resources.materials.push(ropeMaterial,seatMaterial);
  const ropeGeometry=new THREE.CylinderGeometry(.022,.022,4.65,7),seatGeometry=new THREE.BoxGeometry(1.32,.12,.54);resources.geometries.push(ropeGeometry,seatGeometry);
  for(const side of [-1,1]){const rope=new THREE.Mesh(ropeGeometry,ropeMaterial);rope.position.set(side*.52,-2.325,0);seatGroup.add(rope);}const seat=new THREE.Mesh(seatGeometry,seatMaterial);seat.position.y=-4.65;seat.castShadow=true;seatGroup.add(seat);
 }
 return root;
}
