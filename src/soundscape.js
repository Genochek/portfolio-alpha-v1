// No substitute sound: a background is created only when the owner supplies src.
export function createSoundscape(config={}){
  if(!config.src)return {setDuck(){},setVolume(){},pause(){}};
  const audio=new Audio(config.src);audio.loop=true;audio.preload='none';
  let master=.7,ducked=false,flying=false,raf=0;
  audio.volume=(config.volume??.3)*master;
  const unlock=()=>audio.play().catch(()=>{});
  document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
  function fade(){cancelAnimationFrame(raf);const from=audio.volume,to=Math.max(0,Math.min(1,(config.volume??.3)*master*(ducked?.08:flying?.32:1))),start=performance.now();function step(now){const t=Math.min(1,(now-start)/1000),ease=(1-Math.cos(t*Math.PI))/2;audio.volume=from+(to-from)*ease;if(t<1)raf=requestAnimationFrame(step);}raf=requestAnimationFrame(step);}
  document.addEventListener('garden:flight',e=>{flying=e.detail.active;fade();});
  return {setDuck(value){if(ducked!==value){ducked=value;fade();}},setVolume(value){master=value;fade();},pause(){cancelAnimationFrame(raf);audio.pause();}};
}
