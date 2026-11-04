export const W=160,H=120,N=W*H;
export const T={AIR:0,SAND:1,WATER:2,STONE:3,ORE:4,FIRE:5,METAL:6,STEAM:7,WET_SAND:8,GOLD:9,RESIDUE:10,BURNT_RESIDUE:11,ICE:12,LAVA:13,GLASS:14};
export const COLORS=[[11,20,29],[200,173,111],[55,139,202],[91,105,118],[193,130,70],[251,129,54],[158,214,211],[164,188,205],[133,113,86],[244,199,79],[125,92,92],[79,62,65],[143,204,232],[238,91,47],[151,208,196]];
const GRANULAR=new Set([T.SAND,T.ORE,T.WET_SAND,T.GOLD,T.RESIDUE,T.BURNT_RESIDUE]);
export class World{
 constructor(){this.grid=new Uint8Array(N);this.age=new Uint8Array(N);this.blocks=new Uint8Array(N);this.tick=0;this.dirty=true}
 inside(x,y){return x>=0&&x<W&&y>=0&&y<H}
 at(x,y){return this.inside(x,y)?this.grid[y*W+x]:T.STONE}
 set(x,y,v){if(this.inside(x,y)&&v>=0&&v<COLORS.length){const i=y*W+x;if(this.grid[i]!==v){this.grid[i]=v;this.age[i]=0;this.dirty=true}}}
 block(x,y,on=true){if(this.inside(x,y)){const i=y*W+x;this.blocks[i]=on?1:0;if(on&&this.grid[i]!==T.AIR)this.set(x,y,T.AIR);this.dirty=true}}
 canMove(i){return i>=0&&i<N&&this.blocks[i]===0}
 swap(i,j){if(!this.canMove(j))return false;const g=this.grid,a=this.age,t=g[i],tAge=a[i];g[i]=g[j];a[i]=a[j];g[j]=t;a[j]=tAge;this.dirty=true;return true}
 generate(){
 const g=this.grid;g.fill(0);this.age.fill(0);this.blocks.fill(0);this.tick=0;
 const heights=new Int16Array(W);let h=H-29;
 for(let x=0;x<W;x++){h=Math.max(H-38,Math.min(H-22,h+(Math.random()<.36?(Math.random()<.5?-1:1):0)));heights[x]=h}
 for(let x=0;x<W;x++)for(let y=heights[x];y<H;y++){const depth=y-heights[x],r=Math.random();g[y*W+x]=depth<4?(r<.77?T.SAND:T.STONE):r<.08?T.ORE:r<.77?T.STONE:T.SAND}
 for(let seam=0;seam<9;seam++){const cx=10+Math.floor(Math.random()*(W-20)),cy=H-9-Math.floor(Math.random()*19),rx=3+Math.floor(Math.random()*8),ry=2+Math.floor(Math.random()*4);for(let y=Math.max(1,cy-ry);y<Math.min(H-1,cy+ry);y++)for(let x=Math.max(1,cx-rx);x<Math.min(W-1,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<1&&Math.random()<.8)g[y*W+x]=T.ORE}
 for(let pool=0;pool<3;pool++){const cx=18+Math.floor(Math.random()*(W-36)),cy=H-14-Math.floor(Math.random()*12),rx=5+Math.floor(Math.random()*7),ry=3+Math.floor(Math.random()*3);for(let y=Math.max(0,cy-ry);y<Math.min(H-1,cy+ry);y++)for(let x=Math.max(1,cx-rx);x<Math.min(W-1,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<1)g[y*W+x]=y>=cy?T.WATER:T.AIR}
 for(let vein=0;vein<4;vein++){const x=5+Math.floor(Math.random()*(W-10)),y=H-4-Math.floor(Math.random()*21);for(let d=-3;d<=3;d++){const xx=x+d,yy=y+Math.round(d*.35);if(this.inside(xx,yy))g[yy*W+xx]=Math.random()<.18?T.GOLD:T.ORE}}
 for(let patch=0;patch<2;patch++){const cx=15+Math.floor(Math.random()*(W-30)),cy=H-20-Math.floor(Math.random()*11);for(let dy=-3;dy<=3;dy++)for(let dx=-4;dx<=4;dx++)if(this.inside(cx+dx,cy+dy)&&dx*dx+dy*dy<13)g[(cy+dy)*W+cx+dx]=T.ICE}
 for(let x=0;x<W;x++)g[(H-1)*W+x]=T.STONE;
 this.dirty=true
 }
 simulate(){
 this.tick++;const g=this.grid,a=this.age,blocks=this.blocks,reverse=!!(this.tick&1);
 for(let y=H-2;y>=1;y--)for(let z=0;z<W;z++){
 const x=reverse?W-z-1:z,i=y*W+x,v=g[i];if(!v||blocks[i]||v===T.STONE||v===T.METAL||v===T.GLASS)continue;
 const below=i+W,side=Math.random()<.5?-1:1;
 const adjacent=(fn)=>{for(const d of [-W,W,-1,1]){if((d===-1&&x===0)||(d===1&&x===W-1))continue;const j=i+d;if(j>=0&&j<N&&fn(j))return j}return -1};
 if(v===T.ICE){if(adjacent(j=>g[j]===T.FIRE||g[j]===T.LAVA)!==-1)this.set(x,y,T.WATER);continue}
 if(v===T.LAVA){const w=adjacent(j=>g[j]===T.WATER);if(w!==-1){g[w]=T.STEAM;a[w]=0;this.set(x,y,T.STONE);this.dirty=true;continue}const s=adjacent(j=>g[j]===T.SAND||g[j]===T.WET_SAND);if(s!==-1&&Math.random()<.05){g[s]=T.GLASS;a[s]=0;this.dirty=true}if(this.tick%3===0){if(g[below]===T.AIR&&this.canMove(below))this.swap(i,below);else if(x+side>=0&&x+side<W&&g[i+side]===T.AIR&&this.canMove(i+side))this.swap(i,i+side)}continue}
 if(v===T.FIRE||v===T.STEAM){
 a[i]++;if(a[i]>(v===T.FIRE?17:75)){this.set(x,y,v===T.STEAM?T.WATER:T.AIR);continue}
 if(v===T.FIRE){const w=adjacent(j=>g[j]===T.WATER||g[j]===T.ICE||g[j]===T.WET_SAND||g[j]===T.RESIDUE);
 if(w!==-1){const t=g[w];g[w]=t===T.WATER?T.STEAM:t===T.ICE?T.WATER:t===T.WET_SAND?T.SAND:Math.random()<.8?T.BURNT_RESIDUE:T.AIR;a[w]=0;this.dirty=true}}
 if(y>1&&g[i-W]===T.AIR&&this.canMove(i-W)&&Math.random()<.85)this.swap(i,i-W);else if(x+side>=0&&x+side<W&&g[i+side]===T.AIR&&this.canMove(i+side)&&Math.random()<.35)this.swap(i,i+side);continue
 }
 if(GRANULAR.has(v)){
 if(v===T.SAND){const water=adjacent(j=>g[j]===T.WATER);if(water!==-1){g[i]=T.WET_SAND;g[water]=T.WET_SAND;a[i]=a[water]=0;this.dirty=true;continue}}
 if(v===T.RESIDUE&&adjacent(j=>g[j]===T.FIRE||g[j]===T.LAVA)!==-1){this.set(x,y,T.BURNT_RESIDUE);continue}
 if((g[below]===T.AIR||g[below]===T.WATER)&&this.canMove(below)){this.swap(i,below);continue}
 if(v===T.WET_SAND&&Math.random()<.65)continue;
 for(const d of [side,-side]){if(x+d<0||x+d>=W)continue;const j=below+d;if((g[j]===T.AIR||g[j]===T.WATER)&&this.canMove(j)){this.swap(i,j);break}}continue
 }
 if(v===T.WATER){
 const sand=adjacent(j=>g[j]===T.SAND);if(sand!==-1){g[sand]=T.WET_SAND;g[i]=T.WET_SAND;a[sand]=a[i]=0;this.dirty=true;continue}
 if(g[below]===T.AIR&&this.canMove(below)){this.swap(i,below);continue}
 let moved=false;for(const d of [side,-side]){if(x+d<0||x+d>=W)continue;const j=below+d;if(g[j]===T.AIR&&this.canMove(j)){this.swap(i,j);moved=true;break}}
 if(moved)continue;
 for(const d of [side,-side]){if(x+d<0||x+d>=W)continue;const j=i+d;if(g[j]===T.AIR&&this.canMove(j)){this.swap(i,j);break}}continue
 }
 }
 }
 paint(x,y,v,r){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r&&this.inside(x+dx,y+dy)&&!this.blocks[(y+dy)*W+x+dx])this.set(x+dx,y+dy,v)}
 import(arr){if(!arr||arr.length!==N)return false;this.grid=Uint8Array.from(arr,v=>v>=0&&v<COLORS.length?v:T.AIR);this.age=new Uint8Array(N);this.blocks=new Uint8Array(N);this.dirty=true;return true}
}