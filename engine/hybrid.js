// INDUSTRIUM Alpha 0.24: hybrid rendering and reactive microphysics.
// This module adds deterministic, bounded environmental interactions without changing
// the world's material IDs, grid dimensions, factory serialization, or save format.
import {W,H,T} from '../js/world.js?v=080-frontiers-final';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fluid=new Set([T.WATER,T.OIL,T.ACID,T.LAVA]);
const loose=new Set([T.SAND,T.SILT,T.RESIDUE,T.BURNT_RESIDUE,T.SNOW,T.ORE,T.WET_SAND]);
const mineral=new Set([T.STONE,T.BASALT,T.ORE,T.METAL,T.GLASS,T.OBSIDIAN]);
const HOT=new Set([T.LAVA,T.FIRE]);
export function createHybrid(world,factory,dynamics){
 let enabled=true,detail='auto',frame=0,pressureEvents=0,heatEvents=0,slides=0;
 const activity=new Uint8Array(W*H);
 const sample=(x,y)=>x>=0&&x<W&&y>=0&&y<H?world.grid[y*W+x]:T.STONE;
 function step(){
  if(!enabled)return;
  frame++;
  // Sample one quarter of the world every pass. Stable, deterministic and O(300) work.
  const phase=frame&3,g=world.grid,blocks=world.blocks;
  for(let k=0;k<288;k++){
   const x=2+((k*47+phase*59+frame*7)%(W-4));
   const y=65+((k*31+phase*17+frame*3)%(H-68));
   const i=y*W+x,t=g[i];if(blocks[i])continue;
   if(fluid.has(t)){
    const up=g[i-W],below=g[i+W],left=g[i-1],right=g[i+1];
    // Confined liquid columns gain lateral pressure and escape into open cavities.
    if(fluid.has(up)&&fluid.has(below)&&left!==T.AIR&&right===T.AIR&&!blocks[i+1]&&frame%2===0){
     world.swap(i,i+1);activity[i+1]=12;pressureEvents++;continue;
    }
    if(fluid.has(up)&&fluid.has(below)&&right!==T.AIR&&left===T.AIR&&!blocks[i-1]&&frame%2===0){
     world.swap(i,i-1);activity[i-1]=12;pressureEvents++;continue;
    }
    // Hot water evaporates near lava; cooled lava produces a permanent rocky crust.
    if(t===T.WATER&&(HOT.has(left)||HOT.has(right)||HOT.has(up)||HOT.has(below))){
     world.set(x,y,T.STEAM);activity[i]=22;heatEvents++;continue;
    }
    if(t===T.LAVA&&(left===T.WATER||right===T.WATER||below===T.WATER)){
     world.set(x,y,T.OBSIDIAN);activity[i]=26;heatEvents++;continue;
    }
   }else if(loose.has(t)){
    // An unsupported lip can crumble into an open diagonal, even when it was
    // previously static due to an adjacent support or low-frequency simulation.
    if(g[i+W]===T.AIR){
     const dir=(frame+k)&1?1:-1,at=i+W+dir;
     if(x+dir>1&&x+dir<W-2&&g[at]===T.AIR&&!blocks[at]&&frame%3===0){
      world.swap(i,at);activity[at]=10;slides++;
     }
    }
   }
  }
  // Visual activity is ephemeral and intentionally not part of the save.
  for(let k=0;k<80;k++){const i=(frame*307+k*479)%(W*H);if(activity[i])activity[i]--}
 }
 function draw(g,time,quality='balanced',weather=[]){
  if(!g)return;g.clear();if(!enabled)return;
  const fast=quality==='Fast'||quality==='Ultra'||quality==='fast'||quality==='ultra'||detail==='low';
  const t=time*.001;
  // Distinct light zones: ambient shafts, machine light, reflections and heat shimmer.
  const shafts=fast?3:7;
  for(let k=0;k<shafts;k++){
   const x=35+k*(W*4/shafts)+Math.sin(t*.12+k)*11;
   g.fillStyle(0x86c6df,fast?.012:.021);
   g.fillTriangle(x-21,0,x+20,0,x+49,390);
  }
  // Limit dynamic lighting to nearby installations and cap GPU draw commands.
  const machines=factory.machines,cap=fast?16:40,stride=Math.max(1,Math.ceil(machines.length/cap));
  for(let i=0;i<machines.length;i+=stride){
   const m=machines[i];if(m.autoHold||m.safetyHold)continue;
   const x=m.x*4,y=m.y*4,hot=['furnace','kiln','combustor','refinery','distiller'].includes(m.kind);
   const active=['generator','battery','solar','wind','waterwheel'].includes(m.kind)||hot;
   if(!active)continue;
   const c=hot?0xff9a56:0x81e7cc,pulse=1+Math.sin(t*2+m.x)*.12;
   g.fillStyle(c,fast?.035:.06);g.fillCircle(x,y,(hot?20:15)*pulse);
   g.fillStyle(c,fast?.045:.075);g.fillCircle(x,y,(hot?11:8)*pulse);
   if(hot&&!fast){g.fillStyle(0xffcf8b,.5);g.fillCircle(x+Math.sin(t*3+m.x)*4,y-14-((time*.025+m.x)%18),1.6)}
  }
  const particles=fast?12:32;
  for(let k=0;k<particles;k++){
   const x=4+((k*89+(time*.023|0))%(W*4-8)),y=120+((k*61+(time*.047|0))%430),cell=clamp(Math.floor(x/4),0,W-1)+clamp(Math.floor(y/4),0,H-1)*W;
   if(activity[cell]){g.fillStyle(0xa9e5e9,.18+activity[cell]/65);g.fillCircle(x,y,1.4)}
  }
  // Weather lighting: subtle region tint only. The underlying terrain remains legible.
  for(let r=0;r<4;r++){
   const w=weather[r]||0;if(w===3){g.fillStyle(0xff9859,.025);g.fillRect(r*240,0,240,450)}
   else if(w===4){g.fillStyle(0x93c6f4,.024);g.fillRect(r*240,0,240,450)}
   else if(w===5){g.fillStyle(0xb7a68e,.025);g.fillRect(r*240,0,240,450)}
  }
 }
 function stats(){return{pressureEvents,heatEvents,slides,enabled,detail}}
 return{step,draw,stats,reset(){frame=0;activity.fill(0);pressureEvents=0;heatEvents=0;slides=0},get enabled(){return enabled},set enabled(v){enabled=!!v},get detail(){return detail},set detail(v){detail=['auto','low','high'].includes(v)?v:'auto'}};
}
