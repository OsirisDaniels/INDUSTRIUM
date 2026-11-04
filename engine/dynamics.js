// Alpha 0.12: bounded environmental simulation on top of existing cellular physics.
// Runs every 12 world ticks; caps edits to keep mobile frame times predictable.
import {W,H,T} from '../js/world.js?v=080-frontiers-final';
export class Dynamics{
 constructor(world,factory){this.world=world;this.factory=factory;this.heat=new Uint8Array(W*H);this.pollution=new Uint8Array(W*H);this.tick=0;this.active=true;this.events=0;this.last='Environment stable';this.heatPeak=0;this.pollutionPeak=0}
 reset(){this.heat.fill(0);this.pollution.fill(0);this.tick=0;this.events=0;this.last='Environment stable';this.heatPeak=0;this.pollutionPeak=0}
 step(){
  if(!this.active||++this.tick%12)return;
  const w=this.world,g=w.grid,blocked=w.blocks;
  // Passive cooling and dissipation: sample a quarter of cells per cycle.
  const offset=(this.tick/12)%4;
  for(let i=offset;i<g.length;i+=4){if(this.heat[i])this.heat[i]-=this.heat[i]>85?2:1;if(this.pollution[i]&&this.tick%48===0)this.pollution[i]--}
  // Localized emissions from operational machines, limited to 9 cells each.
  let peakHeat=0,peakPollution=0;
  for(const m of this.factory.machines){
   const hot=['furnace','kiln','combustor','refinery','distiller','generator','press'].includes(m.kind);
   const dirty=['combustor','refinery','generator','oilrig','distiller'].includes(m.kind);
   if(!hot&&!dirty)continue;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const x=m.x+dx,y=m.y+dy;if(x<1||x>=W-1||y<1||y>=H-1)continue;
    const i=y*W+x;
    if(hot)this.heat[i]=Math.min(255,this.heat[i]+(dx||dy?5:11));
    if(dirty)this.pollution[i]=Math.min(255,this.pollution[i]+(dx||dy?3:7));
    peakHeat=Math.max(peakHeat,this.heat[i]);peakPollution=Math.max(peakPollution,this.pollution[i]);
   }
  }
  // Natural heat sources and bounded local environmental reactions.
  const start=(this.tick*37)%(W*H),budget=2100;
  for(let n=0;n<budget;n++){
   const i=(start+n*19)%(W*H),x=i%W,y=(i/W)|0,v=g[i];if(x<1||x>=W-1||y<1||y>=H-1||blocked[i])continue;
   if(v===T.LAVA||v===T.FIRE)this.heat[i]=Math.min(255,this.heat[i]+24);
   const heat=this.heat[i],poll=this.pollution[i];
   if(heat>0){const target=i+((this.tick+n)&1?1:-W);if(target>=0&&target<g.length&&this.heat[target]+4<heat){this.heat[target]=Math.min(255,this.heat[target]+Math.max(1,heat>>4))}}
   if(poll>0&&y>1&&g[i-W]===T.AIR){this.pollution[i-W]=Math.min(255,this.pollution[i-W]+Math.max(1,poll>>4))}
   if(heat>115&&v===T.ICE){w.set(x,y,T.WATER);this.events++;this.last='Ice melted from industrial heat'}
   else if(heat>145&&v===T.SNOW){w.set(x,y,T.WATER);this.events++;this.last='Snow melted near heat source'}
   else if(heat>205&&v===T.WATER){w.set(x,y,T.STEAM);this.events++;this.last='Water boiled into steam'}
   else if(heat>175&&v===T.OIL){w.set(x,y,T.VAPOUR);this.events++;this.last='Oil vaporised from heat'}
   else if(poll>165&&v===T.WATER&&((i+this.tick)%23===0)){w.set(x,y,T.ACID);this.events++;this.last='Water contaminated by industrial emissions'}
  }
  this.heatPeak=peakHeat;this.pollutionPeak=peakPollution;
 }
 snapshot(){return{heat:Array.from(this.heat),pollution:Array.from(this.pollution),events:this.events,last:this.last}}
 restore(s){this.reset();if(s?.heat?.length===W*H)this.heat.set(s.heat);if(s?.pollution?.length===W*H)this.pollution.set(s.pollution);this.events=Number(s?.events)||0;this.last=s?.last||'Environment stable'}
}
