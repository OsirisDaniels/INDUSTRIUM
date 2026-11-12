// Alpha 0.21: playable on-world engineer with surface collision and lightweight avatar art.
import {W,H,T} from '../js/world.js?v=080-frontiers-final';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function createPlayer(world){
 let x=35,y=70,vy=0,face=1,grounded=false,goal=null,moving=false,steps=0;
 let inputX=0,jumpBuffer=0,follow=false,health=100,stamina=100,style='engineer',respawns=0;
 const free=(cx,cy)=>{const t=world.at(clamp(Math.floor(cx),0,W-1),clamp(Math.floor(cy),0,H-1));return t===T.AIR||t===T.STEAM||t===T.VAPOUR||t===T.FIRE};
 function spawn(cx=35){x=clamp(cx,3,W-4);let found=false;for(let sy=28;sy<H-5;sy++){if(!free(x,sy)&&free(x,sy-1)&&free(x,sy-2)&&free(x,sy-3)){y=sy-1;found=true;break}}if(!found)y=60;vy=0;goal=null;grounded=false;jumpBuffer=0}
 function setInput(h){inputX=clamp(Number(h)||0,-1,1);if(Math.abs(inputX)>.1)goal=null}
 function walkTo(tx){goal=clamp(Number(tx)||x,2,W-3)}
 function jump(){jumpBuffer=.12}
 function step(dt){const t=Math.min(.05,Math.max(0,(Number(dt)||0)/1000));
  let dir=inputX;if(Math.abs(dir)<.1&&goal!==null){const dx=goal-x;if(Math.abs(dx)<.65){goal=null;dir=0}else dir=Math.sign(dx)}
  const jumped=jumpBuffer>0&&grounded&&stamina>=12;
  if(jumped){vy=-20;grounded=false;stamina-=12;jumpBuffer=0}
  else jumpBuffer=Math.max(0,jumpBuffer-t);
  moving=Math.abs(dir)>.1;if(moving){face=Math.sign(dir);const nx=clamp(x+dir*t*(stamina<15?12:17),2,W-3);if(free(nx,y-1)&&free(nx,y-2)&&free(nx,y-3)){x=nx;steps+=t}else if(grounded&&free(nx,y-4)&&free(nx,y-3)){y-=1;x=nx}else{goal=null;moving=false}}
  vy=clamp(vy+46*t,-25,29);const ny=clamp(y+vy*t,5,H-3);
  if(vy>=0&&!free(x,ny+1)){y=Math.floor(ny);vy=0;grounded=true}
  else if(vy<0&&!free(x,ny-3)){vy=0;grounded=false}
  else{y=ny;grounded=false}
  if(!free(x,y-2))spawn(x);
  stamina=clamp(stamina+t*(moving?3:13),0,100);
  const foot=world.at(Math.floor(x),Math.floor(y)+1),near=world.at(Math.floor(x),Math.floor(y)-2);
  if([T.LAVA,T.ACID,T.FIRE].includes(foot)||[T.LAVA,T.ACID,T.FIRE].includes(near))health=clamp(health-t*16,0,100);
  else health=clamp(health+t*.35,0,100);
  if(health<=0){health=100;stamina=100;respawns++;spawn(35)}
  return jumped;
 }
 function draw(g,time=0){if(!g)return;g.clear();const px=x*4,py=y*4,walk=moving&&grounded?Math.sin(time*.017)*2:0;
  g.fillStyle(0x000a12,.35);g.fillEllipse(px,py+2,18,5);
  g.fillStyle(0x183340,1);g.fillRoundedRect(px-7,py-18,14,13,3);
  g.fillStyle(style==='surveyor'?0x6eaff5:style==='mechanic'?0xf0bd72:0x7cdfb7,1);g.fillRoundedRect(px-6,py-17,12,11,2);
  g.fillStyle(0xf4b96e,1);g.fillRoundedRect(px-6,py-30,12,13,4);
  g.fillStyle(style==='surveyor'?0xc9e6f9:style==='mechanic'?0xf5b775:0xf9df9b,1);g.fillRoundedRect(px-7,py-32,14,7,3);
  g.fillStyle(0x17303c,1);g.fillRoundedRect(px-4,py-27,9,5,2);
  g.fillStyle(0x98f5fa,1);g.fillRect(px+(face>0?1:-3),py-26,3,2);
  g.fillStyle(0xcfa468,1);g.fillRect(px-9,py-15,3,9);g.fillRect(px+6,py-15,3,9);
  g.fillStyle(0x355464,1);g.fillRect(px-5,py-6,4,6+walk);g.fillRect(px+1,py-6,4,6-walk);
  g.fillStyle(0x162934,1);g.fillRect(px-6,py+walk,5,3);g.fillRect(px+1,py-walk,5,3);
 }
 function snapshot(){return{x,y,follow,health,stamina,style,respawns}}
 function restore(s){if(Number.isFinite(s?.x)&&Number.isFinite(s?.y)){x=clamp(s.x,2,W-3);y=clamp(s.y,5,H-3);vy=0;goal=null;grounded=false;jumpBuffer=0}else spawn();follow=!!s?.follow;health=clamp(Number(s?.health)||100,1,100);stamina=clamp(Number.isFinite(Number(s?.stamina))&&s?.stamina!=null?Number(s.stamina):100,0,100);style=['engineer','surveyor','mechanic'].includes(s?.style)?s.style:'engineer';respawns=Math.max(0,Number(s?.respawns)||0)}
 spawn();
 return{spawn,step,draw,setInput,walkTo,jump,snapshot,restore,get x(){return x},get y(){return y},get face(){return face},get moving(){return moving},get grounded(){return grounded},get follow(){return follow},set follow(v){follow=!!v},get steps(){return steps},get health(){return health},get stamina(){return stamina},get respawns(){return respawns},get style(){return style},set style(v){if(['engineer','surveyor','mechanic'].includes(v))style=v}};
}
