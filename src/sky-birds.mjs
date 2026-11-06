// Far-away birds cross a fixed patch of sky, with long quiet intervals.
export function skyBird(time,index,reduced=false){
 const phase=(time+index*.75+5)%47,travel=phase/14;
 if(reduced||phase>14)return {x:0,y:0,flap:0,opacity:0};
 const fade=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 return {x:-.72+travel*1.5-index*.022,y:.34+index*.036+Math.sin(travel*3.1+index)*.025,flap:Math.sin(time*3.7-index*.8)*.55,opacity:fade(phase/2)*fade((14-phase)/2)};
}
