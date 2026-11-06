const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export function routeOffset(position){let x=0,y=0;for(let station=Math.floor(position)-1;station<=Math.ceil(position);station++){const d=14-18*(position-station),w=(1-ease((d-4)/9))*ease((d+4)/8),kind=((station%3)+3)%3;if(kind===1)y-=w*.95;else x+=w*(kind===2?-1.3:2.5);}return {x,y};}
