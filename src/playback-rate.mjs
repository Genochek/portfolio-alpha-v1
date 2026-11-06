// Absolute time keeps a paused player or a throttled background tab from
// stretching the transition. Retargeting samples the interrupted curve first.
export function createPlaybackRateTransition(initial=1){
  let from=initial,target=initial,started=0,value=initial,active=false;
  function valueAt(now){
    if(!active)return value;
    const t=Math.min(1,Math.max(0,(now-started)/700));
    value=from+(target-from)*t*t*(3-2*t);
    if(t===1){value=target;active=false;}
    return value;
  }
  return {valueAt,retarget(next,now,immediate=false){
    from=valueAt(now);target=next;started=now;active=!immediate&&from!==target;
    if(!active)value=target;
    return value;
  },get active(){return active;}};
}
