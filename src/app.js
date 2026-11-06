import {artists,works,infoLinks,soundscape} from './data.js';
import {createGarden} from './scene.js';
import {createMenu} from './navigation.js';
import {createPlayer} from './player.js';
import {createInfoJourney} from './info-journey.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const garden=createGarden($('#world')),player=createPlayer(works,soundscape);
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let current=0,busy=false,view='artists',viewLock=false,pendingView=null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const menu=createMenu(next=>showView(next));
const infoJourney=createInfoJourney($('#info'),garden,reduced,()=>syncMemes());

function links(container,items){container.replaceChildren();container.classList.add('platform-links');for(const item of items){const a=document.createElement('a');a.textContent=item.label;a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';container.append(a);}}
const memeFiles=['mita-tank-loop.webm','mita-sleepy.mp4','natsuki-dance.mp4'];
function updateArtist(){
  const a=artists[current],video=$('#artist-art');
  $('.artist-title h1').textContent=a.name;garden.setArtist?.(a.name);
  $('.sheet-name').textContent=a.name;$('.sheet-copy').textContent=a.text;
  const file=current===0&&!video.canPlayType('video/webm; codecs="vp9"')?'mita-tank.mp4':memeFiles[current];
  video.src='./assets/memes/'+file;
  video.poster='./assets/memes/'+['mita-tank','mita-sleepy','natsuki-dance'][current]+'.jpg';
  video.setAttribute('aria-label',['Мита на танке','Сонная Мита','Танцующая Нацуки'][current]+' — мем с Tenor');
  links($('.artist-links'),a.links);document.documentElement.style.setProperty('--artist-accent',a.color);syncMemes();
}

const sheet=$('.artist-sheet'),handle=$('.leaf-handle'),summary=$('.sheet-summary'),detail=$('#sheet-detail');
let expanded=false,lift=0,travel=0,drag=null,suppressClick=false;
function dimensions(){const compact=parseFloat(getComputedStyle(sheet).getPropertyValue('--sheet-compact'))||126;const h=Math.min(490,innerHeight-110);sheet.style.setProperty('--sheet-height',h+'px');travel=Math.max(0,h-compact);setLift(expanded?travel:0);}
function setLift(value){lift=Math.max(0,Math.min(travel,value));sheet.style.setProperty('--lift',lift+'px');}
function setExpanded(value){expanded=value;document.body.classList.toggle('sheet-open',value);handle.setAttribute('aria-expanded',String(value));summary.setAttribute('aria-expanded',String(value));handle.setAttribute('aria-label',value?'Свернуть информацию об артисте':'Раскрыть информацию об артисте');detail.inert=!value;setLift(value?travel:0);syncMemes();}
handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;suppressClick=false;drag={id:e.pointerId,y:e.clientY,start:lift,was:expanded,moved:false};handle.setPointerCapture(e.pointerId);sheet.classList.add('dragging');});
handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dy=drag.y-e.clientY;if(Math.abs(dy)>5)drag.moved=true;setLift(drag.start+dy);});
function finishDrag(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;sheet.classList.remove('dragging');if(d.moved){suppressClick=true;const distance=lift-d.start;setExpanded(cancel?d.was:d.was?distance>-travel/3:distance>travel/3);}else if(cancel)setExpanded(d.was);}
handle.addEventListener('pointerup',e=>finishDrag(e));handle.addEventListener('pointercancel',e=>finishDrag(e,true));handle.addEventListener('lostpointercapture',e=>finishDrag(e,true));
handle.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}setExpanded(!expanded);});summary.addEventListener('click',()=>setExpanded(!expanded));
addEventListener('resize',dimensions);dimensions();

async function changeArtist(direction){if(busy||view!=='artists'||viewLock)return;busy=true;document.dispatchEvent(new CustomEvent('garden:flight',{detail:{active:true,direction}}));setExpanded(false);sheet.inert=true;document.body.classList.add('transitioning');$$('.side-arrow').forEach(b=>b.disabled=true);const motion=garden.travel(direction);await pause(reduced.matches?40:1150);current=(current+direction+3)%3;updateArtist();await motion;document.body.classList.remove('transitioning');await pause(reduced.matches?20:700);sheet.inert=false;document.dispatchEvent(new CustomEvent('garden:flight',{detail:{active:false}}));$$('.side-arrow').forEach(b=>b.disabled=false);busy=false;if(pendingView){const next=pendingView;pendingView=null;showView(next);}}
$('.previous').onclick=()=>changeArtist(-1);$('.next').onclick=()=>changeArtist(1);
addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,.site-header,.sound-dock')||view!=='artists')return;if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();changeArtist(1);}if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();changeArtist(-1);}if(e.key==='Escape'&&expanded){setExpanded(false);handle.focus();}});
let swipe=null;$('#artists').addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('button,.artist-sheet'))return;swipe={x:e.clientX,y:e.clientY,id:e.pointerId};});$('#artists').addEventListener('pointerup',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)changeArtist(dx<0?1:-1);});$('#artists').addEventListener('pointercancel',()=>swipe=null);

async function showView(next,initial=false){if(!['artists','info','portfolio'].includes(next))next='artists';if((busy||viewLock)&&!initial){pendingView=next;return;}if(next===view&&!initial)return;viewLock=true;menu.close();setExpanded(false);const previous=$('#'+view);if(!initial){previous.classList.add('leaving');document.body.classList.add('scene-changing');garden.transition?.();await pause(reduced.matches?20:420);}view=next;$$('.view').forEach(el=>{el.hidden=el.id!==view;el.classList.remove('leaving','entering');});const active=$('#'+view);if(!initial)active.classList.add('entering');$$('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.body.classList.remove('mode-artists','mode-info','mode-portfolio');document.body.classList.add('mode-'+view);garden.setView(view,initial);player.setView(view);infoJourney.setActive(view==='info');history.replaceState(null,'','#'+view);syncMemes();if(!initial)await pause(reduced.matches?30:850);document.body.classList.remove('scene-changing');active.classList.remove('entering');viewLock=false;if(pendingView){const latest=pendingView;pendingView=null;showView(latest);}}

links($('#info-links'),infoLinks);

function syncMemes(){for(const video of $$('.meme')){const rect=video.getBoundingClientRect();const visible=!video.closest('[hidden]')&&!video.closest('[inert]')&&rect.bottom>0&&rect.top<innerHeight&&!document.hidden;if(visible&&!reduced.matches)video.play().catch(()=>{});else{video.pause();if(reduced.matches&&video.readyState>=1&&video.currentTime===0)video.currentTime=.01;}}}
const observer=new IntersectionObserver(syncMemes,{threshold:.1});$$('.meme').forEach(v=>{observer.observe(v);v.addEventListener('loadedmetadata',syncMemes);});document.addEventListener('visibilitychange',syncMemes);reduced.addEventListener('change',syncMemes);
updateArtist();showView(location.hash.slice(1)||'artists',true);
document.fonts.load('italic 500 100px GardenDisplay').then(()=>garden.setArtist?.(artists[current].name));
addEventListener('hashchange',()=>showView(location.hash.slice(1)));
addEventListener('pagehide',e=>{player.pauseAll();if(!e.persisted){observer.disconnect();infoJourney.dispose();garden.dispose();}});
