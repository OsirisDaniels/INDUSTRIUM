// INDUSTRIUM Alpha 0.8. The world is a wider, deeper, material-reactive planet.
export const W=240,H=160,N=W*H,LEGACY_W=160,LEGACY_H=120;
export const T={AIR:0,SAND:1,WATER:2,STONE:3,ORE:4,FIRE:5,METAL:6,STEAM:7,WET_SAND:8,GOLD:9,RESIDUE:10,BURNT_RESIDUE:11,ICE:12,LAVA:13,GLASS:14,SANDSOIL:15,SILT:16,OIL:17,CRYSTAL:18,BASALT:19,ACID:20,VAPOUR:21,SNOW:22,ARTIFACT:23,OBSIDIAN:24,FUEL:25};
export const COLORS=[[11,20,29],[200,173,111],[55,139,202],[91,105,118],[193,130,70],[251,129,54],[158,214,211],[164,188,205],[133,113,86],[244,199,79],[125,92,92],[79,62,65],[143,204,232],[238,91,47],[151,208,196],[111,87,64],[137,127,109],[59,59,83],[160,112,239],[65,72,83],[154,231,94],[169,154,132],[223,239,248],[255,203,124],[41,45,65],[250,178,95]];
export const REGIONS=[{id:'coast',title:'Tidal Basin',range:[0,59],subtitle:'Water, sand and submerged ore',color:'#5099bb'},{id:'dunes',title:'Amber Expanse',range:[60,119],subtitle:'Sand, oil and buried minerals',color:'#d3a66b'},{id:'volcanic',title:'Cinder Rift',range:[120,179],subtitle:'Lava, basalt and crystals',color:'#d9785c'},{id:'frozen',title:'Frostline',range:[180,239],subtitle:'Snow, ice and hidden relics',color:'#a5d5e8'}];
const STATIC=new Set([T.STONE,T.METAL,T.GLASS,T.SANDSOIL,T.BASALT,T.ARTIFACT,T.OBSIDIAN]);
const GRANULAR=new Set([T.SAND,T.ORE,T.WET_SAND,T.GOLD,T.RESIDUE,T.BURNT_RESIDUE,T.SILT,T.CRYSTAL,T.SNOW,T.FUEL]);
const LIQUID=new Set([T.WATER,T.OIL,T.ACID,T.LAVA]);
const GAS=new Set([T.STEAM,T.VAPOUR,T.FIRE]);
const NEIGHBORS=[-W,W,-1,1];
export class World{
 constructor(){this.grid=new Uint8Array(N);this.age=new Uint8Array(N);this.blocks=new Uint8Array(N);this.tick=0;this.dirty=true;this.seed=0;this.generated=false}
 inside(x,y){return x>=0&&x<W&&y>=0&&y<H}
 at(x,y){return this.inside(x,y)?this.grid[y*W+x]:T.STONE}
 set(x,y,v){if(!this.inside(x,y)||v<0||v>=COLORS.length)return;const i=y*W+x;if(this.blocks[i]&&v!==T.AIR)return;if(this.grid[i]!==v){this.grid[i]=v;this.age[i]=0;this.dirty=true}}
 block(x,y,on=true){if(!this.inside(x,y))return;const i=y*W+x;this.blocks[i]=on?1:0;if(on){this.grid[i]=0;this.age[i]=0}this.dirty=true}
 canMove(i){return i>=0&&i<N&&!this.blocks[i]}
 swap(i,j){if(!this.canMove(j))return false;const g=this.grid,a=this.age,t=g[i],old=a[i];g[i]=g[j];a[i]=a[j];g[j]=t;a[j]=old;this.dirty=true;return true}
 region(x){return REGIONS[Math.min(3,Math.max(0,Math.floor(x/60)))]}
 generate(seed=Math.floor(Math.random()*2147483646)+1){
 this.seed=seed>>>0;let n=this.seed||1;const rnd=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296};
 const g=this.grid;g.fill(0);this.age.fill(0);this.blocks.fill(0);this.tick=0;
 let surface=90;
 const heights=new Int16Array(W);
 for(let x=0;x<W;x++){const area=x<60?0:x<120?1:x<180?2:3,base=[90,89,88,85][area];surface+=(rnd()<.55?(rnd()<.5?-1:1):0);surface=Math.max(base-10,Math.min(base+8,surface));heights[x]=surface}
 for(let x=0;x<W;x++)for(let y=heights[x];y<H;y++){
 const area=Math.floor(x/60),d=y-heights[x],v=rnd();let tile=T.STONE;
 if(d<3)tile=area===3?(v<.7?T.SNOW:T.ICE):area===2?(v<.5?T.BASALT:T.SANDSOIL):area===1?(v<.85?T.SANDSOIL:T.SAND):v<.73?T.SANDSOIL:T.SAND;
 else if(area===2)tile=v<.07?T.ORE:v<.82?T.BASALT:T.SAND;
 else if(area===3)tile=v<.1?T.ICE:v<.18?T.ORE:v<.79?T.STONE:T.SANDSOIL;
 else tile=v<.10?T.ORE:v<.77?T.STONE:v<.92?T.SANDSOIL:T.SAND;
 g[y*W+x]=tile;
 }
 // Carved caves have compact shapes and leave stable support around them.
 for(let k=0;k<27;k++){const cx=6+Math.floor(rnd()*(W-12)),cy=100+Math.floor(rnd()*47),rx=4+Math.floor(rnd()*12),ry=3+Math.floor(rnd()*6);
 for(let y=Math.max(1,cy-ry);y<=Math.min(H-2,cy+ry);y++)for(let x=Math.max(1,cx-rx);x<=Math.min(W-2,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<.78)g[y*W+x]=T.AIR;
 }
 // Underground ore and quartz seams; rare minerals occur deeper.
 for(let k=0;k<28;k++){const cx=5+Math.floor(rnd()*(W-10)),cy=107+Math.floor(rnd()*43),rx=3+Math.floor(rnd()*9),ry=2+Math.floor(rnd()*5),kind=k%6===0?T.CRYSTAL:k%9===0?T.GOLD:T.ORE;
 for(let y=Math.max(heights[Math.max(0,cx-rx)]+5,cy-ry);y<=Math.min(H-2,cy+ry);y++)for(let x=Math.max(1,cx-rx);x<=Math.min(W-2,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<1&&rnd()<.78)g[y*W+x]=kind;
 }
 // Lakes and reservoirs are seeded into cleared pockets.
 for(let pool=0;pool<16;pool++){const zone=pool%4,cx=zone*60+6+Math.floor(rnd()*48),cy=pool<4?93+Math.floor(rnd()*13):112+Math.floor(rnd()*34),rx=3+Math.floor(rnd()*8),ry=2+Math.floor(rnd()*5);
 const fluid=zone===1&&pool%3===0?T.OIL:zone===2?pool%2===0?T.LAVA:T.ACID:zone===3?T.WATER:T.WATER;
 for(let y=Math.max(2,cy-ry);y<=Math.min(H-2,cy+ry);y++)for(let x=Math.max(1,cx-rx);x<=Math.min(W-2,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<.88)g[y*W+x]=y>=cy-1?fluid:T.AIR;
 }
 // Oil-bearing fissures in the dunes, with solid containment on either side.
 for(let k=0;k<5;k++){const cx=64+Math.floor(rnd()*51),cy=109+Math.floor(rnd()*39);for(let y=cy-3;y<=cy+3;y++)for(let x=cx-5;x<=cx+5;x++)if(this.inside(x,y)&&y<H-1&&((x-cx)/6)**2+((y-cy)/4)**2<.78)g[y*W+x]=T.OIL}
 // Frozen formations and volcanic vents give each area a different challenge.
 for(let x=185;x<235;x++)for(let y=heights[x]-3;y<=heights[x]+4;y++)if(this.inside(x,y)&&rnd()<.65)g[y*W+x]=y<=heights[x]?T.SNOW:T.ICE;
 for(let i=0;i<5;i++){const x=126+Math.floor(rnd()*47),y=103+Math.floor(rnd()*40);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(this.inside(x+dx,y+dy)&&rnd()<.7)g[(y+dy)*W+x+dx]=dy>=0?T.LAVA:T.BASALT}
 // A handful of ancient research pods sit inside deliberate hidden chambers.
 for(const [cx,cy] of [[41,137],[106,145],[166,143],[215,134]]){for(let dy=-3;dy<=3;dy++)for(let dx=-5;dx<=5;dx++){const x=cx+dx,y=cy+dy;if(!this.inside(x,y))continue;const rim=Math.abs(dx)===5||Math.abs(dy)===3;g[y*W+x]=rim?T.METAL:T.AIR}g[cy*W+cx]=T.ARTIFACT;g[(cy+1)*W+cx-2]=T.CRYSTAL;g[(cy+1)*W+cx+2]=T.GOLD}
 for(let x=0;x<W;x++)g[(H-1)*W+x]=T.BASALT;
 this.dirty=true;this.generated=true
 }
 // Moves one adjacent liquid/gas/solid particle according to its density.
 simulate(){
 this.tick++;const g=this.grid,a=this.age,blocks=this.blocks,flip=this.tick&1;
 for(let y=H-2;y>=1;y--)for(let z=0;z<W;z++){
 const x=flip?W-z-1:z,i=y*W+x,v=g[i];if(!v||blocks[i]||STATIC.has(v))continue;
 const below=i+W,side=((x*37+y*19+this.tick)&1)?1:-1;
 let adjacentWater=-1,adjacentHeat=false,adjacentSand=-1,adjacentOil=-1;
 if(v===T.SAND||v===T.WATER||v===T.ICE||v===T.SNOW||v===T.OIL||v===T.LAVA||v===T.ACID||v===T.FIRE||v===T.VAPOUR||v===T.RESIDUE){
 for(let d=0;d<4;d++){if((d===2&&x===0)||(d===3&&x===W-1))continue;const j=i+NEIGHBORS[d];if(j<0||j>=N)continue;const o=g[j];if(o===T.WATER&&adjacentWater<0)adjacentWater=j;if(o===T.SAND&&adjacentSand<0)adjacentSand=j;if(o===T.OIL&&adjacentOil<0)adjacentOil=j;if(o===T.LAVA||o===T.FIRE)adjacentHeat=true}
 }
 if(v===T.ICE||v===T.SNOW){if(adjacentHeat||(v===T.SNOW&&this.tick%90===0&&y<86)){this.set(x,y,T.WATER)}else if(v===T.SNOW){if(g[below]===T.AIR&&this.canMove(below))this.swap(i,below);else for(const d of [side,-side])if(x+d>=0&&x+d<W&&g[below+d]===T.AIR&&this.canMove(below+d)){this.swap(i,below+d);break}}continue}
 if(v===T.LAVA){if(adjacentWater>=0){g[adjacentWater]=T.STEAM;a[adjacentWater]=0;this.set(x,y,T.BASALT);this.dirty=true;continue}
 if(this.tick%5!==0)continue;const j=g[below]===T.AIR?below:(x+side>=0&&x+side<W&&g[i+side]===T.AIR?i+side:-1);if(j>=0)this.swap(i,j);continue}
 if(v===T.FIRE||v===T.STEAM||v===T.VAPOUR){
 if(a[i]<255)a[i]++;const life=v===T.FIRE?17:v===T.STEAM?82:125;if(a[i]>life){this.set(x,y,v===T.STEAM?T.WATER:T.AIR);continue}
 if(v===T.FIRE){if(adjacentWater>=0){g[adjacentWater]=T.STEAM;a[adjacentWater]=0;this.dirty=true}
 if(adjacentOil>=0){g[adjacentOil]=T.FIRE;a[adjacentOil]=0;this.dirty=true}
 if(adjacentSand>=0&&this.tick%8===0){g[adjacentSand]=T.GLASS;this.dirty=true}}
 if(v===T.VAPOUR&&adjacentHeat){this.set(x,y,T.FIRE);continue}
 if(y>1&&g[i-W]===T.AIR&&this.canMove(i-W)){this.swap(i,i-W);continue}
 for(const d of [side,-side])if(x+d>=0&&x+d<W&&g[i+d]===T.AIR&&this.canMove(i+d)){this.swap(i,i+d);break}continue
 }
 if(GRANULAR.has(v)){
 if(v===T.SAND&&adjacentWater>=0){g[i]=T.WET_SAND;g[adjacentWater]=T.WET_SAND;a[i]=a[adjacentWater]=0;this.dirty=true;continue}
 if(v===T.RESIDUE&&adjacentHeat){this.set(x,y,T.BURNT_RESIDUE);continue}
 if(v===T.FUEL&&adjacentHeat){this.set(x,y,T.FIRE);continue}
 if((g[below]===T.AIR||g[below]===T.WATER||g[below]===T.OIL)&&this.canMove(below)){this.swap(i,below);continue}
 if(v===T.WET_SAND&&this.tick%3!==0)continue;
 for(const d of [side,-side]){if(x+d<0||x+d>=W)continue;const j=below+d;if((g[j]===T.AIR||g[j]===T.WATER||g[j]===T.OIL)&&this.canMove(j)){this.swap(i,j);break}}continue
 }
 if(LIQUID.has(v)){
 if(v===T.WATER&&adjacentSand>=0){g[adjacentSand]=T.WET_SAND;g[i]=T.WET_SAND;a[adjacentSand]=a[i]=0;this.dirty=true;continue}
 if(v===T.OIL&&adjacentHeat){this.set(x,y,T.FIRE);continue}
 if(v===T.ACID&&this.tick%7===0){for(let d=0;d<4;d++){if((d===2&&x===0)||(d===3&&x===W-1))continue;const j=i+NEIGHBORS[d],other=g[j];if([T.SANDSOIL,T.STONE,T.ORE,T.BASALT].includes(other)&&this.canMove(j)&&((this.tick+i+j)%11===0)){g[j]=T.SILT;a[j]=0;this.dirty=true;break}}}
 if(v===T.OIL&&g[i-W]===T.WATER&&this.canMove(i-W)){this.swap(i,i-W);continue}
 if(v===T.WATER&&g[below]===T.OIL&&this.canMove(below)){this.swap(i,below);continue}
 if(v===T.LAVA&&this.tick%5!==0)continue;
 if(g[below]===T.AIR&&this.canMove(below)){this.swap(i,below);continue}
 let moved=false;for(const d of [side,-side])if(x+d>=0&&x+d<W&&g[below+d]===T.AIR&&this.canMove(below+d)){this.swap(i,below+d);moved=true;break}
 if(moved)continue;
 for(const d of [side,-side])if(x+d>=0&&x+d<W&&g[i+d]===T.AIR&&this.canMove(i+d)){this.swap(i,i+d);break}continue
 }
 }
 }
 paint(x,y,v,r){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const xx=x+dx,yy=y+dy;if(dx*dx+dy*dy<=r*r&&this.inside(xx,yy)&&!this.blocks[yy*W+xx])this.set(xx,yy,v)}}
 import(arr){if(!arr)return false;const legacy=arr.length===LEGACY_W*LEGACY_H;if(arr.length!==N&&!legacy)return false;
 if(legacy){this.generate();for(let y=0;y<LEGACY_H;y++)for(let x=0;x<LEGACY_W;x++){const v=arr[y*LEGACY_W+x];this.grid[y*W+x]=Number.isInteger(v)&&v>=0&&v<COLORS.length?v:T.AIR}}
 else{this.grid=Uint8Array.from(arr,v=>v>=0&&v<COLORS.length?v:T.AIR);this.age=new Uint8Array(N);this.blocks=new Uint8Array(N)}
 this.age.fill(0);this.blocks.fill(0);this.dirty=true;return true}
}