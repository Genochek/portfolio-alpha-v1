export function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function terrainHeight(x,z){return -3.35+.15*Math.sin(x*.73+z*.21)+.13*Math.cos(z*.62-x*.31)+.07*Math.sin(x*1.6+z*.8)-.27*Math.exp(-((x-2.2)**2+(z+4)**2)/1.4);}
export function clearOfFlowers(p,r,flowers){return flowers.every(f=>Math.hypot(p[0]-f.x,p[1]-f.y,p[2]-f.z)>r+f.r+.18);}
export function diveTarget(progress,current,delta){if(delta<=-24)return 0;if(current>.5)return 1;return progress>.88&&delta>=0?1:0;}
