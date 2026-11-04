// Alpha 0.18 Living World: deterministic weather, regional history and bounded environmental effects.
import {W,H,T,REGIONS} from '../js/world.js?v=080-frontiers-final';
const types=['Clear','Rain','Windstorm','Heatwave','Cold snap','Ashfall'];
const seeded=(n)=>{let x=(n|0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return((x^(x>>>15))>>>0)/4294967296};
export class LivingWorld{
 constructor(world,factory,dynamics){this.world=world;this.factory=factory;this.dynamics=dynamics;this.cycle=0;this.weather=types.map(()=>0);this.history=[];this.events=0;this.regions=REGIONS.map(r=>({id:r.id,industry:0,damage:0,visits:0}));this.last='The planet is stable';this.enabled=true}
 reset(){this.cycle=0;this.weather.fill(0);this.history=[];this.events=0;this.regions=REGIONS.map(r=>({id:r.id,industry:0,damage:0,visits:0}));this.last='The planet is stable'}
 record(message,region='planet'){const entry={cycle:this.cycle,region,message};this.history.unshift(entry);if(this.history.length>36)this.history.length=36;this.last=message;this.events++;if(this.factory.pendingEvents.length<8)this.factory.pendingEvents.push(message)}
 step(){
  if(!this.enabled||!this.factory.weather)return;
  this.cycle++;
  if(this.cycle%90!==0)return;
  const phase=Math.floor(this.cycle/900),g=this.world.grid;
  for(let i=0;i<4;i++){
   const old=this.weather[i],chance=seeded(this.world.seed+i*113+phase*391),next=chance<.43?0:chance<.63?1:chance<.76?2:chance<.86?3:chance<.94?4:5;
   this.weather[i]=next;
   if(next!==old&&next!==0)this.record(REGIONS[i].title+': '+types[next]+' conditions detected',REGIONS[i].id);
   const region=this.regions[i];region.industry=this.factory.machines.filter(m=>Math.floor(m.x/60)===i).length;
   if(next===1&&this.cycle%180===0){
    for(let n=0;n<12;n++){const x=i*60+((n*17+phase*11)%60),y=72+((n*7+phase)%13);if(this.world.at(x,y)===T.AIR&&this.world.at(x,y+1)===T.AIR)this.world.set(x,y,T.WATER)}
   }
   if(next===3||next===5){for(const m of this.factory.machines){if(Math.floor(m.x/60)!==i)continue;const cell=m.y*W+m.x;this.dynamics.heat[cell]=Math.min(255,this.dynamics.heat[cell]+(next===3?12:4))}}
   if(next===4){for(const m of this.factory.machines){if(Math.floor(m.x/60)!==i)continue;const cell=m.y*W+m.x;this.dynamics.heat[cell]=Math.max(0,this.dynamics.heat[cell]-12)}}
   region.damage=Math.max(0,Math.min(100,Math.round(region.damage*.98+(this.dynamics.pollutionPeak>150?2:0))));
  }
 }
 snapshot(){return{cycle:this.cycle,weather:this.weather.slice(),history:this.history.slice(0,36),events:this.events,regions:this.regions,last:this.last,enabled:this.enabled}}
 restore(s){this.reset();if(!s)return;this.cycle=Math.max(0,Number(s.cycle)||0);if(Array.isArray(s.weather)&&s.weather.length===4)this.weather=s.weather.map(n=>Math.max(0,Math.min(5,n|0)));if(Array.isArray(s.history))this.history=s.history.slice(0,36).filter(x=>x&&typeof x.message==='string');this.events=Number(s.events)||0;if(Array.isArray(s.regions)&&s.regions.length===4)this.regions=s.regions.map((r,i)=>({id:REGIONS[i].id,industry:Number(r.industry)||0,damage:Number(r.damage)||0,visits:Number(r.visits)||0}));this.last=String(s.last||'The planet is stable');this.enabled=s.enabled!==false}
 getWeather(x){return types[this.weather[Math.min(3,Math.max(0,Math.floor(x/60)))]]}
 summary(){return REGIONS.map((r,i)=>({region:r.title,weather:types[this.weather[i]],...this.regions[i]}))}
}
