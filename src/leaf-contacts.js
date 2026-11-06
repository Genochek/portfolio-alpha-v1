import * as THREE from '../vendor/three.module.js';

// Only nearby, high-detail leaves participate. The hash is station-local so
// recycling a station never requires rebuilding thousands of leaf bounds.
export function createLeafContacts(stations, leafMaterial, nearGeometries) {
  const CELL=2, LIMIT=64, RANGE=6;
  const banks=[], active=[], moving=new Set(), dirty=new Set();
  const obstacles=Array.from({length:8},()=>new THREE.Vector4());
  const scores=new Float64Array(8);
  const inverse=new THREE.Matrix4(), matrix=new THREE.Matrix4(), rotation=new THREE.Matrix4();
  const point=new THREE.Vector3(), delta=new THREE.Vector3(), axis=new THREE.Vector3(), torque=new THREE.Vector3();
  const localCamera=new THREE.Vector3(), worldCamera=new THREE.Vector3(), quaternion=new THREE.Quaternion();
  const normal=new THREE.Vector3(), separation=new THREE.Vector3(), lever=new THREE.Vector3();
  const key=(x,y,z)=>`${x},${y},${z}`;
  for(const station of stations){
    const bank={group:station.group,hash:new Map(),bounds:new THREE.Box3(),maxRadius:0};banks.push(bank);
    station.group.updateMatrixWorld(true);
    station.group.traverse(mesh=>{
      if(!mesh.isInstancedMesh||mesh.material!==leafMaterial||!nearGeometries.includes(mesh.geometry))return;
      mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
      const box=mesh.geometry.boundingBox, sphere=mesh.geometry.boundingSphere;
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);if(matrix.getMaxScaleOnAxis()<1e-5)continue;
        const rest=matrix.clone(), base=new THREE.Vector3().setFromMatrixPosition(rest);
        const center=sphere.center.clone().applyMatrix4(rest);
        const localToStation=inverse.copy(station.group.matrixWorld).invert().multiply(mesh.matrixWorld);
        const hashCenter=center.clone().applyMatrix4(localToStation);bank.bounds.expandByPoint(hashCenter);
        const r={mesh,index:i,rest,base,localCenter:sphere.center.clone(),center:new THREE.Vector3(),root:new THREE.Vector3(),
          x:new THREE.Vector3(),y:new THREE.Vector3(),z:new THREE.Vector3(),half:new THREE.Vector3(),
          size:new THREE.Vector3((box.max.x-box.min.x)/2,(box.max.y-box.min.y)/2,.055),
          angle:new THREE.Vector3(),velocity:new THREE.Vector3(),force:new THREE.Vector3(),current:rest.clone(),mass:1,selected:false};
        const k=key(Math.floor(hashCenter.x/CELL),Math.floor(hashCenter.y/CELL),Math.floor(hashCenter.z/CELL));
        if(!bank.hash.has(k))bank.hash.set(k,[]);bank.hash.get(k).push(r);
        bank.maxRadius=Math.max(bank.maxRadius,sphere.radius*rest.getMaxScaleOnAxis());
      }
    });
  }
  function pose(r){
    matrix.multiplyMatrices(r.mesh.matrixWorld,r.current);
    r.root.setFromMatrixPosition(matrix);r.center.copy(r.localCenter).applyMatrix4(matrix);
    r.x.setFromMatrixColumn(matrix,0);r.y.setFromMatrixColumn(matrix,1);r.z.setFromMatrixColumn(matrix,2);
    r.half.set(r.x.length()*r.size.x,r.y.length()*r.size.y,r.z.length()*r.size.z);
    r.x.normalize();r.y.normalize();r.z.normalize();
    r.mass=Math.max(.025,r.half.x*r.half.y*(r.half.y+.2));
  }
  function support(r,n){return Math.sqrt((r.half.x*r.x.dot(n))**2+(r.half.y*r.y.dot(n))**2+(r.half.z*r.z.dot(n))**2);}
  function push(r,n,amount){
    lever.subVectors(r.center,r.root);torque.crossVectors(lever,n);
    // Convert world torque to the mesh's frame; roots remain invariant.
    quaternion.setFromRotationMatrix(r.mesh.matrixWorld).invert();torque.applyQuaternion(quaternion);
    r.force.addScaledVector(torque,amount/Math.max(.12,lever.lengthSq()));
  }
  function write(r){
    const a=r.angle.length();
    if(a>1e-6){axis.copy(r.angle).multiplyScalar(1/a);rotation.makeRotationAxis(axis,a);matrix.copy(r.rest);matrix.setPosition(0,0,0);r.current.multiplyMatrices(rotation,matrix);r.current.setPosition(r.base);}
    else r.current.copy(r.rest);
    r.mesh.setMatrixAt(r.index,r.current);dirty.add(r.mesh);
  }
  function restore(r){r.angle.set(0,0,0);r.velocity.set(0,0,0);r.current.copy(r.rest);r.mesh.setMatrixAt(r.index,r.rest);dirty.add(r.mesh);}
  return {
    update(camera,dt,reduced=false){
      worldCamera.copy(camera.position);if(camera.parent)camera.getWorldPosition(worldCamera);
      for(let i=0;i<active.length;i++)active[i].selected=false;active.length=0;
      // Bounded nearest insertion avoids a per-frame allocation or full-scene sort.
      for(const bank of banks){
        bank.group.updateMatrixWorld(true);if(!bank.group.visible)continue;
        inverse.copy(bank.group.matrixWorld).invert();localCamera.copy(worldCamera).applyMatrix4(inverse);
        const extent=(RANGE+bank.maxRadius)/Math.max(.4,Math.min(bank.group.scale.x,bank.group.scale.y,bank.group.scale.z));
        if(bank.bounds.distanceToPoint(localCamera)>extent)continue;
        const x0=Math.floor((localCamera.x-extent)/CELL),x1=Math.floor((localCamera.x+extent)/CELL);
        const y0=Math.floor((localCamera.y-extent)/CELL),y1=Math.floor((localCamera.y+extent)/CELL);
        const z0=Math.floor((localCamera.z-extent)/CELL),z1=Math.floor((localCamera.z+extent)/CELL);
        for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
          const cell=bank.hash.get(key(x,y,z));if(!cell)continue;
          for(const r of cell){pose(r);r.distance=r.center.distanceToSquared(worldCamera);if(r.distance>RANGE*RANGE)continue;
            let index=active.length;while(index>0&&active[index-1].distance>r.distance)index--;
            if(index>=LIMIT)continue;active.splice(index,0,r);if(active.length>LIMIT)active.pop();
          }
        }
      }
      for(const r of active){r.selected=true;r.force.set(0,0,0);}
      if(!reduced){
        for(let i=0;i<active.length;i++){
          const a=active[i];
          for(let j=i+1;j<active.length;j++){
            const b=active[j];if(a.root.distanceToSquared(b.root)<.035)continue;
            separation.subVectors(b.center,a.center);if(separation.lengthSq()>(a.half.length()+b.half.length()+.12)**2)continue;
            let penetration=Infinity;
            for(let k=0;k<3;k++){
              normal.copy(k===0?a.z:k===1?b.z:separation);if(normal.lengthSq()<1e-8)normal.copy(a.x);normal.normalize();
              const overlap=support(a,normal)+support(b,normal)+.045-Math.abs(separation.dot(normal));
              if(overlap<penetration){penetration=overlap;delta.copy(normal);}
            }
            if(penetration<=0)continue;
            if(separation.dot(delta)<0)delta.negate();
            const total=a.mass+b.mass,force=Math.min(.65,penetration)*52;
            push(a,delta,-force*b.mass/total);push(b,delta,force*a.mass/total);
          }
          // A small camera capsule gently opens foliage on the travel path.
          normal.subVectors(a.center,worldCamera);const distance=normal.length();
          if(distance>.001&&distance<.48+Math.min(.35,a.half.x)){normal.multiplyScalar(1/distance);push(a,normal,(.48+Math.min(.35,a.half.x)-distance)*20);}
          moving.add(a);
        }
      }
      const step=Math.min(1/30,Math.max(0,dt));
      for(const r of moving){
        if(reduced){restore(r);moving.delete(r);continue;}
        if(!r.selected)r.force.set(0,0,0);
        r.velocity.addScaledVector(r.force,step).addScaledVector(r.angle,-24*step).multiplyScalar(Math.exp(-9*step));
        r.angle.addScaledVector(r.velocity,step);if(r.angle.lengthSq()>.16){r.angle.setLength(.4);r.velocity.multiplyScalar(.5);}
        if(!r.selected&&(r.angle.lengthSq()+r.velocity.lengthSq()<1e-7||r.center.distanceToSquared(worldCamera)>144)){restore(r);moving.delete(r);}
        else write(r);
      }
      for(const mesh of dirty)mesh.instanceMatrix.needsUpdate=true;dirty.clear();
      scores.fill(Infinity);for(const o of obstacles)o.set(0,0,0,0);
      for(const r of active){
        pose(r);if(r.half.x<.12||r.half.x/r.half.y<.18)continue;
        // Two short-width samples cover a long blade without treating its full
        // bounding sphere as solid (which would flatten an entire grass patch).
        for(let sample=0;sample<2;sample++){
          point.copy(r.center).addScaledVector(r.y,(sample===0?-.42:.42)*r.half.y);
          const distance=point.distanceToSquared(worldCamera);let index=7;if(distance>=scores[index])continue;
          while(index>0&&distance<scores[index-1]){scores[index]=scores[index-1];obstacles[index].copy(obstacles[index-1]);index--;}
          scores[index]=distance;obstacles[index].set(point.x,point.y,point.z,Math.min(.65,Math.max(.13,r.half.x*.8)));
        }
      }
      return obstacles;
    },
    dispose(){for(const r of moving)restore(r);for(const mesh of dirty)mesh.instanceMatrix.needsUpdate=true;moving.clear();dirty.clear();banks.length=0;active.length=0;}
  };
}

