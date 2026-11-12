// Alpha 0.17: adaptive frame budgeting and live performance telemetry.
// Measures JS workload and elapsed time between frames. Never modifies saved world data.
export function createPerformance(touchFirst=false){
 const initialTier=touchFirst?1:0;
 let quality='auto',tier=initialTier,avg=12,frameMs=16.7,sim=0,render=0,frames=0,slow=0,fast=0,lastAdjust=0;
 const levels=[
  {name:'Full',simStep:40,terrainMs:95,machineMs:110,fxMs:180,hudMs:500,steps:2},
  {name:'Balanced',simStep:48,terrainMs:130,machineMs:170,fxMs:260,hudMs:650,steps:2},
  {name:'Fast',simStep:65,terrainMs:190,machineMs:280,fxMs:480,hudMs:900,steps:1},
  {name:'Ultra',simStep:85,terrainMs:260,machineMs:380,fxMs:900,hudMs:1100,steps:1}
 ];
 function report(work,simulation,graphics,now,elapsed){
  if(!Number.isFinite(work))return;
  avg=avg*.92+work*.08;sim=sim*.86+simulation*.14;render=render*.86+graphics*.14;frames++;
  if(Number.isFinite(elapsed)&&elapsed>0&&elapsed<250)frameMs=frameMs*.92+elapsed*.08;
  if(quality!=='auto'||now-lastAdjust<2000)return;
  if(avg>14||frameMs>23){slow++;fast=0}else if(avg<9&&frameMs<19){fast++;slow=0}else{slow=0;fast=0}
  if(slow>25&&tier<3){tier++;slow=0;lastAdjust=now}
  if(fast>240&&tier>initialTier&&now-lastAdjust>=8000){tier--;fast=0;lastAdjust=now}
 }
 function config(battery){return levels[battery?Math.max(2,tier):tier]}
 function setMode(v){quality=['auto','full','balanced','fast','ultra'].includes(v)?v:'auto';tier=quality==='auto'?initialTier:['full','balanced','fast','ultra'].indexOf(quality);slow=0;fast=0}
 return{report,config,setMode,get mode(){return quality},get tier(){return tier},get name(){return levels[tier].name},get stats(){return{work:avg,simulation:sim,graphics:render,frames,tier}}};
}
