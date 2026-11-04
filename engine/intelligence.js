// Alpha 0.19: bounded machine intelligence, wear, safety controls and diagnostics.
import {DEMAND} from '../js/factory.js?v=080-frontiers-final';
import {W,T} from '../js/world.js?v=080-frontiers-final';
const industrial=new Set(['furnace','refinery','kiln','combustor','distiller','generator','press','oilrig','deepdrill']);
export class Intelligence{
 constructor(world,factory,dynamics,living){this.world=world;this.factory=factory;this.dynamics=dynamics;this.living=living;this.cycle=0;this.autoSafety=true;this.alerts=[];this.maintenance=0}
 reset(){this.cycle=0;this.alerts=[];this.maintenance=0;this.autoSafety=true}
 alert(message){if(this.alerts[0]?.message===message)return;this.alerts.unshift({cycle:this.cycle,message});if(this.alerts.length>18)this.alerts.length=18}
 step(){
  if(++this.cycle%24!==0)return;
  const p=this.factory.power();
  for(const m of this.factory.machines){
   if(!Number.isFinite(m.integrity))m.integrity=100;
   m.wear=Math.max(0,Math.min(100,Number(m.wear)||0));
   const cell=m.y*W+m.x,heat=this.dynamics.heat[cell]||0,weather=this.living.getWeather(m.x),powered=DEMAND[m.kind]===0||p.online;
   const busy=powered&&m.lastAction&&!/ready|waiting|needs|blocked|insufficient|standby|searching/i.test(m.lastAction);
   const wearRate=(busy?.22:.035)*(industrial.has(m.kind)?1.4:1)*(weather==='Ashfall'?1.35:1);
   m.wear=Math.min(100,m.wear+wearRate);
   if(m.wear>=70&&this.cycle%120===0){m.integrity=Math.max(1,m.integrity-(m.wear>90?2:1));this.alert(m.kind+' at '+m.x+','+m.y+' needs maintenance')}
   if(heat>=180&&industrial.has(m.kind)){this.alert(m.kind+' at '+m.x+','+m.y+' overheating');if(this.autoSafety){m.safetyHold=true;m.lastAction='Safety shutdown · overheating'}}
   else if(m.safetyHold&&heat<115)m.safetyHold=false;
   if(m.integrity<30)this.alert(m.kind+' at '+m.x+','+m.y+' critical integrity');
  }
 }
 service(m){if(!this.factory.machines.includes(m))return 'Select a machine';const cost=Math.max(10,Math.ceil((m.wear||0)*.85));if(this.factory.credits<cost)return 'Maintenance requires $'+cost;m.wear=0;m.safetyHold=false;this.factory.credits-=cost;this.factory.expenses+=cost;this.maintenance++;m.lastAction='Serviced';return 'Serviced '+m.kind+' for $'+cost}
 snapshot(){return{cycle:this.cycle,autoSafety:this.autoSafety,alerts:this.alerts.slice(0,18),maintenance:this.maintenance}}
 restore(s){this.reset();if(!s)return;this.cycle=Number(s.cycle)||0;this.autoSafety=s.autoSafety!==false;this.alerts=Array.isArray(s.alerts)?s.alerts.slice(0,18):[];this.maintenance=Number(s.maintenance)||0}
 diagnostics(m){if(!m)return null;const p=this.factory.power(),cell=m.y*W+m.x;return{kind:m.kind,health:m.integrity??100,wear:Math.round(m.wear||0),heat:this.dynamics.heat[cell]||0,pollution:this.dynamics.pollution[cell]||0,safety:m.safetyHold?'Shutdown':'Normal',power:DEMAND[m.kind]===0||p.online?'Online':'Offline',action:m.lastAction||'Ready'}}
}
