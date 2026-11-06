import {seeded} from './ecosystem-rules.mjs';
export function grassClumps(seed,count){const random=seeded(seed),r=(a,b)=>a+(b-a)*random(),out=[];
 for(let i=0;i<count;i++){const x=r(-8.5,8.5),z=r(-15.5,3.5),radius=r(.14,.48),height=r(.25,.85),tillers=5+Math.floor(random()*8),hue=r(.22,.35);
  if(Math.sin(x*1.31+z*.63)*Math.cos(z*.72)>.86){i--;continue;}
  for(let j=0;j<tillers;j++){const a=r(0,Math.PI*2),distance=Math.sqrt(random())*radius,tx=x+Math.cos(a)*distance,tz=z+Math.sin(a)*distance,yaw=a+r(-.5,.5),n=3+Math.floor(random()*2);
   for(let k=0;k<n;k++)out.push({clump:i,x:tx,z:tz,yaw:yaw+(k%2?Math.PI:0)+r(-.35,.35),height:height*r(.42,1.5)*(1-k*.11),width:r(.28,.7),lean:r(.25,1.1),rise:k*r(.035,.085),hue:hue+r(-.018,.018),light:r(.31,.49)});
  }
 }return out;
}
export function leafSurface(x,z){const t=Math.max(0,Math.min(1,(z+5.9)/1.8)),width=Math.pow(Math.sin(t*Math.PI),.7)*.62,u=width>0?x/width:0;return -1.8+Math.sin(t*Math.PI)*.09-u*u*.05-(z+5)*.32;}
export function groundGesture(state,delta,now){if(delta<0)return {count:0,last:now};if(delta<4)return state;return {count:Math.min(3,state.count+(state.count===0||now-state.last>210?1:0)),last:now};}
export function wheelPixels(delta,mode,pageHeight){return delta*(mode===1?16:mode===2?pageHeight:1);}
