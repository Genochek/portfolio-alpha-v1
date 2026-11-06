import * as THREE from '../vendor/three.module.js';

export function createLandmarks(stationTrees,resources,bark,treeFactory){
 const {geometries,materials}=resources,G=g=>(geometries.push(g),g),M=m=>(materials.push(m),m),beds=[];
 const cloth=M(new THREE.MeshStandardMaterial({color:0xc5c2a1,roughness:1,side:THREE.DoubleSide})),wood=M(new THREE.MeshStandardMaterial({color:0xb29063,roughness:.83})),joint=M(new THREE.MeshStandardMaterial({color:0x705737,roughness:.9})),rope=M(new THREE.MeshStandardMaterial({color:0x9e916e,roughness:1}));
 const jointGeo=G(new THREE.SphereGeometry(1,12,8)),axis=new THREE.Vector3(0,1,0);
 function tube(points,r,material,parent){const g=G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,8,false)),m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function ellipsoid(parent,at,size,material=wood){const m=new THREE.Mesh(jointGeo,material);m.position.set(...at);m.scale.set(...size);m.castShadow=true;parent.add(m);return m;}
 function limb(parent,a,b,r1,r2=r1){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),direction=q.clone().sub(p),m=new THREE.Mesh(G(new THREE.CylinderGeometry(r2,r1,direction.length(),12)),wood);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(axis,direction.normalize());m.castShadow=true;parent.add(m);ellipsoid(parent,a,[r1*.92,r1*.92,r1*.92],joint);ellipsoid(parent,b,[r2*.96,r2*.96,r2*.96],joint);}
 function mannequin(){
  const person=new THREE.Group();person.name='relaxed-wooden-mannequin';person.userData.pose='reclining, left arm behind head, right knee raised';
  const torso=ellipsoid(person,[-.35,-.89,0],[.48,.17,.24]);torso.rotation.z=-.3;ellipsoid(person,[.23,-.99,0],[.22,.15,.23]);
  limb(person,[-.78,-.72,0],[-1.01,-.46,0],.075);ellipsoid(person,[-1.19,-.39,0],[.21,.25,.19]);
  // The far arm folds up around the pillow and supports the back of the head.
  limb(person,[-.68,-.76,-.21],[-.98,-.20,-.35],.084,.065);limb(person,[-.98,-.20,-.35],[-1.38,-.32,-.14],.065,.05);ellipsoid(person,[-1.38,-.32,-.14],[.10,.045,.07]);
  // Near arm rests loosely over the abdomen.
  limb(person,[-.68,-.78,.22],[-.23,-.81,.34],.084,.063);limb(person,[-.23,-.81,.34],[.05,-.79,.08],.063,.045);ellipsoid(person,[.05,-.79,.08],[.10,.045,.07]);
  limb(person,[.27,-.99,-.13],[.87,-.98,-.17],.115,.082);limb(person,[.87,-.98,-.17],[1.47,-.69,-.16],.082,.055);ellipsoid(person,[1.56,-.68,-.13],[.15,.06,.085]);
  // Clearly bent near leg: knee raised, foot supported by the sling.
  limb(person,[.27,-.99,.13],[.79,-.20,.18],.12,.086);limb(person,[.79,-.20,.18],[1.10,-.84,.29],.086,.055);ellipsoid(person,[1.20,-.84,.30],[.17,.065,.085]);
  return person;
 }
 function replace(entry,type,seed,options={}){if(!treeFactory)return entry.tree;const old=entry.tree,parent=old.parent,t=treeFactory({type,seed,...options});parent.remove(old);parent.add(t);entry.tree=t;entry.swing=t.getObjectByName('swing');return t;}
 for(const entry of stationTrees){const kind=entry.phase%3;
  if(kind===0){const t=entry.tree;t.position.set(0,-3.35+.86,-6);t.scale.setScalar(.86);t.rotation.y=0;t.userData.landmark='g3-swing-tree';entry.swing=t.getObjectByName('swing');entry.swing.visible=true;}
  if(kind===1){
   const t=entry.tree,parent=t.parent;t.position.set(-4.8,-2.35,-5.8);t.scale.setScalar(1);t.rotation.y=-.18;t.userData.landmark='emore-left-tree';entry.swing.visible=false;
   // Generate independently: both silhouette and branching differ, with 9.6m between boles.
   const second=treeFactory?treeFactory({seed:76319+entry.phase*617,type:'birch'}):t.clone(true);second.position.set(4.8,-2.35,-5.5);second.scale.setScalar(.96);second.rotation.y=.38;second.userData.landmark='emore-right-tree';second.getObjectByName('swing').visible=false;parent.add(second);
   const bed=new THREE.Group();bed.name='emore-hammock';bed.userData.landmark='emore-hammock';bed.position.set(0,0,-5.55);parent.add(bed);
   const p=[],uv=[],ix=[];for(let i=0;i<=40;i++){const x=-2.55+i/40*5.1;for(let j=0;j<=10;j++){const across=j/10*2-1,z=across*.64*Math.pow(Math.sin(Math.PI*i/40),.55),edge=Math.pow(Math.abs(x/2.55),1.8);p.push(x,-1.18+edge*1.25+across*across*.17,z);uv.push(i/40,j/10);}if(i<40)for(let j=0;j<10;j++){const a=i*11+j;ix.push(a,a+11,a+1,a+1,a+11,a+12);}}
   const g=G(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const sling=new THREE.Mesh(g,cloth);sling.name='woven-sling';sling.castShadow=true;sling.receiveShadow=true;bed.add(sling);
   for(const side of [-1,1]){tube([[side*4.64,.88,side<0?-.25:.05],[side*3.45,.35,0],[side*2.55,.07,0]],.023,rope,bed);for(const z of [-.38,-.19,0,.19,.38])tube([[side*2.55,.07,0],[side*2.15,-.2,z]],.008,rope,bed);}
   const pillowMaterial=M(new THREE.MeshStandardMaterial({color:0xe3dcc1,roughness:1}));const pillow=ellipsoid(bed,[-1.22,-.62,0],[.4,.13,.37],pillowMaterial);pillow.name='linen-pillow';pillow.rotation.z=.16;
   bed.add(mannequin());beds.push({bed,phase:entry.phase,parent});
  }
  if(kind===2){const t=replace(entry,'oak',49079+entry.phase*137,{hollow:true});t.position.set(1.2,-2.35,-6);t.scale.setScalar(1);t.rotation.y=0;t.userData.landmark='oak-hollow-tree';entry.swing.visible=false;}
 }
 const cameraPosition=new THREE.Vector3(),bedPosition=new THREE.Vector3();
 return {update(time,passage,reduced,camera){for(const b of beds){let proximity=0;if(camera){camera.getWorldPosition(cameraPosition);b.bed.getWorldPosition(bedPosition);proximity=Math.exp(-cameraPosition.distanceToSquared(bedPosition)/18);}const gust=Math.max(proximity,passage*.5);b.bed.rotation.z=reduced?0:Math.sin(time*.6+b.phase)*.012+Math.sin(time*1.6)*gust*.028;b.bed.rotation.x=reduced?0:Math.sin(time*.47+b.phase)*.012;b.bed.position.y=reduced?0:-gust*.075*(.6+.4*Math.sin(time*1.3));}}};
}
