// INDUSTRIUM Alpha 0.15: deterministic hybrid pixel-terrain and vector-machine art.
import {W,H,T,COLORS,REGIONS} from '../js/world.js?v=080-frontiers-final';
import {COLORS as MACHINE_COLOURS,DEMAND,ROTATABLE_MACHINES} from '../js/factory.js?v=0300';
const hash=(x,y,seed=0)=>{let n=Math.imul(x+seed,374761393)+Math.imul(y+seed*3,668265263);n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0};
const clamp=v=>Math.max(0,Math.min(255,v|0));
const water=new Set([T.WATER,T.OIL,T.LAVA,T.ACID]);
const gas=new Set([T.STEAM,T.VAPOUR,T.FIRE]);
const minerals=new Set([T.ORE,T.GOLD,T.CRYSTAL,T.METAL,T.FUEL,T.ARTIFACT]);
const rocky=new Set([T.STONE,T.BASALT,T.OBSIDIAN,T.SANDSOIL,T.GLASS]);
// Cache the painted terrain and update only tiles that actually changed.
const pixelBuffers=new WeakMap();
export function paintTerrain(texture,world,now=0,quality=true){
 if(!texture)return;
 const ctx=texture.getContext(),g=world.grid,N=W*H;
 let state=pixelBuffers.get(texture);
 if(!state){state={pixels:ctx.createImageData(W,H),previous:new Uint8Array(N),marks:new Uint32Array(N),epoch:0,seed:null,quality:null};pixelBuffers.set(texture,state)}
 const data=state.pixels.data,seed=world.seed|0,full=state.seed!==seed||state.quality!==quality;
 state.seed=seed;state.quality=quality;
 const paintCell=i=>{
  const x=i%W,y=(i/W)|0,t=g[i],c=COLORS[t]||COLORS[0],j=i*4,h=hash(x,y,seed),grain=h%19-9;
  let shade=grain*(quality?.68:.38),glow=0;
  if(t===T.AIR){const depth=y/H,sky=hash(x>>4,y>>4,seed)%9;
   data[j]=clamp(9+depth*4+sky*.2);data[j+1]=clamp(20+depth*8+sky*.45);data[j+2]=clamp(30+depth*13+sky*.6);data[j+3]=255;return}
  if(rocky.has(t)){shade+=(x+y*3)%7===0?12:0;if(x>0&&g[i-1]!==t)shade-=15;if(y>0&&g[i-W]!==t)shade+=18}
  if(minerals.has(t)){glow=h%13===0?38:0;if(y>0&&g[i-W]!==t)glow+=18}
  if(water.has(t)){shade+=(h%11-5)*.9;if(y>0&&g[i-W]!==t){shade+=26;glow+=t===T.LAVA?26:8}}
  if(gas.has(t))shade+=(h%19-9)*1.2;
  if(t===T.SAND||t===T.SNOW||t===T.SILT)shade+=h%7===0?13:0;
  data[j]=clamp(c[0]+shade+glow);data[j+1]=clamp(c[1]+shade*.85+glow*.6);data[j+2]=clamp(c[2]+shade*.7+glow*(t===T.CRYSTAL?1:.35));data[j+3]=255;
 };
 if(full){state.previous.set(g);for(let i=0;i<N;i++)paintCell(i)}
 else{
  const changed=[];const epoch=++state.epoch,marks=state.marks,previous=state.previous;
  const mark=i=>{if(i<0||i>=N||marks[i]===epoch)return;marks[i]=epoch;changed.push(i)};
  for(let i=0;i<N;i++)if(previous[i]!==g[i]){previous[i]=g[i];mark(i);const x=i%W;if(x>0)mark(i-1);if(x<W-1)mark(i+1);if(i>=W)mark(i-W);if(i<N-W)mark(i+W)}
  if(!changed.length){world.dirty=false;return}
  for(let i=0;i<changed.length;i++)paintCell(changed[i]);
 }
 ctx.putImageData(state.pixels,0,0);texture.refresh();world.dirty=false;
}
const palettes={
 generator:['#1b4e48','#64d8ae','#c1ffde'],solar:['#193c64','#69bde7','#d4f4ff'],wind:['#255047','#8bdfc0','#f2fff7'],waterwheel:['#1c5261','#6dc4e7','#d2f9ff'],battery:['#42542d','#a9d573','#e6f9bb'],
 drill:['#694b2b','#e9a95e','#ffe3a0'],deepdrill:['#664024','#f2a05c','#ffce86'],crystaldrill:['#4a3972','#a791ef','#e4d4ff'],excavator:['#654528','#e5aa63','#ffe0a0'],oilrig:['#2a3b65','#6f91d0','#d6e3ff'],
 furnace:['#653329','#eb8268','#ffcf8e'],kiln:['#6d3428','#dc7259','#ffd7a2'],combustor:['#6d4225','#ef9e55','#ffe0a0'],refinery:['#59343a','#e78e8b','#ffd4d0'],distiller:['#4d3861','#bd93d4','#ead8f8'],crusher:['#644a29','#d5ae6d','#fff0bc'],
 belt:['#5b5130','#d6b95e','#fff3b6'],hopper:['#3e5855','#8bbfb7','#d5f4ed'],storage:['#513f62','#bfa0da','#f3e2ff'],warehouse:['#4e3f62','#a995d7','#e6dafa'],pump:['#254c69','#58b2df','#c9edff'],filter:['#285a46','#78c9a1','#d9f9e8'],
 mixer:['#365c5b','#79beb7','#d4f7f2'],sifter:['#5b4c2e','#d5ae70','#fce7b4'],press:['#574166','#c99dd7','#f5ddff'],cooler:['#285467','#8ccde6','#e6f9ff'],condenser:['#235a63','#7ed8db','#d7fcff'],
 collector:['#3f406a','#a7a6f1','#eeeaff'],stabilizer:['#3d594d','#9ed7b6','#effff5'],surveyor:['#635329','#e9c76d','#fff0b8']
};
const mining=new Set(['drill','deepdrill','crystaldrill','excavator','oilrig']);
const thermal=new Set(['furnace','kiln','combustor','refinery','distiller']);
const logistics=new Set(['belt','hopper','filter','storage','warehouse','collector']);
const power=new Set(['generator','solar','wind','waterwheel','battery']);
const pipes=new Set(['pump','condenser','cooler','mixer','distiller']);
const hex=s=>Number.parseInt(s.slice(1),16);
export function drawMachines(g,factory,time=0,view=null,quality='Balanced'){
 if(!g)return;g.clear();
 const powerState=factory.power(),powered=powerState.production>=powerState.use;
 const simple=quality==='Fast'||quality==='Ultra';
 for(const m of factory.machines){
  if(view&&(m.x<view.left-5||m.x>view.right+5||m.y<view.top-5||m.y>view.bottom+5))continue;
  const x=m.x*4,y=m.y*4,kind=m.kind,p=palettes[kind]||['#34434f',MACHINE_COLOURS[kind]||'#8ab5c7','#ecffff'];
  const dark=hex(p[0]),main=hex(p[1]),light=hex(p[2]),phase=time*.004+m.x*.31;
  const active=!m.safetyHold&&!m.autoHold&&((DEMAND[kind]||0)===0||powered),health=m.integrity??100;
  g.fillStyle(0x020b12,.58);g.fillRoundedRect(x-13,y-10,28,27,4);
  g.fillStyle(0x081b27,1);g.fillRoundedRect(x-14,y-14,28,28,4);
  g.lineStyle(1,0x4d6874,.95);g.strokeRoundedRect(x-13,y-13,26,26,4);
  g.fillStyle(dark,1);g.fillRoundedRect(x-11,y-11,22,22,3);
  g.fillStyle(main,.94);g.fillRect(x-9,y-9,18,3);
  g.fillStyle(0x0b1a25,.9);g.fillRect(x-8,y+7,16,3);
  g.fillStyle(0xffffff,.12);g.fillRect(x-10,y-10,3,16);
  if(mining.has(kind)){
   g.fillStyle(light,.95);g.fillTriangle(x,y-9,x-5,y+3,x+5,y+3);
   g.fillStyle(0x162b35,1);g.fillRect(x-3,y-2,6,9);
   g.fillStyle(main,1);g.fillRect(x-7,y+6,14,3);
   if(active){g.lineStyle(2,light,.85);g.lineBetween(x-7,y+9,x-7+((time/95|0)%14),y+9)}
  }else if(thermal.has(kind)){
   g.fillStyle(0x0d1a22,1);g.fillRoundedRect(x-7,y-5,14,12,2);
   const pulse=active?(Math.sin(phase)+1)*.5:0;
   g.fillStyle(0xffa95e,.3+pulse*.65);g.fillRect(x-5,y-3,10,8);
   g.fillStyle(0xffe3a4,.45+pulse*.5);g.fillTriangle(x-3,y+5,x,y-4,x+3,y+5);
   g.fillStyle(light,.85);g.fillRect(x+4,y-10,4,5);
  }else if(logistics.has(kind)){
   if(kind==='belt'||kind==='filter'){
    g.fillStyle(0x0d2832,1);g.fillRect(x-10,y-4,20,9);
    g.lineStyle(2,main,1);g.lineBetween(x-8,y-5,x+8,y-5);g.lineBetween(x-8,y+5,x+8,y+5);
    const moving=active?((time/120|0)%6):0;for(let j=-1;j<2;j++){g.fillStyle(light,.85);g.fillRect(x-8+j*7+moving,y-1,3,3)}
   }else{
    g.fillStyle(0x0d2632,1);g.fillRoundedRect(x-7,y-6,14,13,2);
    g.fillStyle(main,1);g.fillRect(x-6,y-6,12,3);g.fillRect(x-5,y+4,10,2);
    g.fillStyle(light,.8);g.fillRect(x-4,y-1,8,2);
   }
  }else if(power.has(kind)){
   g.lineStyle(2,light,.95);g.strokeCircle(x,y,7);
   const a=phase*(active?1:0),xx=Math.cos(a)*5,yy=Math.sin(a)*5;
   g.lineBetween(x-xx,y-yy,x+xx,y+yy);g.lineBetween(x-yy,y+xx,x+yy,y-xx);
   g.fillStyle(main,1);g.fillCircle(x,y,3);
  }else if(pipes.has(kind)){
   g.lineStyle(4,light,.8);g.lineBetween(x-9,y+4,x+8,y+4);g.lineBetween(x+4,y+4,x+4,y-7);
   g.fillStyle(dark,1);g.fillCircle(x,y,6);g.lineStyle(2,main,1);g.strokeCircle(x,y,6);
   g.fillStyle(light,1);g.fillCircle(x,y,2);
  }else{
   g.fillStyle(0x112e38,1);g.fillRect(x-6,y-6,12,12);g.lineStyle(2,light,.8);g.strokeRect(x-6,y-6,12,12);
   g.fillStyle(main,.9);g.fillRect(x-3,y-3,6,6);
  }
  if(['belt','filter','hopper','pump','mixer','excavator','oilrig','distiller','condenser'].includes(kind)){
   const dir=(m.dir||0)&3,dx=[1,0,-1,0][dir],dy=[0,1,0,-1][dir];
   g.fillStyle(0x0b2028,.95);g.fillTriangle(x+dx*11,y+dy*11,x+dx*5-dy*3,y+dy*5+dx*3,x+dx*5+dy*3,y+dy*5-dx*3);
  }
  g.fillStyle(health<35?0xff6b66:active?0x7ef4c7:0xffcf74,1);g.fillCircle(x+9,y-9,2.4);
  if(health<40){g.lineStyle(1.5,0xff7b72,.95);g.strokeRoundedRect(x-14,y-14,28,28,4)}
  if(!simple&&active){
   if(mining.has(kind)){const bob=Math.sin(time*.012+m.x)*3;g.lineStyle(1.5,0xffd08c,.75);g.lineBetween(x-6,y+12,x-6+bob,y+15)}
   if(pipes.has(kind)){const flow=(time/160|0)%12;g.fillStyle(0xa7f4f0,.8);g.fillCircle(x-6+flow,y+4,1.4)}
   if(thermal.has(kind)){const flicker=Math.sin(time*.01+m.y)*2;g.fillStyle(0xffc075,.45);g.fillCircle(x+5,y-14+flicker,2)}
   if(kind==='battery'){g.fillStyle(0xafffd2,.65);g.fillRect(x-7,y+11,Math.max(1,14*((Math.sin(time*.001+m.x)+1)/2)),2)}
  }
 }
}
export function drawAtmosphere(g,world,time=0,enabled=true,grid=false,zoom=1,weather=[]){
 if(!g)return;g.clear();
 if(grid&&zoom>=1.8){g.lineStyle(1,0x8abcc4,.14);for(let x=0;x<=W*4;x+=40)g.lineBetween(x,0,x,H*4);for(let y=0;y<=H*4;y+=40)g.lineBetween(0,y,W*4,y)}
 if(!enabled)return;
 const t=time*.001;
 for(let i=0;i<4;i++){
  const x=i*60*4,y=0,w=60*4,colors=[0x579fc3,0xe2a764,0xe67b59,0xb9d9f0];
  g.fillStyle(colors[i],.045);g.fillRect(x,y,w,78*4);
 }
 // Regional weather is drawn with small fixed budgets to keep GPU work bounded.
 for(let i=0;i<4;i++){
  const state=weather[i]||0,x0=i*240;
  if(state===1){g.lineStyle(1,0xa0cfff,.36);for(let k=0;k<17;k++){const x=x0+((k*71+(time*.09|0))%240),y=((k*59+(time*.23|0))%375);g.lineBetween(x,y,x-3,y+11)}}
  else if(state===2){g.lineStyle(1,0xd8e5de,.28);for(let k=0;k<13;k++){const x=x0+((k*47+(time*.24|0))%240),y=35+((k*73)%305);g.lineBetween(x,y,x+13,y-2)}}
  else if(state===5){for(let k=0;k<15;k++){const x=x0+((k*41+(time*.035|0))%240),y=(k*53+(time*.09|0))%350;g.fillStyle(0x9caaa6,.27);g.fillCircle(x,y,1.4+(k%2))}}
  else if(state===4){for(let k=0;k<10;k++){const x=x0+((k*31+(time*.03|0))%240),y=(k*71+(time*.065|0))%350;g.fillStyle(0xd1efff,.45);g.fillCircle(x,y,1.1)}}
  else if(state===3){g.fillStyle(0xef8153,.025);g.fillRect(x0,0,240,370)}
 }
 // Low-cost atmospheric particles from visible world activity.
 const sparks=world.tick%3;
 for(let k=0;k<14;k++){
  const x=((k*73+Math.sin(t*.28+k)*12+W*4)%(W*4)),y=20+((k*47+Math.sin(t*.7+k)*9)%260);
  g.fillStyle(k%3===0?0xb0e8e9:0x8bb9d0,.1);g.fillCircle(x,y,1+(k%2));
 }
}
export function drawPlacement(g,{mode,cell,brush,material,building,factory,world,direction=0}){
 if(!g)return;g.clear();if(!cell)return;
 const x=cell.x,y=cell.y;if(x<0||y<0||x>=W||y>=H)return;
 const cx=x*4,cy=y*4;
 if(mode==='build'){
  const reason=factory.canPlace(building,x,y),ok=!reason,color=ok?0x72f3ba:0xff766e;
  g.fillStyle(color,.19);g.fillRoundedRect(cx-14,cy-14,28,28,4);
  g.lineStyle(2,color,.9);g.strokeRoundedRect(cx-14,cy-14,28,28,4);
  g.lineStyle(1,color,.3);g.strokeCircle(cx,cy,28);
  g.fillStyle(color,1);g.fillCircle(cx,cy,2);
  if(ROTATABLE_MACHINES.has(building)){
   const dx=[1,0,-1,0][direction],dy=[0,1,0,-1][direction];
   g.lineStyle(2,color,1);g.lineBetween(cx,cy,cx+dx*19,cy+dy*19);
   g.fillTriangle(cx+dx*24,cy+dy*24,cx+dx*16-dy*5,cy+dy*16+dx*5,cx+dx*16+dy*5,cy+dy*16-dx*5);
  }
  return reason||null;
 }
 if(mode==='paint'){
  const size=Math.max(1,brush)*4,color=material<0?0xffd29a:0x92e8f0;
  g.lineStyle(1.5,color,.95);g.strokeCircle(cx,cy,size);
  g.fillStyle(color,.12);g.fillCircle(cx,cy,size);
 }
 if(mode==='inspect'){g.lineStyle(1,0xd9f6ff,.85);g.strokeCircle(cx,cy,12)}
 return null;
}
