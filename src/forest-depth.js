import * as THREE from '../vendor/three.module.js';

const SECTOR_LENGTH=48,BEHIND_RECYCLE=72,AHEAD_RECYCLE=150;
const rng=seed=>{let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};

// Simplified, closed-ring wood keeps the source tree's branching silhouette.
function simplifyWood(source){
 const input=source.getObjectByName('connected-branches').geometry,p=input.attributes.position,uv=input.attributes.uv,branches=[];
 let current=[];
 for(let first=0;first<p.count;){let last=first+1;while(last<p.count&&uv.getX(last)!==1)last++;if(uv.getY(first)===0&&current.length){branches.push(current);current=[];}current.push([first,last]);first=last+1;}if(current.length)branches.push(current);
 const positions=[],indices=[],center=new THREE.Vector3(),point=new THREE.Vector3();
 for(const rings of branches){
  const [first,last]=rings[0];center.set(0,0,0);for(let i=first;i<last;i++)center.add(point.fromBufferAttribute(p,i));center.divideScalar(last-first);
  let radius=0;for(let i=first;i<last;i++)radius+=point.fromBufferAttribute(p,i).distanceTo(center);radius/=last-first;if(radius<.06)continue;
  const start=positions.length/3,steps=Math.min(4,rings.length-1),radial=6;
  for(let row=0;row<=steps;row++){const [a,b]=rings[Math.round(row/steps*(rings.length-1))];for(let j=0;j<=radial;j++){point.fromBufferAttribute(p,a+Math.round((j%radial)/radial*(b-a)));positions.push(point.x,point.y,point.z);if(row<steps&&j<radial){const n=start+row*(radial+1)+j;indices.push(n,n+1,n+radial+1,n+1,n+radial+2,n+radial+1);}}}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

// Small curved leaf grids preserve painted veins and rounded silhouettes near the edges.
function simplifyCanopy(source){
 const sourceLeaves=source.getObjectByName('attached-leaves'),positions=[],colors=[],uv=[],indices=[],matrix=new THREE.Matrix4(),point=new THREE.Vector3(),tint=new THREE.Color();
 // 8x2 uses 32 triangles per leaf: enough edge samples without a full hero mesh.
 const rows=8,cols=2,count=Math.min(420,sourceLeaves.count);
 for(let k=0;k<count;k++){
  const i=Math.floor((k+.5)/count*sourceLeaves.count),base=positions.length/3;sourceLeaves.getMatrixAt(i,matrix);tint.setRGB(.89+(k%7)*.017,.93+(k%5)*.015,.84+(k%6)*.022);
  for(let row=0;row<=rows;row++){
   const t=row/rows,width=Math.pow(Math.sin(t*Math.PI),.72)*.31*(1+.025*Math.sin(t*17));
   for(let col=0;col<=cols;col++){
    const across=col/cols*2-1,curve=Math.sin(t*Math.PI)*(.085+Math.pow(Math.abs(across),1.6)*.045)+across*.012*Math.sin(t*15);
    point.set(across*width*1.6,t*1.6,curve*1.6).applyMatrix4(matrix);positions.push(point.x,point.y,point.z);colors.push(tint.r,tint.g,tint.b);uv.push(col/cols,t);
    if(row<rows&&col<cols){const n=base+row*(cols+1)+col;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.userData.leafCount=count;geometry.userData.leafRows=rows;geometry.userData.leafColumns=cols;return geometry;
}

export function createForestDepth(scene,resources,{treeSources=[],infoAnchor,portfolioAnchor}={}){
 const root=new THREE.Group();root.name='continuous-forest-depth';scene.add(root);
 const ownedGeometries=[],ownedMaterials=[],meshes=[],ownedGroups=[root],sources=[];
 // Prefer different species, then a different seed if the corridor has only two species.
 for(const tree of treeSources){if(!tree?.getObjectByName('attached-leaves'))continue;if(!sources.some(t=>t.userData.species===tree.userData.species))sources.push(tree);}
 for(const tree of treeSources)if(sources.length<3&&!sources.includes(tree)&&tree?.getObjectByName('attached-leaves'))sources.push(tree);
 const G=g=>(ownedGeometries.push(g),resources.geometries.push(g),g),M=m=>(ownedMaterials.push(m),resources.materials.push(m),m);
 const woodMaterial=M(new THREE.MeshStandardMaterial({color:0x536047,roughness:1}));
 const sourceLeafMaterial=sources[0]?.getObjectByName('attached-leaves').material;
 // Clone retains the painted texture and toon ramp while sharing their GPU assets.
 // Its hero wind hook is intentionally not copied: canopy positions are already baked.
 const leafMaterial=M(sourceLeafMaterial?sourceLeafMaterial.clone():new THREE.MeshStandardMaterial({roughness:1}));leafMaterial.color.set(0xc8efad);leafMaterial.vertexColors=true;leafMaterial.side=THREE.DoubleSide;leafMaterial.needsUpdate=true;
 const templates=sources.slice(0,3).map(tree=>({wood:G(simplifyWood(tree)),leaves:G(simplifyCanopy(tree))})),dummy=new THREE.Object3D(),tint=new THREE.Color();
 let disposed=false;
 function createBatchGroup(name,poses,parent){
  const group=new THREE.Group();group.name=name;group.userData.treeCount=poses.length;parent.add(group);ownedGroups.push(group);const batches=[];
  for(let type=0;type<templates.length;type++){
   const count=poses.filter((_,i)=>i%templates.length===type).length,template=templates[type];if(!count)continue;
   const wood=new THREE.InstancedMesh(template.wood,woodMaterial,count),leaves=new THREE.InstancedMesh(template.leaves,leafMaterial,count);wood.name='depth-branched-trunks';leaves.name='depth-leaf-masses';wood.castShadow=leaves.castShadow=false;wood.receiveShadow=leaves.receiveShadow=true;group.add(wood,leaves);meshes.push(wood,leaves);batches.push({type,wood,leaves});
  }
  function place(nextPoses){
   group.userData.poses=nextPoses.map(p=>({...p}));
   for(const batch of batches){let index=0;nextPoses.forEach((pose,i)=>{if(i%templates.length!==batch.type)return;dummy.position.set(pose.x,-3.35+pose.scale,pose.z);dummy.rotation.set(0,pose.yaw,0);dummy.scale.set(pose.scale*pose.width,pose.scale,pose.scale);dummy.updateMatrix();batch.wood.setMatrixAt(index,dummy.matrix);batch.leaves.setMatrixAt(index,dummy.matrix);tint.setRGB(pose.tone,pose.tone*(1+pose.green),pose.tone*.91);batch.wood.setColorAt(index,tint);batch.leaves.setColorAt(index,tint);index++;});
    batch.wood.instanceMatrix.needsUpdate=true;batch.leaves.instanceMatrix.needsUpdate=true;batch.wood.instanceColor.needsUpdate=true;batch.leaves.instanceColor.needsUpdate=true;batch.wood.computeBoundingSphere();batch.leaves.computeBoundingSphere();
   }
  }
  place(poses);return {group,place};
 }
 function sectorPoses(index){
  const random=rng(87171+Math.imul(index,92821)),poses=[];
  for(let layer=0;layer<3;layer++)for(const side of [-1,1]){const count=4+layer;for(let i=0;i<count;i++)poses.push({x:side*([9,18,30][layer]+(random()-.5)*(layer?8:3)),z:(i+random()*.6)/count*SECTOR_LENGTH,scale:(.72+random()*.48)*(1+layer*.17),width:.92+random()*.24,yaw:random()*6.283,tone:.84-layer*.15+random()*.11,green:random()*.06});}
  for(let i=0;i<6;i++)poses.push({x:(i%2?1:-1)*(6.4+random()*6),z:random()*SECTOR_LENGTH,scale:.19+random()*.15,width:1.6+random()*.5,yaw:random()*6.283,tone:.72+random()*.2,green:.04});
  return poses;
 }
 const sectors=[];
 if(templates.length)for(let index=-3;index<=1;index++){const sector=createBatchGroup('forest-world-sector',sectorPoses(index),root);sector.index=index;sector.group.position.z=index*SECTOR_LENGTH;sector.group.userData.sectorIndex=index;sector.group.userData.recycleCount=0;sectors.push(sector);}
 function anchorForest(anchor,name,seed,info){
  if(!anchor||!templates.length)return null;const random=rng(seed),poses=[];
  for(let layer=0;layer<3;layer++)for(const side of [-1,1])for(let i=0;i<10;i++)poses.push({x:side*([8.6,16,25][layer]+(random()-.5)*4),z:-6-i*7.4-random()*4,scale:(.76+random()*.45)*(1+layer*.13),width:.95+random()*.25,yaw:random()*6.283,tone:.84-layer*.14+random()*.09,green:random()*.06});
  if(info)for(let i=0;i<10;i++)poses.push({x:(i%2?1:-1)*(4.2+random()*3),z:-39-i*4.2,scale:.7+random()*.3,width:1.03,yaw:random()*6.283,tone:.57+random()*.1,green:.03});
  // Staggered depth closes the end of the glade, including the view below the swing.
  if(info){for(let i=0;i<9;i++)poses.push({x:(random()-.5)*10,z:-35-i*4.8,scale:.85+random()*.45,width:1.08+random()*.2,yaw:random()*6.283,tone:.65+random()*.1,green:.03});
   for(let i=0;i<16;i++)poses.push({x:(i%2?1:-1)*(6.1+random()*4.5),z:-14-random()*44,scale:.25+random()*.26,width:1.5+random()*.5,yaw:random()*6.283,tone:.8+random()*.12,green:.05});}
  for(let i=0;i<12;i++)poses.push({x:(i%2?1:-1)*(6+random()*10),z:-5-random()*55,scale:.19+random()*.14,width:1.8,yaw:random()*6.283,tone:.78+random()*.15,green:.04});
  return createBatchGroup(name,poses,anchor).group;
 }
 const infoForest=anchorForest(infoAnchor,'info-continuous-forest',18317,true),portfolioForest=anchorForest(portfolioAnchor,'portfolio-continuous-forest',73183,false);
 function update(camera,z,mode,time,reduced){
  if(disposed)return;root.visible=mode==='artists';if(infoForest)infoForest.visible=mode==='info';if(portfolioForest)portfolioForest.visible=mode==='portfolio';
  if(!root.visible||!sectors.length)return;
  const cameraZ=camera.position.z;
  // No frame-relative motion: a sector changes only when its entire old extent is
  // beyond the visible corridor, including when returning toward earlier artists.
  for(let pass=0;pass<64;pass++){
   let changed=false;
   for(const sector of sectors){const min=sector.index*SECTOR_LENGTH,max=min+SECTOR_LENGTH;let next=null;
    if(min-cameraZ>BEHIND_RECYCLE)next=Math.min(...sectors.map(s=>s.index))-1;
    else if(max-cameraZ< -AHEAD_RECYCLE)next=Math.max(...sectors.map(s=>s.index))+1;
    if(next!==null){sector.index=next;sector.group.position.z=next*SECTOR_LENGTH;sector.group.userData.sectorIndex=next;sector.group.userData.recycleCount++;sector.place(sectorPoses(next));changed=true;}
   }
   if(!changed)break;
  }
 }
 function dispose(){if(disposed)return;disposed=true;for(const group of ownedGroups)group.removeFromParent();for(const mesh of meshes)mesh.dispose();for(const geometry of ownedGeometries){geometry.dispose();const i=resources.geometries.indexOf(geometry);if(i!==-1)resources.geometries.splice(i,1);}for(const material of ownedMaterials){material.dispose();const i=resources.materials.indexOf(material);if(i!==-1)resources.materials.splice(i,1);}}
 return {update,dispose,root,infoForest,portfolioForest};
}
