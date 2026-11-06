import {createSoundscape} from './soundscape.js';
import {createPlaybackRateTransition} from './playback-rate.mjs';
const $=s=>document.querySelector(s);
const time=t=>Number.isFinite(t)?`${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`:'0:00';

export function createPlayer(works,soundscape){
  const ambient=createSoundscape(soundscape);
  const seek=$('#track-seek'),play=$('#track-play'),title=$('#playing-title'),elapsed=$('#elapsed'),duration=$('#duration'),error=$('#player-error');
  let current=0,volume=.7,rate=1,lastVolume=.7;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),rateTransition=createPlaybackRateTransition(rate);
  let rateFrame=0,rateTimer=0;
  const entries=works.map((work,index)=>{
    const wrapper=document.createElement('div');wrapper.className='work-entry';
    const row=document.createElement('button');row.className='work-row';row.setAttribute('aria-label','Воспроизвести: '+work.title);
    const number=document.createElement('span');number.className='work-index';number.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('span');name.className='work-name';name.textContent=work.title;
    const length=document.createElement('span');length.className='work-duration';length.textContent='—';
    const action=document.createElement('span');action.className='work-action';action.textContent='↗';action.setAttribute('aria-hidden','true');row.append(number,name,length,action);
    const media=document.createElement(work.type==='video'?'video':'audio');media.preload='metadata';media.volume=volume;media.preservesPitch=false;media.mozPreservesPitch=false;media.webkitPreservesPitch=false;
    media.src=work.type==='video'?work.src:'./assets/audio/'+encodeURIComponent(work.src);
    if(work.type==='video'){media.playsInline=true;media.controls=true;if(work.poster)media.poster=work.poster;}else media.hidden=true;
    wrapper.append(row);if(work.type!=='video')wrapper.append(media);$('#works').append(wrapper);
    row.onclick=()=>select(index,true);
    media.addEventListener('loadedmetadata',()=>{length.textContent=time(media.duration);if(index===current)update();});
    for(const event of ['play','pause','ended','timeupdate','durationchange'])media.addEventListener(event,()=>{if(index===current)update();});
    media.addEventListener('ended',()=>{action.textContent='↗';});
    media.addEventListener('error',()=>{length.textContent='ошибка';if(index===current){error.textContent='Не удалось загрузить файл. Попробуйте ещё раз.';error.hidden=false;update();}});
    return {work,media,row,action};
  });
  function applyRate(now){
    const value=rateTransition.valueAt(now);
    entries.forEach(e=>{e.media.playbackRate=value;});
  }
  function animateRate(now){
    rateFrame=0;rateTimer=0;applyRate(now);
    if(rateTransition.active){
      if(document.hidden)rateTimer=setTimeout(()=>animateRate(performance.now()),100);
      else rateFrame=requestAnimationFrame(animateRate);
    }
  }
  function cancelRateAnimation(){
    cancelAnimationFrame(rateFrame);clearTimeout(rateTimer);rateFrame=0;rateTimer=0;
  }
  function setRate(next){
    cancelRateAnimation();rate=next;
    rateTransition.retarget(rate,performance.now(),reduced.matches);
    animateRate(performance.now());
  }
  // Background tabs may suspend rAF. Resume from elapsed wall time, including
  // when a different track starts before the next animation frame.
  document.addEventListener('visibilitychange',()=>{
    cancelRateAnimation();animateRate(performance.now());
  });
  reduced.addEventListener('change',()=>{if(reduced.matches)setRate(rate);});
  function update(){const entry=entries[current];if(!entry)return;const a=entry.media;title.textContent=entry.work.title;seek.max=Number.isFinite(a.duration)?a.duration:100;seek.value=a.currentTime||0;seek.disabled=!Number.isFinite(a.duration);elapsed.textContent=time(a.currentTime);duration.textContent=time(a.duration);const playing=!a.paused&&!a.ended;play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',playing?'Пауза':'Воспроизвести');document.body.classList.toggle('is-playing',playing);$('.sound-dock').hidden=!playing;ambient.setDuck(playing);if(!playing){$('#speed-menu').hidden=true;$('.speed-toggle').setAttribute('aria-expanded','false');}entries.forEach((e,i)=>{e.row.classList.toggle('current',i===current);e.row.setAttribute('aria-current',i===current?'true':'false');e.action.textContent=i===current&&playing?'Ⅱ':'↗';e.row.setAttribute('aria-label',(i===current&&playing?'Пауза: ':'Воспроизвести: ')+e.work.title);});}
  async function start(){const a=entries[current]?.media;if(!a)return;error.hidden=true;if(a.error)a.load();applyRate(performance.now());try{await a.play();}catch{error.textContent='Не удалось включить работу. Попробуйте ещё раз.';error.hidden=false;}update();}
  function select(index,toggle=false){const same=index===current,previous=entries[current];if(!same)previous?.media.pause();current=index;const entry=entries[current];if(!entry)return;
    applyRate(performance.now());
    if(entry.work.type==='video'){const floating=$('#floating-video');floating.querySelector('div').replaceChildren(entry.media);floating.hidden=false;}else{$('#floating-video').hidden=true;}
    update();if(same&&toggle&&!entry.media.paused)entry.media.pause();else start();
  }
  play.onclick=()=>{const a=entries[current]?.media;if(!a)return;if(a.paused)start();else a.pause();};
  $('#track-prev').onclick=()=>select((current-1+entries.length)%entries.length);
  $('#track-next').onclick=()=>select((current+1)%entries.length);
  seek.oninput=()=>{const a=entries[current]?.media;if(a&&Number.isFinite(a.duration))a.currentTime=Number(seek.value);};
  function setVolume(value){volume=value;entries.forEach(e=>e.media.volume=volume);ambient.setVolume(volume);$('#master-volume').value=volume;$('#mute').setAttribute('aria-pressed',String(volume===0));$('#mute').setAttribute('aria-label',volume===0?'Включить звук':'Выключить звук');}
  $('#master-volume').oninput=e=>setVolume(Number(e.target.value));
  $('#mute').onclick=()=>{if(volume>0){lastVolume=volume;setVolume(0);}else setVolume(lastVolume||.7);};
  const speedToggle=$('.speed-toggle'),speedMenu=$('#speed-menu');speedToggle.onclick=()=>{speedMenu.hidden=!speedMenu.hidden;speedToggle.setAttribute('aria-expanded',String(!speedMenu.hidden));};
  document.querySelectorAll('[data-rate]').forEach(button=>button.onclick=()=>{setRate(Number(button.dataset.rate));document.querySelectorAll('[data-rate]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));speedMenu.hidden=true;speedToggle.setAttribute('aria-expanded','false');});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.sound-dock')){speedMenu.hidden=true;speedToggle.setAttribute('aria-expanded','false');}});
  $('#floating-video>button').onclick=()=>{entries[current]?.media.pause();$('#floating-video').hidden=true;};
  update();return {setView(view){const dock=$('.sound-dock');(view==='portfolio'?$('.portfolio-player'):document.body).append(dock);dock.classList.toggle('inline-sound',view==='portfolio');},pauseAll(){entries.forEach(e=>e.media.pause());ambient.pause();}};
}
