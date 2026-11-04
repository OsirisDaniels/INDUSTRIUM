// INDUSTRIUM Alpha 0.16: lightweight procedural sound, no downloads or audio files.
export function createSound(){
 let ctx=null,enabled=true,volume=.35,last={},ambient=null;
 const Audio=window.AudioContext||window.webkitAudioContext;
 function unlock(){if(!enabled||!Audio)return;try{if(!ctx)ctx=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch(e){}}
 function tone(freq=440,duration=.06,type='sine',gain=.2,end=freq){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime,o=ctx.createOscillator(),v=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+duration);
  v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*gain),t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(v);v.connect(ctx.destination);o.start(t);o.stop(t+duration+.015);
 }
 function play(name){
  if(!enabled)return;
  const now=performance.now(),gap=name==='paint'?90:name==='hover'?130:45;
  if(now-(last[name]||0)<gap)return;last[name]=now;
  unlock();
  switch(name){
   case 'click':tone(510,.045,'sine',.13,410);break;
   case 'select':tone(450,.07,'triangle',.2,620);break;
   case 'build':tone(165,.12,'square',.14,105);tone(440,.09,'triangle',.17,580);break;
   case 'error':tone(190,.13,'sawtooth',.13,125);break;
   case 'paint':tone(210,.04,'triangle',.045,175);break;
   case 'dig':tone(140,.08,'triangle',.1,80);break;
   case 'inspect':tone(650,.06,'sine',.12,830);break;
   case 'save':tone(500,.09,'sine',.13,740);break;
   case 'pause':tone(350,.08,'triangle',.13,270);break;
   case 'resume':tone(320,.08,'triangle',.14,500);break;
   case 'zoom':tone(420,.04,'sine',.08,460);break;
  }
 }
 function setEnabled(on){enabled=!!on;if(!enabled&&ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});if(enabled)unlock()}
 function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0))}
 function dispose(){if(ctx)ctx.close().catch(()=>{});ctx=null}
 return{play,unlock,setEnabled,setVolume,dispose,get enabled(){return enabled},get volume(){return volume}};
}
