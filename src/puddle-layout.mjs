import {seeded} from './ecosystem-rules.mjs';

// Terrain and water use the same clearings, independent of the observer.
export function puddleLayout(id){
 const random=seeded(9121+id*139),rand=(a,b)=>a+(b-a)*random();
 return Array.from({length:5},(_,i)=>{
  const z=-2.8-i*2.8+rand(-.7,.7),path=Math.sin(z*.31+id*.6)*1.5+.7;
  const pool={x:i<3?path+rand(-.38,.38):(i%2?1:-1)*rand(3,5),z,rx:rand(.85,1.5),rz:rand(.65,1.2),rotation:rand(0,6.28)};
  if(i===0){pool.x=2.6;pool.z=2.1;pool.rx=1.4;pool.rz=1.15;}
  return pool;
 });
}

export function insidePuddleClearing(x,z,pools){
 return pools.some(p=>{const dx=x-p.x,dz=z-p.z,c=Math.cos(p.rotation),s=Math.sin(p.rotation);return ((dx*c+dz*s)/p.rx)**2+((-dx*s+dz*c)/p.rz)**2<.42;});
}
