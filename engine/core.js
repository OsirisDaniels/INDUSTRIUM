// Alpha 0.20: local deterministic factory intelligence. No network or external AI.
import {DEMAND} from '../js/factory.js?v=0200';
const title=s=>s.charAt(0).toUpperCase()+s.slice(1);
export function createCore(factory,dynamics,living,intelligence){
 let lastCycle=-1,cached=[];
 function analyse(){
  if(factory.cycle===lastCycle)return cached;lastCycle=factory.cycle;
  const machines=factory.machines,p=factory.power(),issues=[];
  const add=(priority,label,detail,action)=>issues.push({priority,label,detail,action});
  if(!machines.length)add(2,'Your planet is waiting','Build a generator and drill to start producing resources.','Open Build and choose Power or Extraction.');
  if(!p.online&&p.use>0)add(3,'Power grid overloaded','Your grid needs '+Math.max(0,p.use-p.production)+' additional power to operate every machine.','Add power generation or reduce consumption.');
  if(p.production>p.use*2&&p.use>0)add(1,'Unused power capacity','Your generators produce considerably more energy than your factory uses.','Expand production before investing in more generators.');
  for(const m of machines){
   const name=title(m.kind)+' ('+m.x+', '+m.y+')',action=m.lastAction||'';
   if(m.safetyHold)add(3,name+' safety shutdown','High temperatures have stopped this machine to prevent further damage.','Inspect cooling and nearby heat sources.');
   if((m.integrity??100)<40)add(3,name+' critical condition','Integrity '+Math.round(m.integrity)+'%. Failure risk is elevated.','Inspect and repair the machine.');
   else if((m.wear||0)>=65)add(2,name+' maintenance due','Wear '+Math.round(m.wear)+'%. Servicing can restore reliability.','Inspect and service the machine.');
   if(/needs|blocked|waiting|searching|insufficient/i.test(action)&&DEMAND[m.kind]!==0)add(1,name+' production bottleneck',action+'.','Check nearby raw materials, power and output routes.');
  }
  if(dynamics.pollutionPeak>170)add(2,'Regional pollution rising','Industrial emissions have reached '+dynamics.pollutionPeak+'.','Reduce dirty machinery and add stabilisers.');
  if(dynamics.heatPeak>190)add(2,'Thermal warning','Peak environmental heat is '+dynamics.heatPeak+'.','Install cooling and avoid concentrating hot machines.');
  const storms=living.summary().filter(r=>r.weather!=='Clear');
  if(storms.length)add(1,'Planetary conditions',storms.map(r=>r.region+': '+r.weather).join(' · '),'Monitor regional machinery and environmental conditions.');
  issues.sort((a,b)=>b.priority-a.priority);
  cached=issues.slice(0,14);return cached;
 }
 function snapshot(){const p=factory.power(),all=factory.machines,working=all.filter(m=>!/needs|blocked|insufficient|shutdown|waiting/i.test(m.lastAction||'')).length;return{machines:all.length,working,power:p.production,powerUse:p.use,credits:factory.credits,issues:analyse(),weather:living.summary(),alerts:intelligence.alerts.slice(0,6),history:living.history.slice(0,8)}}
 return{analyse,snapshot,refresh(){lastCycle=-1}};
}
