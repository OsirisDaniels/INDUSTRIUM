// Alpha 0.21: deterministic bounded automation. No background tasks or hidden spending outside policy.
import {DEMAND} from '../js/factory.js?v=0230';
const rank={pump:1,cooler:2,filter:2,drill:4,deepdrill:5,collector:4,oilrig:6,refinery:9,distiller:8,press:8,furnace:7,mixer:6};
export class Autonomy {
 constructor(factory,intelligence){this.factory=factory;this.intelligence=intelligence;this.mode='balanced';this.autoService=true;this.cycles=0;this.actions=0;this.logs=[]}
 reset(){this.mode='balanced';this.autoService=true;this.cycles=0;this.actions=0;this.logs=[];for(const m of this.factory.machines)m.autoHold=false}
 log(msg){this.logs.unshift({cycle:this.factory.cycle,message:msg});this.logs.length=Math.min(this.logs.length,24);this.actions++}
 step(){
  this.cycles++;if(this.cycles%8)return;
  const all=this.factory.machines;
  for(const m of all)if(['belt','filter','hopper'].includes(m.kind))m.smartRoute=this.mode!=='off';
  if(this.mode==='off'||this.mode==='production'){for(const m of all)m.autoHold=false}
  else {
   for(const m of all)if(m.autoHold)m.autoHold=false;
   const power=this.factory.power(),supply=power.production;
   let load=all.reduce((n,m)=>n+(m.safetyHold?0:DEMAND[m.kind]||0),0);
   if(load>supply){const candidates=all.filter(m=>!m.safetyHold&&(DEMAND[m.kind]||0)>0).sort((a,b)=>(rank[b.kind]||6)-(rank[a.kind]||6));
    for(const m of candidates){if(load<=supply)break;if((this.mode==='balanced')&&['cooler','pump','filter','stabilizer'].includes(m.kind))continue;m.autoHold=true;load-=DEMAND[m.kind]||0}
   }
  }
  if(!this.autoService||this.cycles%64)return;
  const reserves=this.mode==='eco'?550:250;
  if(this.factory.credits<reserves+30)return;
  const worst=all.filter(m=>(m.wear||0)>75||m.integrity<40).sort((a,b)=>((100-(a.integrity??100))+(a.wear||0))-((100-(b.integrity??100))+(b.wear||0))).at(-1);
  if(!worst)return;
  if(worst.integrity<40){const cost=Math.max(12,Math.ceil((100-worst.integrity)*2));if(this.factory.credits-cost<reserves)return;const result=this.factory.repair(worst);if(result.includes('repaired'))this.log('Auto-repair: '+result)}
  else{const cost=Math.max(10,Math.ceil((worst.wear||0)*.85));if(this.factory.credits-cost<reserves)return;const result=this.intelligence.service(worst);if(result.includes('Serviced'))this.log('Auto-service: '+result)}
 }
 snapshot(){return{mode:this.mode,autoService:this.autoService,cycles:this.cycles,actions:this.actions,logs:this.logs.slice(0,24)}}
 restore(s){this.mode=['off','balanced','eco','production'].includes(s?.mode)?s.mode:'balanced';this.autoService=s?.autoService!==false;this.cycles=Math.max(0,Number(s?.cycles)||0);this.actions=Math.max(0,Number(s?.actions)||0);this.logs=Array.isArray(s?.logs)?s.logs.filter(v=>v&&typeof v.message==='string').slice(0,24):[]}
}
