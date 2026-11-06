export function createMenu(onSelect) {
  const header=document.querySelector('.site-header');
  const canopy=document.querySelector('.nav-canopy');
  const triggers=[...document.querySelectorAll('.nav-star,.nav-peek')];
  let open=false,timer=0;
  function setOpen(value){clearTimeout(timer);if(open!==value)document.dispatchEvent(new CustomEvent('garden:menu',{detail:{open:value}}));open=value;document.body.classList.toggle('nav-open',value);canopy.inert=!value;triggers.forEach(b=>b.setAttribute('aria-expanded',String(value)));triggers[0].setAttribute('aria-label',value?'Закрыть меню':'Открыть меню');}
  header.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')setOpen(true);});
  triggers.forEach(b=>b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')setOpen(true);}));
  header.addEventListener('pointerleave',e=>{if(e.pointerType==='touch')return;timer=setTimeout(()=>{if(!header.matches(':hover')&&!canopy.contains(document.activeElement))setOpen(false);},550);});
  canopy.addEventListener('pointerenter',()=>clearTimeout(timer));
  // Touch uses a tap; a focused keyboard user can open with Enter/Space.
  triggers.forEach(b=>b.addEventListener('click',e=>{if(e.pointerType==='mouse'&&open&&b.classList.contains('nav-peek'))return;setOpen(!open);}));
  document.querySelector('.menu-shade').addEventListener('click',()=>setOpen(false));
  document.addEventListener('pointerdown',e=>{if(open&&!header.contains(e.target))setOpen(false);});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{setOpen(false);b.blur();onSelect(b.dataset.view);}));
  header.addEventListener('focusout',()=>{setTimeout(()=>{if(!header.contains(document.activeElement)&&!header.matches(':hover'))setOpen(false);},0);});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&open){setOpen(false);triggers[0].focus();}});
  return {close:()=>setOpen(false)};
}
