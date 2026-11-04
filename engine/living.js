// Alpha 0.22: moving regional weather, groundwater, erosion and persistent planetary memory.
import {W,H,T,REGIONS} from '../js/world.js?v=080-frontiers-final';
const types=['Clear','Rain','Windstorm','Heatwave','Cold snap','Ashfall'];
const seeded=(n)=>{let x=(n|0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return((x^(x>>>15))>>>0)/4294967296};
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
export class LivingWorld{
 constructor(world,factory,dynamics){this.world=world;this.factory=factory;this.dynamics=dynamics;this.enabled=true;this.reset()}
 reset(){this.cycle=0;this.front=0;this.weather=REGIONS.map(()=>0);this.history=[];this.events=0;this.regions=REGIONS.map(r=>({id:r.id,industry:0,damage:0,visits:0,humidity:45,erosion:0}));this.last='The planet is stable'}
 record(message,region='planet'){const entry={cycle:this.cycle,region,message};this.history.unshift(entry);if(this.history.length>36)this.history.length=36;this.last=message;this.events++;if(this.factory.pendingEvents.length<8)this.factory.pendingEvents.push(message)}
 atSurface(x){const g=this.world.grid;for(let y=49;y<H-3;y++)if(g[y*W+x]!==T.AIR&&g[y*W+x]!==T.STEAM&&g[y*W+x]!==T.VAPOUR)return y;return H-3}
 rain(i,phase){const g=this.world,reg=this.regions[i];for(let j=0;j<16;j++){const x=i*60+((j*29+phase*17+this.cycle)%60),y=this.atSurface(x);if(y<4)continue;const above=y-1;if(g.at(x,above)!==T.AIR||g.blocks[above*W+x])continue;g.set(x,above,T.WATER)}
  for(let j=0;j<8;j++){const x=i*60+((j*19+phase*7)%60),y=this.atSurface(x);if(g.at(x,y)===T.SANDSOIL&&g.at(x,y-1)===T.WATER){g.set(x,y,T.SILT);reg.erosion++}}
  reg.humidity=cap(reg.humidity+6,0,100)}
 storm(i,phase){const g=this.world;for(let j=0;j<8;j++){const x=i*60+((j*23+phase*13)%60),y=this.atSurface(x);if(g.at(x,y)===T.SAND&&g.at(x+1,y-1)===T.AIR&&x+1<(i+1)*60)g.swap(y*W+x,(y-1)*W+x+1)}}
 temperature(i,phase,hot){const w=this.world,g=w.grid,r=this.regions[i];for(let j=0;j<14;j++){const x=i*60+((j*17+phase*9)%60),y=this.atSurface(x),tile=g.at(x,y);if(hot&&tile===T.ICE)w.set(x,y,T.WATER);if(!hot&&tile===T.WATER)w.set(x,y,T.ICE)}r.humidity=cap(r.humidity+(hot?-3:1),0,100)}
 step(){
  if(!this.enabled||!this.factory.weather)return;
  this.cycle++;if(this.cycle%48!==0)return;
  const phase=Math.floor(this.cycle/144),front=(phase+Math.floor(seeded(this.world.seed)*4))%4;this.front=front;
  const machinesByRegion=[[],[],[],[]];for(const m of this.factory.machines)machinesByRegion[cap(Math.floor(m.x/60),0,3)].push(m);
  for(let i=0;i<4;i++){
   const old=this.weather[i],roll=seeded(this.world.seed+i*163+phase*397),onFront=i===front;
   const next=onFront?(roll<.55?1:roll<.78?2:roll<.88?3:roll<.95?4:5):(roll<.55?0:roll<.68?1:roll<.79?2:roll<.87?3:roll<.94?4:5);
   this.weather[i]=next;
   const reg=this.regions[i],local=machinesByRegion[i];reg.industry=local.length;
   if(next!==old)this.record(REGIONS[i].title+': '+types[next]+' conditions',REGIONS[i].id);
   if(next===1)this.rain(i,phase);
   if(next===2)this.storm(i,phase);
   if(next===3||next===4)this.temperature(i,phase,next===3);
   if(next===5){for(let j=0;j<7;j++){const x=i*60+((j*31+phase*5)%60),y=this.atSurface(x);if(this.world.at(x,y-1)===T.AIR)this.world.set(x,y-1,T.BURNT_RESIDUE)}}
   if(next!==1)reg.humidity=cap(reg.humidity-(next===3?3:1),0,100);
   if(next===3||next===5){for(const m of local){const cell=m.y*W+m.x;this.dynamics.heat[cell]=Math.min(255,this.dynamics.heat[cell]+(next===3?12:4))}}
   if(next===4){for(const m of local){const cell=m.y*W+m.x;this.dynamics.heat[cell]=Math.max(0,this.dynamics.heat[cell]-12)}}
   const pollution=local.reduce((n,m)=>n+(this.dynamics.pollution[m.y*W+m.x]||0),0);
   reg.damage=cap(Math.round(reg.damage*.985+pollution/Math.max(1,local.length)/35+reg.erosion/200),0,100);
  }
 }
 snapshot(){return{cycle:this.cycle,front:this.front,weather:this.weather.slice(),history:this.history.slice(0,36),events:this.events,regions:this.regions,last:this.last,enabled:this.enabled}}
 restore(s){this.reset();if(!s)return;this.cycle=Math.max(0,Number(s.cycle)||0);this.front=cap(Number(s.front)||0,0,3);if(Array.isArray(s.weather)&&s.weather.length===4)this.weather=s.weather.map(n=>cap(n|0,0,5));if(Array.isArray(s.history))this.history=s.history.slice(0,36).filter(x=>x&&typeof x.message==='string');this.events=Number(s.events)||0;if(Array.isArray(s.regions)&&s.regions.length===4)this.regions=s.regions.map((r,i)=>({id:REGIONS[i].id,industry:Number(r.industry)||0,damage:Number(r.damage)||0,visits:Number(r.visits)||0,humidity:cap(Number.isFinite(Number(r.humidity))&&r.humidity!=null?Number(r.humidity):45,0,100),erosion:Number(r.erosion)||0}));this.last=String(s.last||'The planet is stable');this.enabled=s.enabled!==false}
 getWeather(x){if(!this.factory.weather)return 'Clear';return types[this.weather[cap(Math.floor(x/60),0,3)]]||'Clear'}
 summary(){return REGIONS.map((r,i)=>({region:r.title,weather:types[this.weather[i]],front:this.front===i,...this.regions[i]}))}
}