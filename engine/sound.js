// Alpha 0.23: procedural industrial soundscape, rendered with Web Audio. No remote assets.
export function createSound(){
 let ctx=null,enabled=true,volume=.35,ambience=true,last={},lastAtmosphere=0,noiseBuffer=null;
 const Audio=window.AudioContext||window.webkitAudioContext;
 function unlock(){if(!enabled||!Audio)return;try{if(!ctx)ctx=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch(e){}}
 function tone(freq=440,duration=.06,type='sine',gain=.2,end=freq,delay=0){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime+delay,o=ctx.createOscillator(),v=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+duration);
  v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*gain),t+.009);v.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(v);v.connect(ctx.destination);o.start(t);o.stop(t+duration+.016);
 }
 function noise(duration=.11,gain=.12,filter=900){
  if(!enabled||!ctx||ctx.state!=='running')return;
  if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.34),ctx.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const t=ctx.currentTime,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),v=ctx.createGain();
  s.buffer=noiseBuffer;f.type='lowpass';f.frequency.value=filter;
  v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*gain),t+.01);v.gain.exponentialRampToValueAtTime(.0001,t+duration);
  s.connect(f);f.connect(v);v.connect(ctx.destination);s.start(t);s.stop(t+duration+.01);
 }
 function play(name){
  if(!enabled)return;
  const now=performance.now(),gap=['footstep','paint','water'].includes(name)?230:['hum','rain','wind','ash','drill','furnace'].includes(name)?1400:65;
  if(now-(last[name]||0)<gap)return;last[name]=now;unlock();
  switch(name){
   case 'click':tone(510,.045,'sine',.12,410);break;
   case 'select':tone(440,.065,'triangle',.19,640);break;
   case 'build':tone(165,.12,'square',.16,105);tone(440,.1,'triangle',.16,580,.07);break;
   case 'error':tone(200,.13,'sawtooth',.14,125);break;
   case 'paint':noise(.045,.06,720);break;
   case 'dig':noise(.1,.17,420);tone(150,.09,'triangle',.08,82);break;
   case 'inspect':tone(650,.06,'sine',.12,840);break;
   case 'save':tone(500,.09,'sine',.13,740);tone(710,.12,'sine',.1,900,.08);break;
   case 'pause':tone(350,.08,'triangle',.13,270);break;
   case 'resume':tone(320,.08,'triangle',.14,500);break;
   case 'zoom':tone(420,.04,'sine',.08,460);break;
   case 'footstep':noise(.045,.11,270);break;
   case 'jump':tone(250,.12,'triangle',.18,420);break;
   case 'land':noise(.075,.17,340);break;
   case 'drill':noise(.14,.065,390);tone(115,.12,'sawtooth',.04,94);break;
   case 'furnace':noise(.19,.06,650);tone(110,.17,'sine',.07,101);break;
   case 'hum':tone(93,.25,'sine',.038,89);break;
   case 'power':tone(170,.16,'sine',.12,230);break;
   case 'shutdown':tone(400,.26,'sawtooth',.13,85);break;
   case 'startup':tone(160,.14,'triangle',.12,480);break;
   case 'warning':tone(580,.09,'square',.1,540);tone(560,.1,'square',.08,490,.15);break;
   case 'repair':noise(.08,.1,1300);tone(600,.11,'sine',.12,760,.06);break;
   case 'automation':tone(520,.045,'sine',.09,660);tone(720,.09,'sine',.08,560,.06);break;
   case 'rain':noise(.25,.08,2500);break;
   case 'wind':noise(.28,.065,600);break;
   case 'ash':noise(.19,.06,330);break;
   case 'water':noise(.11,.06,1900);break;
   case 'steam':noise(.15,.055,1600);break;
   case 'lava':tone(92,.22,'sawtooth',.045,76);noise(.14,.045,220);break;
   case 'ore':tone(690,.085,'triangle',.12,940);break;
   case 'contract':tone(440,.1,'sine',.13,570);tone(620,.15,'sine',.1,840,.1);break;
  }
 }
 function step({weather='Clear',machines=0,nearbyKinds=[],moving=false,hot=false,now=performance.now()}={}){
  if(!ambience||!enabled||!ctx||ctx.state!=='running'||now-lastAtmosphere<1600||typeof document!=='undefined'&&document.hidden)return;
  lastAtmosphere=now;
  if(weather==='Rain')play('rain');else if(weather==='Windstorm')play('wind');else if(weather==='Ashfall')play('ash');
  else if(weather==='Heatwave'&&hot)play('lava');else if(nearbyKinds.includes('furnace')||nearbyKinds.includes('refinery')||nearbyKinds.includes('kiln'))play('furnace');else if(nearbyKinds.some(k=>['drill','deepdrill','oilrig','excavator'].includes(k)))play('drill');else if(machines>0)play('hum');
  if(moving)play('footstep');
 }
 function setEnabled(on){enabled=!!on;if(!enabled&&ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});if(enabled)unlock()}
 function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0))}
 function setAmbience(on){ambience=!!on}
 function dispose(){if(ctx)ctx.close().catch(()=>{});ctx=null;noiseBuffer=null}
 return{play,step,unlock,setEnabled,setVolume,setAmbience,dispose,get enabled(){return enabled},get volume(){return volume},get ambience(){return ambience}};
}