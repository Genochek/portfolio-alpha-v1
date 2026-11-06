import {groundGesture,wheelPixels} from './natural-growth.mjs';
export function createInfoJourney(host,garden,reduced,onVisibility){
 let dive=0,target=0,surface=0,targetSurface=0,raf=0,last=0,active=false,touchY=null,gesture={count:0,last:0};
 const ground=()=>Math.max(1,(host.scrollHeight-host.clientHeight)*.76),intro=host.querySelector('.info-block'),ending=host.querySelector('.info-ending');
 function paint(){host.style.setProperty('--dive',dive);host.style.setProperty('--surface',surface);document.body.style.setProperty('--info-dive',active?dive:0);host.dataset.underground=dive>.55?'true':'false';host.dataset.groundTurns=gesture.count;const changed=ending.inert!==(dive<.8);intro.inert=dive>.25;ending.inert=dive<.8;intro.setAttribute('aria-hidden',String(dive>.25));ending.setAttribute('aria-hidden',String(dive<.8));garden.setInfoState?.(surface,dive);if(changed||dive===target)onVisibility();}
 function frame(now){const dt=Math.min((now-last)/1000||.016,.05);last=now;dive+=(target-dive)*(1-Math.exp(-(target?5.4:5.6)*dt));surface+=(targetSurface-surface)*(1-Math.exp(-8*dt));if(Math.abs(target-dive)<.002)dive=target;if(Math.abs(targetSurface-surface)<.0001)surface=targetSurface;paint();if(dive!==target||surface!==targetSurface)raf=requestAnimationFrame(frame);else raf=0;}
 function animate(value){target=value;if(reduced.matches){dive=value;surface=targetSurface;paint();return;}if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
 function scroll(){if(!active)return;const limit=ground();if(host.scrollTop>limit)host.scrollTop=limit;targetSurface=Math.min(.76,host.scrollTop/limit*.76);if(targetSurface<.75)gesture={count:0,last:0};animate(target);}
 function move(delta,now,discrete=false){if(!active)return false;
  if(target===1||dive>.01){if(delta<0){gesture={count:0,last:0};host.scrollTop=Math.max(0,ground()-Math.min(90,Math.abs(delta)));targetSurface=host.scrollTop/ground()*.76;animate(0);}return true;}
  if(host.scrollTop>=ground()-1&&delta>0){gesture=discrete?{count:Math.min(3,gesture.count+1),last:now}:groundGesture(gesture,delta,now);if(gesture.count>=3){gesture={count:0,last:0};animate(1);}paint();return true;}
  if(delta<0)gesture={count:0,last:0};return false;
 }
 function wheel(e){if(move(wheelPixels(e.deltaY,e.deltaMode,host.clientHeight),e.timeStamp))e.preventDefault();}
 function key(e){if(!active||e.repeat||e.target.closest('input,button,select,textarea'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){if(move(70,performance.now(),true))e.preventDefault();}if(['ArrowUp','PageUp'].includes(e.key)&&move(-50,performance.now(),true))e.preventDefault();}
 function touchStart(e){touchY=e.touches[0]?.clientY;}
 function touchMove(e){if(touchY===null)return;const y=e.touches[0]?.clientY;if(y===undefined)return;const delta=touchY-y;touchY=y;if(move(delta,e.timeStamp))e.preventDefault();}
 host.addEventListener('scroll',scroll,{passive:true});host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('touchstart',touchStart,{passive:true});host.addEventListener('touchmove',touchMove,{passive:false});document.addEventListener('keydown',key);
 return {setActive(value){active=value;cancelAnimationFrame(raf);raf=0;if(value){dive=target=surface=targetSurface=0;gesture={count:0,last:0};host.scrollTop=0;paint();}else document.body.style.setProperty('--info-dive',0);},dispose(){cancelAnimationFrame(raf);host.removeEventListener('scroll',scroll);host.removeEventListener('wheel',wheel);host.removeEventListener('touchstart',touchStart);host.removeEventListener('touchmove',touchMove);document.removeEventListener('keydown',key);}};
}
