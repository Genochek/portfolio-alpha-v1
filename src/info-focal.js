import * as THREE from '../vendor/three.module.js';

// Quiet discoveries attached to the existing oak. No second trunk, floating
// replacement crown or screen-space animal is added to the listening nook.
export function decorateInfoOak(tree,resources,reduced){
 const ownedGeometry=[],ownedMaterials=[],root=new THREE.Group();root.name='info-ancient-oak-details';tree.add(root);
 const G=g=>(resources.geometries.push(g),ownedGeometry.push(g),g),M=m=>(resources.materials.push(m),ownedMaterials.push(m),m);
 const fur=M(new THREE.MeshStandardMaterial({color:0x9f7150,roughness:.87})),belly=M(new THREE.MeshStandardMaterial({color:0xc9ba91,roughness:.96})),dark=M(new THREE.MeshStandardMaterial({color:0x2f3026,roughness:.55})),nut=M(new THREE.MeshStandardMaterial({color:0x816744,roughness:.92})),bark=M(new THREE.MeshStandardMaterial({color:0x5a6244,roughness:1}));
 const sphere=G(new THREE.SphereGeometry(1,12,9)),limb=G(new THREE.CylinderGeometry(1,1,1,7)),squirrels=[];
 function mesh(parent,geo,mat,position,scale){const m=new THREE.Mesh(geo,mat);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function branch(points,radius){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),m=new THREE.Mesh(G(new THREE.TubeGeometry(curve,14,radius,8)),bark);m.castShadow=true;m.receiveShadow=true;root.add(m);return curve;}
 branch([[0,2.5,.15],[.45,2.85,.4],[1.1,3.08,.7],[1.75,3.05,.9]],.085);
 branch([[0,3.8,.05],[-.45,4.05,.35],[-1.05,4.22,.55],[-1.55,4.15,.65]],.073);
 function tailGeometry(){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.13,-.08),new THREE.Vector3(0,.26,-.29),new THREE.Vector3(0,.52,-.32),new THREE.Vector3(0,.65,-.14),new THREE.Vector3(0,.58,-.05)]),frames=curve.computeFrenetFrames(20,false),positions=[],indices=[];for(let i=0;i<=20;i++){const t=i/20,p=curve.getPointAt(t),radius=.018+Math.pow(Math.sin(Math.PI*t),.8)*.105;for(let j=0;j<=10;j++){const a=j/10*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);positions.push(v.x,v.y,v.z);if(i<20&&j<10){const n=i*11+j;indices.push(n,n+1,n+11,n+1,n+12,n+11);}}}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return G(geometry);}
 const tailGeo=tailGeometry();
 for(let i=0;i<2;i++){
  const animal=new THREE.Group();animal.name='perched-red-squirrel-'+i;animal.position.set(i?-.96:1.05,i?4.23:3.12,i?.56:.74);animal.rotation.y=i?.65:-.4;animal.scale.setScalar(i?.72:.87);root.add(animal);
  const body=mesh(animal,sphere,fur,[0,.19,0],[.115,.185,.105]);mesh(animal,sphere,belly,[0,.19,.071],[.073,.125,.05]);
  const head=new THREE.Group();head.position.set(0,.355,.03);animal.add(head);mesh(head,sphere,fur,[0,0,0],[.093,.081,.084]);mesh(head,sphere,belly,[0,-.028,.075],[.044,.035,.044]);mesh(head,sphere,dark,[0,-.018,.114],[.013,.01,.011]);
  for(const side of [-1,1]){mesh(head,sphere,fur,[side*.063,.073,-.012],[.029,.071,.023]);mesh(head,sphere,dark,[side*.066,.016,.059],[.011,.012,.009]);mesh(head,sphere,belly,[side*.027,-.039,.083],[.009,.018,.011]);const arm=mesh(animal,limb,fur,[side*.075,.222,.084],[.024,.127,.024]);arm.rotation.z=side*.35;mesh(animal,sphere,fur,[side*.053,.165,.127],[.027,.024,.029]);mesh(animal,sphere,fur,[side*.086,.045,.025],[.045,.038,.075]);}
  const acorn=mesh(animal,sphere,nut,[0,.166,.133],[.034,.048,.032]);mesh(animal,sphere,bark,[0,.196,.13],[.038,.019,.035]);const tail=new THREE.Mesh(tailGeo,fur);tail.castShadow=true;tail.receiveShadow=true;animal.add(tail);squirrels.push({animal,body,head,tail,acorn,phase:i*2.7});
 }
 // Weathered knots and small shelf fungi make the oak feel older without
 // replacing its continuous bark surface or obscuring the biography.
 const knot=G(new THREE.TorusGeometry(.16,.022,6,18));for(let i=0;i<3;i++){const m=mesh(root,knot,bark,[i%2?.24:-.19,1.2+i*.64,.64],[.7+i*.13,1.2,1]);m.rotation.z=i*.7;}
 const fungi=M(new THREE.MeshStandardMaterial({color:0xa8a584,roughness:1}));for(let i=0;i<5;i++){const a=-.7+i*.31;mesh(root,sphere,fungi,[Math.sin(a)*.56,.6+i*.12,Math.cos(a)*.6],[.13,.034,.10]);}
 let disposed=false;
 return {root,squirrels:squirrels.map(s=>s.animal),update(time,wetness=0){if(disposed||reduced?.matches)return;for(const s of squirrels){const t=time*.7+s.phase;s.head.rotation.set(Math.sin(t*.8)*.035,Math.sin(t*.37)*.14,Math.sin(t*.6)*.018);s.tail.rotation.y=Math.sin(t*.45)*.10*(1-wetness*.45);s.tail.rotation.x=Math.sin(t*.33)*.025;s.body.scale.y=.185+Math.sin(t*2)*.002;s.acorn.rotation.x=Math.sin(t*2.7)*.04;}},dispose(){if(disposed)return;disposed=true;tree.remove(root);for(const g of ownedGeometry){g.dispose();const i=resources.geometries.indexOf(g);if(i>=0)resources.geometries.splice(i,1);}for(const m of ownedMaterials){m.dispose();const i=resources.materials.indexOf(m);if(i>=0)resources.materials.splice(i,1);}}};
}
export function createInfoFocal(infoParent,resources,reduced,{tree,treeFactory}={}){
 const oak=tree||treeFactory?.();if(!oak)throw new Error('createInfoFocal requires an existing oak or treeFactory');const owned=!tree;if(owned)infoParent.add(oak);const details=decorateInfoOak(oak,resources,reduced);return {...details,tree:oak,dispose(){details.dispose();if(owned)infoParent.remove(oak);}};
}
