export const W=160,H=120,N=W*H;
export const T={AIR:0,SAND:1,WATER:2,STONE:3,ORE:4,FIRE:5,METAL:6,STEAM:7};
export const COLORS=[[11,20,29],[200,173,111],[55,139,202],[91,105,118],[193,130,70],[251,129,54],[158,214,211],[164,188,205]];
export class World{
 constructor(){this.grid=new Uint8Array(N);this.age=new Uint8Array(N);this.tick=0;this.dirty=true;}
 inside(x,y){return x>=0&&x<W&&y>=0&&y<H}
 at(x,y){return this.inside(x,y)?this.grid[y*W+x]:T.STONE}
 set(x,y,v){if(this.inside(x,y)){const i=y*W+x;this.grid[i]=v;this.age[i]=0;this.dirty=true}}
 swap(i,j){const g=this.grid,a=this.age;[g[i],g[j]]=[g[j],g[i]];[a[i],a[j]]=[a[j],a[i]];this.dirty=true}
 generate(){this.grid.fill(0);this.age.fill(0);for(let y=H-27;y<H;y++)for(let x=0;x<W;x++){const n=Math.random();this.set(x,y,n<.105?T.ORE:n<.78?T.STONE:T.SAND)}for(let x=0;x<W;x++)this.set(x,H-1,T.STONE);for(let x=20;x<55;x++)for(let y=93;y<110;y++)if(Math.random()<.23)this.set(x,y,T.ORE);for(let x=95;x<145;x++)for(let y=100;y<116;y++)if(Math.random()<.2)this.set(x,y,T.ORE)}
 simulate(){this.tick++;const g=this.grid,a=this.age,reverse=this.tick%2===0;for(let y=H-2;y>=1;y--)for(let z=0;z<W;z++){const x=reverse?W-z-1:z,i=y*W+x,v=g[i];if(v===0||v===T.STONE||v===T.METAL)continue;const side=Math.random()<.5?-1:1,below=i+W;
 if(v===T.FIRE||v===T.STEAM){a[i]++;if(a[i]>(v===T.FIRE?17:55)){this.set(x,y,v===T.STEAM&&Math.random()<.35?T.WATER:0);continue}if(v===T.FIRE){for(const d of [-1,1])if(this.at(x+d,y)===T.WATER){this.set(x+d,y,T.STEAM);this.set(x,y,T.STEAM);break}}if(y>0&&this.at(x,y-1)===0&&Math.random()<.75)this.swap(i,i-W);else if(this.inside(x+side,y)&&this.at(x+side,y)===0&&Math.random()<.4)this.swap(i,i+side);continue}
 if(v===T.SAND||v===T.ORE){if(g[below]===0||g[below]===T.WATER){this.swap(i,below);continue}for(const d of [side,-side])if(this.inside(x+d,y+1)&&(this.at(x+d,y+1)===0||this.at(x+d,y+1)===T.WATER)){this.swap(i,below+d);break}}
 if(v===T.WATER){if(g[below]===0){this.swap(i,below);continue}for(const d of [side,-side]){if(this.at(x+d,y+1)===0){this.swap(i,below+d);break}if(this.at(x+d,y)===0){this.swap(i,i+d);break}}}}}
 paint(x,y,v,r){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)this.set(x+dx,y+dy,v)}
 import(arr){if(!arr||arr.length!==N)return false;this.grid=Uint8Array.from(arr);this.age=new Uint8Array(N);this.dirty=true;return true}
}