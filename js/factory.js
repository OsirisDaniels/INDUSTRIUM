import {unlocked,unlockHint} from './catalog.js';
import {T} from './world.js';
export const PRICES={generator:170,drill:130,collector:155,furnace:240,solar:350,belt:12,storage:110,wind:420,crusher:290,warehouse:320,deepdrill:680,refinery:760,pump:210,sifter:190,hopper:90,kiln:330,press:480,filter:160,cooler:260};
export const DEMAND={generator:0,drill:8,collector:6,furnace:12,solar:0,belt:0,storage:0,wind:0,crusher:10,warehouse:0,deepdrill:18,refinery:24,pump:7,sifter:10,hopper:2,kiln:14,press:18,filter:3,cooler:11};
export const SUPPLY={generator:24,solar:14,wind:32};
export const COLORS={generator:'#62d3aa',drill:'#f0b76d',collector:'#a9a8f6',furnace:'#ed8577',solar:'#79c4ef',belt:'#efcc76',storage:'#d0a1e8',wind:'#9ee0bd',crusher:'#edb75b',warehouse:'#ba9edb',deepdrill:'#f5a25f',refinery:'#f28c8b',pump:'#56aee0',sifter:'#d1aa6d',hopper:'#90c3bb',kiln:'#e37966',press:'#d39bd8',filter:'#85d2a7',cooler:'#8ed3f3'};
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const KEYS=['ore','gold','wet_sand','residue','burnt_residue'];
const MATERIAL={[T.ORE]:'ore',[T.GOLD]:'gold',[T.WET_SAND]:'wet_sand',[T.RESIDUE]:'residue',[T.BURNT_RESIDUE]:'burnt_residue'};
const MATERIAL_ID={ore:T.ORE,gold:T.GOLD,wet_sand:T.WET_SAND,residue:T.RESIDUE,burnt_residue:T.BURNT_RESIDUE};
const CAP={belt:2,filter:4,hopper:28,storage:100,warehouse:300,drill:8,collector:12,deepdrill:25,sifter:18,kiln:18,press:20,crusher:24,furnace:12,refinery:30};
const GOALS=[
 {id:'first_ore',title:'Strike ore',detail:'Mine five ore',reward:150,rp:12,test:f=>f.mined>=5},
 {id:'first_metal',title:'First steelworks',detail:'Refine five metal',reward:240,rp:20,test:f=>f.refined>=5},
 {id:'wet_factory',title:'Wet works',detail:'Sift eight wet sand',reward:350,rp:35,test:f=>f.sifted>=8},
 {id:'gold_rush',title:'Gold rush',detail:'Produce five gold',reward:500,rp:60,test:f=>f.goldProduced>=5},
 {id:'automation',title:'Automate the line',detail:'Route fifty material units',reward:650,rp:55,test:f=>f.automated>=50},
 {id:'high_industry',title:'Heavy industry',detail:'Produce twenty gold and refine thirty metal',reward:1200,rp:100,test:f=>f.goldProduced>=20&&f.refined>=30}
];
export class Factory{
 constructor(world){this.world=world;this.machines=[];this.credits=600;this.ore=0;this.metal=0;this.gold=0;this.rp=0;this.up={drill:0,refining:0,energy:0,sifting:0,logistics:0};this.autoSell=false;this.market=1;this.marketTime=0;this.mined=0;this.refined=0;this.goldProduced=0;this.sifted=0;this.revenue=0;this.expenses=0;this.cycle=0;this.automated=0;this.claimed=[];this.weather=true;this.pendingEvents=[];this.lastEvent='Calm'}
 near(x,y,r=7){return this.machines.find(m=>Math.abs(m.x-x)<r&&Math.abs(m.y-y)<r)}
 inventory(m){if(!m.inventory)m.inventory={};for(const k of KEYS)if(!Number.isFinite(m.inventory[k]))m.inventory[k]=0;if(!Number.isFinite(m.inventory.metal))m.inventory.metal=0;return m.inventory}
 quantity(m){const inv=this.inventory(m);return KEYS.reduce((sum,k)=>sum+inv[k],0)}
 accepts(m,key){if(m.kind==='belt'||m.kind==='hopper')return true;if(m.kind==='filter')return key==='gold';if(m.kind==='storage'||m.kind==='warehouse')return key==='ore'||key==='gold';if(m.kind==='sifter')return key==='wet_sand';if(m.kind==='kiln')return key==='residue';if(m.kind==='press')return key==='burnt_residue';if(m.kind==='furnace'||m.kind==='refinery'||m.kind==='crusher')return key==='ore';if(m.kind==='collector')return key==='ore'||key==='gold';return false}
 canPlace(kind,x,y){if(!Object.hasOwn(PRICES,kind))return 'Unknown machine';if(!this.world.inside(x,y))return 'Outside factory';if(!unlocked(kind,this))return unlockHint(kind);if(this.credits<PRICES[kind])return 'Not enough credits';if(this.near(x,y,kind==='belt'||kind==='filter'?1:kind==='storage'||kind==='hopper'?3:7))return 'Too close to another machine';return null}
 place(kind,x,y){const error=this.canPlace(kind,x,y);if(error)return error;this.credits-=PRICES[kind];const m={kind,x,y,dir:0,inventory:{ore:0,metal:0,gold:0,wet_sand:0,residue:0,burnt_residue:0},capacity:CAP[kind]||0,progress:0,lastAction:'Ready'};this.machines.push(m);this.world.block(x,y,true);return null}
 power(){const production=Math.floor(this.machines.reduce((n,m)=>n+(SUPPLY[m.kind]||0),0)*(1+this.up.energy*.2)),use=this.machines.reduce((n,m)=>n+(DEMAND[m.kind]||0),0);return {production,use,online:production>=use&&production>0,efficiency:use===0?100:Math.min(100,Math.round(production/use*100))}}
 rotate(x,y){const m=this.machines.find(m=>Math.abs(m.x-x)<=3&&Math.abs(m.y-y)<=3&&['belt','pump','filter','hopper'].includes(m.kind));if(!m)return false;m.dir=(m.dir+1)%4;this.world.dirty=true;return true}
 machineAt(x,y){return this.machines.find(m=>Math.abs(m.x-x)<=3&&Math.abs(m.y-y)<=3)}
 intake(m,keys,radius=4){if(!m.capacity||this.quantity(m)>=m.capacity)return false;const g=this.world;for(let r=1;r<=radius;r++){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=m.x+dx,y=m.y+dy,k=MATERIAL[g.at(x,y)];if(k&&keys.includes(k)&&this.accepts(m,k)){g.set(x,y,T.AIR);m.inventory[k]++;m.lastAction='Collected '+k.replaceAll('_',' ');return true}}}return false}
 transfer(from,to,key){if(!from.inventory[key]||!this.accepts(to,key)||this.quantity(to)>=to.capacity)return false;from.inventory[key]--;to.inventory[key]++;this.automated++;from.lastAction='Sending '+key.replaceAll('_',' ');to.lastAction='Receiving '+key.replaceAll('_',' ');return true}
 target(from,key){return this.machines.filter(t=>t!==from&&this.accepts(t,key)&&this.quantity(t)<t.capacity&&Math.hypot(t.x-from.x,t.y-from.y)<=10).sort((a,b)=>{const priority=k=>(['sifter','kiln','press','furnace','refinery','crusher'].includes(k)?-7:0);return priority(a.kind)-priority(b.kind)+Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y)})[0]}
 emit(m,key){const t=MATERIAL_ID[key];if(t==null)return false;const [dx,dy]=dirs[m.dir],g=this.world;const positions=[[dx*4,dy*4],[dx*5,dy*5],[0,4],[4,0],[-4,0],[0,-4],[3,3],[-3,3],[3,-3],[-3,-3]];for(const [ox,oy] of positions){const x=m.x+ox,y=m.y+oy;if(g.inside(x,y)&&g.at(x,y)===T.AIR&&!g.blocks[y*160+x]){g.set(x,y,t);m.lastAction='Released '+key.replaceAll('_',' ');return true}}return false}
 output(m,keys=['ore']){for(const key of keys){if(!m.inventory[key])continue;const to=this.target(m,key);if(to){this.transfer(m,to,key);return true}if(['sifter','kiln','press','hopper'].includes(m.kind)&&this.emit(m,key)){m.inventory[key]--;return true}}return false}
 collectLooseOre(m){return this.intake(m,['ore','gold','wet_sand','residue','burnt_residue'],2)}
 pumpWater(m){const [dx,dy]=dirs[m.dir],outX=m.x+dx*9,outY=m.y+dy*9,g=this.world;if(!g.inside(outX,outY)||g.at(outX,outY)!==T.AIR||g.blocks[outY*160+outX]){m.lastAction='Outlet blocked';return}
 for(let radius=1;radius<=8;radius++)for(let yy=-radius;yy<=radius;yy++)for(let xx=-radius;xx<=radius;xx++){if(Math.max(Math.abs(xx),Math.abs(yy))!==radius)continue;const sx=m.x+xx,sy=m.y+yy;if(g.at(sx,sy)!==T.WATER)continue;g.set(sx,sy,T.AIR);g.set(outX,outY,T.WATER);this.automated++;m.lastAction='Pumping water';return}m.lastAction='Waiting for water'}
 excavate(m){const g=this.world,depth=m.kind==='deepdrill'?8:4;for(let dy=1;dy<=depth;dy++)for(let dx=-2;dx<=2;dx++){const x=m.x+dx,y=m.y+dy,v=g.at(x,y);if(v!==T.SAND&&v!==T.WET_SAND&&v!==T.STONE&&v!==T.SANDSOIL)continue;if(Math.random()>.4)continue;g.set(x,y,T.AIR);for(const [ox,oy] of [[-3,0],[3,0],[0,-2]])if(g.inside(x+ox,y+oy)&&g.at(x+ox,y+oy)===T.AIR){g.set(x+ox,y+oy,T.SAND);break}m.lastAction='Excavating earth';return}}
 mine(m){const max=m.kind==='deepdrill'?5+this.up.drill:m.kind==='drill'?2+this.up.drill:3,radius=m.kind==='deepdrill'?10:m.kind==='drill'?6:4;let amount=0;for(let k=0;k<max;k++){if(this.quantity(m)>=m.capacity)break;let found=false;for(let dy=-radius;dy<=radius&&!found;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius&&this.world.at(m.x+dx,m.y+dy)===T.ORE){this.world.set(m.x+dx,m.y+dy,T.AIR);m.inventory.ore++;this.mined++;amount++;found=true;break}if(!found)break}if(m.kind!=='collector')this.excavate(m);m.lastAction=amount?'Mining '+amount+' ore':'Searching for ore';this.output(m,['ore'])}
 logistics(){const moved=new Set();for(const m of this.machines){if(!['belt','filter'].includes(m.kind))continue;const [dx,dy]=dirs[m.dir],target=this.machineAt(m.x+dx*6,m.y+dy*6);if(!target||target===m||moved.has(target))continue;for(const k of KEYS)if(this.transfer(m,target,k)){moved.add(target);break}}}
 processSifter(m){this.intake(m,['wet_sand'],5);const n=Math.min(m.inventory.wet_sand,1+this.up.sifting);if(n&&this.quantity(m)+n<=m.capacity){m.inventory.wet_sand-=n;m.inventory.residue+=n;this.sifted+=n;this.rp+=n;for(let i=0;i<n;i++)if(Math.random()<.25){m.inventory.gold++;this.goldProduced++;this.rp+=2}m.lastAction='Sifting '+n+' wet sand'}else if(!n)m.lastAction='Needs wet sand';this.output(m,['gold','residue'])}
 processKiln(m){this.intake(m,['residue'],5);if(m.inventory.residue>0){m.inventory.residue--;m.inventory.burnt_residue++;m.lastAction='Firing residue'}else if(!m.inventory.residue)m.lastAction='Needs residue';this.output(m,['burnt_residue'])}
 processPress(m){this.intake(m,['burnt_residue'],5);if(m.inventory.burnt_residue>=4){m.inventory.burnt_residue-=4;m.inventory.gold++;this.goldProduced++;this.rp+=3;m.lastAction='Pressing gold'}else m.lastAction='Needs 4 burnt residue';this.output(m,['gold'])}
 processCooler(m){const g=this.world,[dx,dy]=dirs[m.dir];for(let r=1;r<=5;r++)for(let ox=-r;ox<=r;ox++)for(let oy=-r;oy<=r;oy++){if(Math.max(Math.abs(ox),Math.abs(oy))!==r)continue;const x=m.x+ox,y=m.y+oy;if(g.at(x,y)!==T.WATER)continue;g.set(x,y,T.ICE);m.lastAction='Freezing water';return}m.lastAction='Needs water'}
 environmentalCycle(){if(!this.weather||this.cycle%180!==0)return;const g=this.world,roll=Math.random();let msg='';
 if(roll<.42){let count=0;for(let i=0;i<26;i++){const x=5+Math.floor(Math.random()*150),y=4+Math.floor(Math.random()*5);if(g.at(x,y)===T.AIR){g.set(x,y,T.WATER);count++}}msg='Rainstorm: '+count+' droplets falling toward your factory'}
 else if(roll<.75){let count=0;for(let i=0;i<80&&count<18;i++){const x=8+Math.floor(Math.random()*144),y=92+Math.floor(Math.random()*22);if(g.at(x,y)!==T.STONE||this.near(x,y,5))continue;g.set(x,y,T.SAND);count++}msg='Underground tremor: '+count+' stone cells loosened into sand'}
 else{let count=0;for(let i=0;i<100&&count<13;i++){const x=5+Math.floor(Math.random()*150),y=95+Math.floor(Math.random()*20);if(g.at(x,y)!==T.WATER)continue;g.set(x,y,T.STEAM);count++}msg=count?'Geothermal pulse: '+count+' water cells became steam':'Geothermal readings stable'}
 this.lastEvent=msg;this.pendingEvents.push(msg)}
 operate(){
 this.cycle++;const p=this.power();for(const m of this.machines){this.inventory(m);m.lastAction='Ready'}
 for(const m of this.machines)if(['belt','filter','hopper'].includes(m.kind)){const keys=m.kind==='filter'?['gold']:KEYS;this.intake(m,keys,m.kind==='hopper'?5:2)}
 this.logistics();
 for(const m of this.machines){
 if(['generator','solar','wind','belt','filter','storage','warehouse'].includes(m.kind))continue;
 if(DEMAND[m.kind]&&!p.online){m.lastAction='Insufficient power';continue}
 if(['drill','collector','deepdrill'].includes(m.kind))this.mine(m);
 if(m.kind==='pump')this.pumpWater(m);
 if(m.kind==='sifter')this.processSifter(m);
 if(m.kind==='kiln')this.processKiln(m);
 if(m.kind==='press')this.processPress(m);
 if(m.kind==='cooler')this.processCooler(m);
 if(m.kind==='hopper')this.output(m,KEYS);
 if(m.kind==='crusher'){if(!m.progress&&m.inventory.ore>=2){m.inventory.ore-=2;m.progress=3;this.rp++}if(m.progress){const to=this.target(m,'ore');if(to){to.inventory.ore++;m.progress--;this.automated++;m.lastAction='Crushing ore'}else if(this.emit(m,'ore')){m.progress--;m.lastAction='Crushing ore'}else m.lastAction='Output blocked'}else m.lastAction='Needs 2 ore'}
 if(m.kind==='furnace'||m.kind==='refinery'){if(m.inventory.ore){const amount=Math.min(m.inventory.ore,(m.kind==='refinery'?3:1)+this.up.refining);m.inventory.ore-=amount;this.metal+=amount;this.refined+=amount;this.rp++;m.lastAction='Smelting '+amount+' metal'}else m.lastAction='Needs ore'}
 }
 // A second belt pass makes newly generated items visible to transport immediately.
 if(this.up.logistics>0)this.logistics();
 for(const m of this.machines)if(['storage','warehouse'].includes(m.kind)){if(m.inventory.ore){this.ore+=m.inventory.ore;m.inventory.ore=0}if(m.inventory.gold){this.gold+=m.inventory.gold;m.inventory.gold=0}}
 if(this.autoSell&&(this.ore>20||this.metal>10||this.gold>=3))this.sell();
 if(this.machines.length&&this.cycle%2===0){const upkeep=Math.max(1,Math.ceil(this.machines.filter(m=>m.kind!=='belt'&&m.kind!=='filter').length*.35));this.credits=Math.max(0,this.credits-upkeep);this.expenses+=upkeep}
 if(this.cycle%30===0){this.market=Math.round((.75+Math.random()*.7)*100)/100;this.marketTime=0}this.marketTime++;this.environmentalCycle()
 }
 dig(x,y,r=2){let collected=0;const loose=[];for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const xx=x+dx,yy=y+dy;if(!this.world.inside(xx,yy)||this.world.blocks[yy*160+xx])continue;const v=this.world.at(xx,yy);if(v===T.ORE){this.ore++;this.mined++;collected++}else if(v===T.GOLD){this.gold++;this.goldProduced++;collected++}else if(v===T.SANDSOIL)loose.push([xx,yy]);if(v!==T.AIR)this.world.set(xx,yy,T.AIR)}
 for(const [xx,yy] of loose){for(const [dx,dy] of [[0,0],[0,-1],[-1,0],[1,0]]){const sx=xx+dx,sy=yy+dy;if(this.world.inside(sx,sy)&&this.world.at(sx,sy)===T.AIR&&!this.world.blocks[sy*160+sx]){this.world.set(sx,sy,T.SAND);break}}}return collected}

 sell(){const earned=Math.floor((this.ore*9+this.metal*27+this.gold*85)*this.market);this.credits+=earned;this.revenue+=earned;this.ore=0;this.metal=0;this.gold=0;return earned}
 goals(){return GOALS.map(g=>({id:g.id,title:g.title,detail:g.detail,reward:g.reward,rp:g.rp,done:g.test(this),claimed:this.claimed.includes(g.id)}))}
 claim(id){const goal=GOALS.find(g=>g.id===id);if(!goal||!goal.test(this)||this.claimed.includes(id))return null;this.claimed.push(id);this.credits+=goal.reward;this.rp+=goal.rp;return goal.title+' completed: +$'+goal.reward+' and +'+goal.rp+' RP'}
 serialize(){return {m:this.machines,credits:this.credits,ore:this.ore,metal:this.metal,gold:this.gold,rp:this.rp,up:this.up,autoSell:this.autoSell,market:this.market,marketTime:this.marketTime,mined:this.mined,refined:this.refined,goldProduced:this.goldProduced,sifted:this.sifted,revenue:this.revenue,expenses:this.expenses,cycle:this.cycle,automated:this.automated,claimed:this.claimed,weather:this.weather}}
 load(s){this.machines=(s.m||s.machines||[]).filter(m=>Object.hasOwn(PRICES,m.kind)).map(m=>({...m,dir:m.dir??0,inventory:{ore:0,metal:0,gold:0,wet_sand:0,residue:0,burnt_residue:0,...m.inventory},capacity:CAP[m.kind]??m.capacity??0,progress:m.progress||0,lastAction:m.lastAction||'Ready'}));this.credits=s.credits??s.money??600;this.ore=s.ore||0;this.metal=s.metal||0;this.gold=s.gold||0;this.rp=s.rp||0;this.up={drill:0,refining:0,energy:0,sifting:0,logistics:0,...s.up};this.autoSell=!!(s.autoSell??s.autosell);this.market=s.market||1;this.marketTime=s.marketTime||0;this.mined=s.mined||0;this.refined=s.refined||0;this.goldProduced=s.goldProduced||0;this.sifted=s.sifted||0;this.revenue=s.revenue||0;this.expenses=s.expenses||0;this.cycle=s.cycle||0;this.automated=s.automated||0;this.claimed=Array.isArray(s.claimed)?s.claimed:[];this.weather=s.weather!==false;this.pendingEvents=[];this.lastEvent='Calm';this.world.blocks.fill(0);for(const m of this.machines)this.world.block(m.x,m.y,true);this.world.dirty=true}
}