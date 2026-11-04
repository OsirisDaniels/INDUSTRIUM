// INDUSTRIUM Alpha 0.25: conservative structural integrity and fluid containment.
// Optional, bounded and versioned. No new terrain material IDs or save key changes.
import {W,H,T} from '../js/world.js?v=0242';
const fragile=new Set([T.SANDSOIL,T.ICE,T.GLASS]);
const liquid=new Set([T.WATER,T.OIL,T.ACID,T.LAVA]);
const solid=new Set([T.STONE,T.BASALT,T.METAL,T.OBSIDIAN,T.GLASS,T.SANDSOIL,T.ICE]);
const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createStructures(world,factory){
 let enabled=true,frame=0,collapses=0,pressureReleases=0,damageEvents=0;
 const stress=new Uint8Array(W*H),pressure=new Uint8Array(W*H);
 const recent=[];
 function log(message){recent.unshift({cycle:world.tick,message});if(recent.length>18)recent.length=18}
 function reset(){stress.fill(0);pressure.fill(0);frame=0;collapses=0;pressureReleases=0;damageEvents=0;recent.length=0}
 function snapshot(){return{version:1,enabled,collapses,pressureReleases,damageEvents,events:recent.slice(0,12)}}
 function restore(s){reset();if(!s||typeof s!=='object')return;enabled=s.enabled!==false;collapses=cap(Number(s.collapses)||0,0,1000000);pressureReleases=cap(Number(s.pressureReleases)||0,0,1000000);damageEvents=cap(Number(s.damageEvents)||0,0,1000000);if(Array.isArray(s.events))for(const e of s.events.slice(0,12))if(e&&typeof e.message==='string')recent.push({cycle:Number(e.cycle)||0,message:e.message.slice(0,140)})}
 function step(){
  if(!enabled)return;
  frame++;
  // Deterministic rolling window; never scans more than 320 cells per call.
  const g=world.grid,b=world.blocks,scan=320;
  for(let n=0;n<scan;n++){
   const i=1+((frame*239+n*97)%(W*(H-2)-2)),y=1+(i/W|0),x=i%W;
   if(x<2||x>W-3||y<68||y>H-4)continue;
   const p=y*W+x,t=g[p];if(b[p])continue;
   if(fragile.has(t)){
    const below=g[p+W],left=g[p-1],right=g[p+1],above=g[p-W];
    // Only exposed unsupported roofs are eligible. Solid neighbours act as buttresses.
    const unsupported=below===T.AIR&&above!==T.AIR&&!solid.has(left)&&!solid.has(right);
    if(unsupported){
     const next=Math.min(255,stress[p]+24);stress[p]=next;
     if(next>=120&&g[p+W]===T.AIR&&!b[p+W]){
      const falling=t===T.SANDSOIL?T.SAND:t===T.ICE?T.SNOW:T.GLASS;
      world.set(x,y,T.AIR);world.set(x,y+1,falling);stress[p]=0;collapses++;
      if(collapses%8===1)log('Unsupported roof collapsed at '+x+', '+y);
     }
    }else if(stress[p])stress[p]=Math.max(0,stress[p]-12);
   }else if(liquid.has(t)){
    // A column of matching liquid builds head pressure when contained.
    const head=g[p-W]===t&&g[p-2*W]===t&&g[p+W]!==T.AIR;
    const contained=solid.has(g[p-1])||b[p-1]||solid.has(g[p+1])||b[p+1];
    pressure[p]=head&&contained?Math.min(255,pressure[p]+35):Math.max(0,pressure[p]-28);
    if(pressure[p]>=140){
     const dir=(frame+n)&1?1:-1;
     for(const dx of [dir,-dir]){
      const target=p+dx;
      if(g[target]===T.AIR&&!b[target]){world.swap(p,target);pressure[p]=0;pressureReleases++;if(pressureReleases%8===1)log('Liquid pressure escaped at '+x+', '+y);break}
     }
    }
   }
  }
  // Machine damage checks are throttled and capped; damage cannot delete machinery.
  if(frame%24===0){
   const machines=factory.machines||[],max=Math.min(24,machines.length),start=(frame/24*24)%Math.max(1,machines.length);
   for(let k=0;k<max;k++){
    const m=machines[(start+k)%machines.length];if(!m||m.integrity==null||m.integrity<=1)continue;
    const x=cap(m.x|0,2,W-3),y=cap(m.y|0,3,H-4),i=y*W+x;
    const hazardous=[g[i-1],g[i+1],g[i-W],g[i+W]].filter(t=>t===T.LAVA||t===T.ACID).length;
    if(hazardous){m.integrity=Math.max(1,m.integrity-hazardous*.35);damageEvents++;if(damageEvents%12===1)log('Corrosive or thermal exposure damaged '+m.kind+' at '+x+', '+y)}
   }
  }
 }
 function stats(){return{enabled,collapses,pressureReleases,damageEvents,events:recent.slice(0,5)}}
 function draw(graphics,camera,detail='auto'){
  if(!graphics)return;graphics.clear();if(!enabled||!camera)return;
  const x0=cap(Math.floor(camera.scrollX/4)-3,0,W-1),y0=cap(Math.floor(camera.scrollY/4)-3,0,H-1);
  const x1=cap(x0+Math.ceil(camera.width/camera.zoom/4)+6,0,W-1),y1=cap(y0+Math.ceil(camera.height/camera.zoom/4)+6,0,H-1);
  const stride=detail==='low'?5:3;let drawn=0;
  for(let y=y0;y<=y1&&drawn<100;y+=stride)for(let x=x0;x<=x1&&drawn<100;x+=stride){
   const i=y*W+x;if(stress[i]>80){graphics.fillStyle(0xffad68,.16);graphics.fillRect(x*4,y*4,4,4);drawn++}
   else if(pressure[i]>100){graphics.fillStyle(0x85d8ff,.13);graphics.fillCircle(x*4+2,y*4+2,2);drawn++}
  }
 }
 return{step,reset,restore,snapshot,stats,draw,get enabled(){return enabled},set enabled(v){enabled=!!v}};
}
