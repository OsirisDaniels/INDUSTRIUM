import {createOperations} from './operations.js?v=0100';
import {World,W,H,T,COLORS,REGIONS} from '../js/world.js?v=080-frontiers-final';
import {Factory,PRICES,COLORS as MACHINE_COLORS} from '../js/factory.js?v=080-frontiers-final';
import {CATALOG} from '../js/catalog.js?v=080-frontiers-final';

// Phaser owns the game scene, graphics texture, camera, pointer input and update loop.
// INDUSTRIUM's deterministic cellular physics and factory rules are kept as game systems.
// Engine saves use a separate key so the stable release is never overwritten.
const $=id=>document.getElementById(id),KEY='industrium-phaser-engine-v1';
const world=new World(),factory=new Factory(world);
const WIDTH=960,HEIGHT=640,SCALE=4;
let operations;let game,scene,texture,terrain,buildGraphics,overlayGraphics,mode='paint',material=T.SAND,building='drill',brush=3,paused=false,speed=1,drag=false,lastPointer=null,lastFrame=0,acc=0,ops=0;
const notice=s=>{$('notice').textContent=s};
const materialNames=[['Sand',T.SAND],['Water',T.WATER],['Stone',T.STONE],['Fire',T.FIRE],['Lava',T.LAVA],['Oil',T.OIL],['Acid',T.ACID],['Ice',T.ICE],['Snow',T.SNOW],['Silt',T.SILT],['Steam',T.STEAM],['Erase',T.AIR],['Dig',-1]];
const buildNames=['generator','drill','collector','furnace','solar','wind','storage','belt','pump','mixer','sifter','oilrig','distiller','combustor','battery','crystaldrill','surveyor','stabilizer','crusher','warehouse','deepdrill','refinery','hopper','kiln','press','filter','cooler','excavator','condenser','waterwheel'];
const valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function status(){
 const p=factory.power(),c=scene?.cameras.main,x=c?Math.max(0,Math.min(W-1,Math.floor(c.midPoint.x/SCALE))):0;
 $('region').textContent=world.region(x).title;
 $('power').textContent='Power '+p.production+' / '+p.use;
 $('credits').textContent='Credits $'+Math.floor(factory.credits);
 $('machines').textContent=factory.machines.length+' machines';
}
function refreshButtons(){
 for(const b of document.querySelectorAll('[data-material]'))b.classList.toggle('active',mode==='paint'&&material===Number(b.dataset.material));
 for(const b of document.querySelectorAll('[data-machine]'))b.classList.toggle('active',mode==='build'&&building===b.dataset.machine);
 for(const id of ['paint','pan','inspect'])$(id).classList.toggle('active',mode===id);
 $('pause').textContent=paused?'Resume':'Pause';
 $('speed').textContent=speed+'× speed';
}
function makeTools(){
 const mat=$('materials'),machines=$('factoryTools');
 for(const [name,id] of materialNames){const b=document.createElement('button');b.textContent=name;b.dataset.material=id;b.onclick=()=>{material=id;mode='paint';refreshButtons();notice(name+' tool selected')};mat.append(b)}
 for(const kind of buildNames){const b=document.createElement('button');b.textContent=(CATALOG[kind]?.title||kind)+' · $'+PRICES[kind];b.dataset.machine=kind;b.onclick=()=>{building=kind;mode='build';refreshButtons();notice('Tap the world to place '+kind)};machines.append(b)}
 for(const id of ['paint','pan','inspect'])$(id).onclick=()=>{mode=id;refreshButtons();notice(id==='pan'?'Drag to move the camera':id==='inspect'?'Tap machinery to inspect':'Tap to paint terrain')};
 $('pause').onclick=()=>{paused=!paused;refreshButtons()};
 $('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;refreshButtons()};
 $('zoomIn').onclick=()=>setZoom(1.25);
 $('zoomOut').onclick=()=>setZoom(.8);
 $('save').onclick=saveEngine;
 $('load').onclick=()=>{if(loadEngine()){notice('Engine save loaded');renderTerrain();renderMachines();status();operations?.render()}else notice('No engine save found')};
 $('new').onclick=()=>{if(!confirm('Create a new engine world? This replaces the engine test save only.'))return;factory.load({});world.generate();world.dirty=true;saveEngine();renderTerrain();renderMachines();status();operations?.render();notice('New engine world created')};
 refreshButtons();
}
function setZoom(mult){if(!scene)return;const c=scene.cameras.main;c.setZoom(Phaser.Math.Clamp(c.zoom*mult,.7,3.5));clampCamera();status()}
function clampCamera(){if(!scene)return;const c=scene.cameras.main;c.setScroll(Phaser.Math.Clamp(c.scrollX,0,Math.max(0,WIDTH-WIDTH/c.zoom)),Phaser.Math.Clamp(c.scrollY,0,Math.max(0,HEIGHT-HEIGHT/c.zoom)))}
function saveEngine(){try{localStorage.setItem(KEY,JSON.stringify({grid:Array.from(world.grid),seed:world.seed,factory:factory.serialize(),savedAt:Date.now()}));notice('Engine world saved');return true}catch(e){notice('Save failed: '+e.message);return false}}
function loadEngine(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||!world.import(s.grid))return false;world.seed=s.seed||0;factory.load(s.factory||{});return true}catch(e){return false}}
function renderTerrain(){
 if(!texture)return;
 const pixels=texture.getContext().createImageData(W,H),d=pixels.data;
 for(let i=0;i<world.grid.length;i++){const col=COLORS[world.grid[i]]||COLORS[0],j=i*4;d[j]=col[0];d[j+1]=col[1];d[j+2]=col[2];d[j+3]=255}
 texture.getContext().putImageData(pixels,0,0);texture.refresh();world.dirty=false;
}
function renderMachines(){
 if(!buildGraphics)return;
 buildGraphics.clear();
 for(const m of factory.machines){
  const color=Phaser.Display.Color.HexStringToColor(MACHINE_COLORS[m.kind]||'#c8d6dc').color,x=m.x*SCALE,y=m.y*SCALE;
  buildGraphics.fillStyle(0x07131d,1);buildGraphics.fillRect(x-13,y-13,26,26);
  buildGraphics.fillStyle(color,1);buildGraphics.fillRect(x-10,y-10,20,20);
  buildGraphics.fillStyle(0xffffff,.32);buildGraphics.fillRect(x-10,y-10,20,3);
  if((m.integrity??100)<40){buildGraphics.lineStyle(2,0xff6655);buildGraphics.strokeRect(x-12,y-12,24,24)}
 }
}
function worldPoint(pointer){const p=scene.cameras.main.getWorldPoint(pointer.x,pointer.y);return{x:Math.floor(p.x/SCALE),y:Math.floor(p.y/SCALE)}}
function interact(pointer,first){
 const p=worldPoint(pointer);if(!valid(p.x,p.y))return;
 if(mode==='pan'){if(lastPointer){const c=scene.cameras.main;c.scrollX-=(pointer.x-lastPointer.x)/c.zoom;c.scrollY-=(pointer.y-lastPointer.y)/c.zoom;clampCamera()}lastPointer={x:pointer.x,y:pointer.y};return}
 if(mode==='inspect'){if(!first)return;const m=factory.machineAt(p.x,p.y);operations?.inspect(m);notice(m?(CATALOG[m.kind]?.title||m.kind)+' · '+(m.lastAction||'Ready')+' · Health '+(m.integrity??100)+'%':world.region(p.x).title+' · material '+world.at(p.x,p.y));return}
 if(mode==='build'){if(!first)return;const result=factory.place(building,p.x,p.y);notice(result||'Built '+(CATALOG[building]?.title||building));renderMachines();status();operations?.render();return}
 if(mode==='paint'){if(material===-1){const n=factory.dig(p.x,p.y,brush);if(first)notice('Excavated '+n+' terrain cells')}else world.paint(p.x,p.y,material,brush)}
}
function startPhaser(){
 if(!window.Phaser){$('error').textContent='Phaser could not load. Check your connection and try reloading.';$('loading').textContent='Game engine unavailable';return}
 class FactoryScene extends Phaser.Scene{
  constructor(){super({key:'FactoryWorld'})}
  create(){
   scene=this;
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
   texture=this.textures.addCanvas('planet-terrain',canvas);
   terrain=this.add.image(0,0,'planet-terrain').setOrigin(0,0).setScale(SCALE).setDepth(0);
   buildGraphics=this.add.graphics().setDepth(5);
   overlayGraphics=this.add.graphics().setDepth(7);
   this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setZoom(1.4).centerOn(240,350);
   this.input.on('pointerdown',p=>{drag=true;lastPointer=null;interact(p,true)});
   this.input.on('pointermove',p=>{if(drag&&p.isDown)interact(p,false)});
   this.input.on('pointerup',()=>{drag=false;lastPointer=null});
   this.input.on('gameout',()=>{drag=false;lastPointer=null});
   this.input.on('wheel',(pointer,objects,dx,dy)=>{setZoom(dy>0?.9:1.1)});
   this.input.addPointer(2);
   renderTerrain();renderMachines();status();
   $('loading').classList.add('hide');
   $('engine').textContent='Phaser '+Phaser.VERSION+' · '+(this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas');
   notice('Phaser scene ready. Select a material or machine, then tap the world.');
  }
  update(time,delta){
   if(paused)return;
   acc=Math.min(acc+Math.min(delta,100),200);
   const step=33.333;let count=0;
   while(acc>=step&&count<3){acc-=step;count++;for(let s=0;s<speed;s++){world.simulate();if(++ops%6===0)factory.operate()}}
   if(time-lastFrame>55){renderTerrain();renderMachines();status();lastFrame=time}
  }
 }
 try{game=new Phaser.Game({type:Phaser.AUTO,parent:'viewport',width:WIDTH,height:HEIGHT,backgroundColor:'#08121d',pixelArt:true,roundPixels:true,antialias:false,render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:WIDTH,height:HEIGHT},input:{activePointers:3},scene:[FactoryScene],audio:{noAudio:true},banner:false})}
 catch(e){$('loading').textContent='Phaser startup failed';$('error').textContent=e.message}
}
makeTools();if(!loadEngine())world.generate();operations=createOperations(factory,{notice,save:saveEngine,status});startPhaser();
window.addEventListener('pagehide',()=>{if(scene)saveEngine()});
