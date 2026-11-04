import {createGameShell} from './shell.js?v=0140';
import {createMigration} from './migration.js?v=0130';
import {Dynamics} from './dynamics.js?v=0120';
import {createOperations} from './operations.js?v=0100';
import {World,W,H,T,COLORS,REGIONS} from '../js/world.js?v=080-frontiers-final';
import {Factory,PRICES,COLORS as MACHINE_COLORS} from '../js/factory.js?v=080-frontiers-final';
import {CATALOG,unlocked,unlockHint} from '../js/catalog.js?v=080-frontiers-final';

// Phaser owns the game scene, graphics texture, camera, pointer input and update loop.
// INDUSTRIUM's deterministic cellular physics and factory rules are kept as game systems.
// Engine saves use a separate key so the stable release is never overwritten.
const $=id=>document.getElementById(id),KEY='industrium-phaser-engine-v1';
const world=new World(),factory=new Factory(world),dynamics=new Dynamics(world,factory);
const WIDTH=960,HEIGHT=640,SCALE=4;
let shell,migration,operations,fxGraphics,fxClock=0,frameCount=0,perfTime=0,autoSaveTime=0,showEffects=true,showGrid=false;let game,scene,texture,terrain,buildGraphics,overlayGraphics,mode='paint',material=T.SAND,building='drill',brush=3,paused=false,speed=1,drag=false,lastPointer=null,lastFrame=0,acc=0,ops=0;
const notice=s=>{$('notice').textContent=s};
const materialNames=[['Sand',T.SAND],['Water',T.WATER],['Stone',T.STONE],['Ore',T.ORE],['Fire',T.FIRE],['Metal',T.METAL],['Steam',T.STEAM],['Wet Sand',T.WET_SAND],['Gold',T.GOLD],['Residue',T.RESIDUE],['Ash',T.BURNT_RESIDUE],['Ice',T.ICE],['Lava',T.LAVA],['Glass',T.GLASS],['Sandsoil',T.SANDSOIL],['Silt',T.SILT],['Oil',T.OIL],['Crystal',T.CRYSTAL],['Basalt',T.BASALT],['Acid',T.ACID],['Vapour',T.VAPOUR],['Snow',T.SNOW],['Artefact',T.ARTIFACT],['Obsidian',T.OBSIDIAN],['Fuel',T.FUEL],['Erase',T.AIR],['Dig',-1]];
const restrictedMaterials=new Set([T.ORE,T.GOLD,T.WET_SAND,T.RESIDUE,T.BURNT_RESIDUE,T.OIL,T.CRYSTAL,T.FUEL,T.ARTIFACT]);
const buildNames=['generator','drill','collector','furnace','solar','wind','storage','belt','pump','mixer','sifter','oilrig','distiller','combustor','battery','crystaldrill','surveyor','stabilizer','crusher','warehouse','deepdrill','refinery','hopper','kiln','press','filter','cooler','excavator','condenser','waterwheel'];
const valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function status(){
 const p=factory.power(),c=scene?.cameras.main,x=c?Math.max(0,Math.min(W-1,Math.floor(c.midPoint.x/SCALE))):0;
 const region=world.region(x);$('region').textContent=region.title;if(!factory.regionVisits.includes(region.id))factory.regionVisits.push(region.id);
 $('power').textContent='Power '+p.production+' / '+p.use;
 $('credits').textContent='Credits $'+Math.floor(factory.credits);
 $('machines').textContent=factory.machines.length+' machines';
 $('heat').textContent='Heat '+dynamics.heatPeak;
 $('pollution').textContent='Pollution '+dynamics.pollutionPeak;
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
 for(const [name,id] of materialNames){const b=document.createElement('button');b.textContent=name;b.dataset.material=id;b.dataset.restricted=restrictedMaterials.has(id)?'1':'0';if(id>=0&&COLORS[id]){const color=COLORS[id];b.style.borderLeft='4px solid rgb('+color.join(',')+')'}b.onclick=()=>{if(restrictedMaterials.has(id)&&!factory.creative){notice(name+' requires Creative Sandbox. Enable it in Settings.');return}material=id;mode='paint';refreshButtons();notice(name+' tool selected')};mat.append(b)}
 for(const kind of buildNames){const b=document.createElement('button');b.textContent=(CATALOG[kind]?.title||kind)+' · $'+PRICES[kind];b.dataset.machine=kind;b.dataset.price=PRICES[kind];b.dataset.category=CATALOG[kind]?.category||'Other';b.onclick=()=>{if(!unlocked(kind,factory)){notice((CATALOG[kind]?.title||kind)+' locked: '+unlockHint(kind));shell?.refreshCatalog();return}building=kind;mode='build';refreshButtons();notice('Tap the world to place '+(CATALOG[kind]?.title||kind))};machines.append(b)}
 for(const id of ['paint','pan','inspect'])$(id).onclick=()=>{mode=id;refreshButtons();notice(id==='pan'?'Drag to move the camera':id==='inspect'?'Tap machinery to inspect':'Tap to paint terrain')};
 $('pause').onclick=()=>{paused=!paused;refreshButtons()};
 $('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;refreshButtons()};
 $('effects').onclick=()=>{showEffects=!showEffects;$('effects').classList.toggle('active',showEffects);$('effects').textContent='Effects '+(showEffects?'On':'Off');if(!showEffects)fxGraphics?.clear()};
 $('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('active',showGrid);$('grid').textContent='Grid '+(showGrid?'On':'Off')};
 $('environment').onclick=()=>{dynamics.active=!dynamics.active;$('environment').textContent='Dynamics '+(dynamics.active?'On':'Off');$('environment').classList.toggle('active',dynamics.active);notice('Environmental simulation '+(dynamics.active?'enabled':'paused'))};
 $('home').onclick=()=>{if(!scene)return;scene.cameras.main.centerOn(480,350);clampCamera();status()};
 $('zoomIn').onclick=()=>setZoom(1.25);
 $('zoomOut').onclick=()=>setZoom(.8);
 $('save').onclick=()=>saveEngine();
 $('load').onclick=()=>{if(loadEngine()){notice('Engine save loaded');renderTerrain();renderMachines();status();operations?.render();migration?.render();shell?.updateMenu();shell?.refreshCatalog();shell?.syncMaterials()}else notice('No engine save found')};
 $('new').onclick=()=>{if(!confirm('Replace the Phaser autosave with a new random planet?'))return;newWorld()};
 refreshButtons();
}
function setZoom(mult){if(!scene)return;const c=scene.cameras.main;c.setZoom(Phaser.Math.Clamp(c.zoom*mult,.7,3.5));clampCamera();status()}
function clampCamera(){if(!scene)return;const c=scene.cameras.main,visW=c.width/c.zoom,visH=c.height/c.zoom;if(visW>=WIDTH)c.centerOn(WIDTH/2,c.midPoint.y);if(visH>=HEIGHT)c.centerOn(c.midPoint.x,HEIGHT/2);c.setScroll(Phaser.Math.Clamp(c.scrollX,0,Math.max(0,WIDTH-visW)),Phaser.Math.Clamp(c.scrollY,0,Math.max(0,HEIGHT-visH)))}
function saveEngine(silent=false){try{localStorage.setItem(KEY,JSON.stringify({grid:Array.from(world.grid),seed:world.seed,factory:factory.serialize(),environment:dynamics.snapshot(),savedAt:Date.now()}));if(!silent)notice('Factory saved');return true}catch(e){notice('Save failed: '+e.message);return false}}
function newWorld(seed){const creative=factory.creative,weather=factory.weather;world.generate(seed);factory.load({creative,weather});dynamics.reset();world.dirty=true;saveEngine(true);renderTerrain();renderMachines();status();operations?.render();migration?.render();shell?.refreshCatalog();shell?.updateMenu();notice('New planet ready · Seed '+world.seed)}
function travel(x,y){if(!scene)return;scene.cameras.main.centerOn(x*SCALE,y*SCALE);clampCamera();status()}
function loadEngine(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||!world.import(s.grid))return false;world.seed=s.seed||0;factory.load(s.factory||{});dynamics.restore(s.environment);return true}catch(e){return false}}
function renderTerrain(){
 if(!texture)return;
 const pixels=texture.getContext().createImageData(W,H),d=pixels.data;
 for(let i=0;i<world.grid.length;i++){const col=COLORS[world.grid[i]]||COLORS[0],j=i*4;d[j]=col[0];d[j+1]=col[1];d[j+2]=col[2];d[j+3]=255}
 texture.getContext().putImageData(pixels,0,0);texture.refresh();world.dirty=false;
}
function renderMachines(time=0){
 if(!buildGraphics)return;
 buildGraphics.clear();
 for(const m of factory.machines){
  const color=Phaser.Display.Color.HexStringToColor(MACHINE_COLORS[m.kind]||'#c8d6dc').color,x=m.x*SCALE,y=m.y*SCALE;
  buildGraphics.fillStyle(0x07131d,1);buildGraphics.fillRect(x-13,y-13,26,26);
  buildGraphics.fillStyle(color,1);buildGraphics.fillRect(x-10,y-10,20,20);
  buildGraphics.fillStyle(0xffffff,.32);buildGraphics.fillRect(x-10,y-10,20,3);
  const pulse=(Math.sin(time*.005+m.x)+1)*.5;
  if(['generator','furnace','refinery','combustor','kiln','distiller'].includes(m.kind)){buildGraphics.fillStyle(0xffbd63,.3+pulse*.6);buildGraphics.fillRect(x-6,y-6,12,12)}
  if(['drill','deepdrill','crystaldrill','excavator','oilrig'].includes(m.kind)){buildGraphics.lineStyle(2,0xe4f5f5,.5+pulse*.5);buildGraphics.lineBetween(x-7,y+6,x-7+Math.floor(pulse*12),y+6)}
  if(['belt','pump','hopper'].includes(m.kind)){buildGraphics.fillStyle(0x06151b,.8);buildGraphics.fillCircle(x-5+pulse*10,y,2.5)}
  if((m.integrity??100)<40){buildGraphics.lineStyle(2,0xff6655);buildGraphics.strokeRect(x-12,y-12,24,24)}
 }
}
function renderEffects(time){
 if(!fxGraphics)return;
 fxGraphics.clear();
 if(showGrid&&scene?.cameras.main.zoom>=2){fxGraphics.lineStyle(1,0x79a2b1,.13);for(let x=0;x<=WIDTH;x+=40)fxGraphics.lineBetween(x,0,x,HEIGHT);for(let y=0;y<=HEIGHT;y+=40)fxGraphics.lineBetween(0,y,WIDTH,y)}
 if(!showEffects)return;
 for(const m of factory.machines){
  const x=m.x*SCALE,y=m.y*SCALE,phase=time*.002+m.x*.31;
  if(['furnace','kiln','combustor','refinery'].includes(m.kind)){
   for(let i=0;i<3;i++){const rise=(phase*12+i*11)%42;fxGraphics.fillStyle(i%2?0xffc17a:0xb2d2d9,Math.max(.05,.36-rise/125));fxGraphics.fillCircle(x+Math.sin(phase+i)*8,y-14-rise,2+i%2)}
  }
  if(['generator','wind','solar','waterwheel'].includes(m.kind)){fxGraphics.lineStyle(1.5,0x91e8d1,.4+.3*Math.sin(phase*3));fxGraphics.strokeCircle(x,y,15+Math.sin(phase*2)*2)}
 }
}
function worldPoint(pointer){const p=scene.cameras.main.getWorldPoint(pointer.x,pointer.y);return{x:Math.floor(p.x/SCALE),y:Math.floor(p.y/SCALE)}}
function interact(pointer,first){
 const p=worldPoint(pointer);if(!valid(p.x,p.y))return;
 if(mode==='pan'){if(lastPointer){const c=scene.cameras.main;c.scrollX-=(pointer.x-lastPointer.x)/c.zoom;c.scrollY-=(pointer.y-lastPointer.y)/c.zoom;clampCamera()}lastPointer={x:pointer.x,y:pointer.y};return}
 if(mode==='inspect'){if(!first)return;const m=factory.machineAt(p.x,p.y);operations?.inspect(m);notice(m?(CATALOG[m.kind]?.title||m.kind)+' · '+(m.lastAction||'Ready')+' · Health '+(m.integrity??100)+'%':world.region(p.x).title+' · material '+world.at(p.x,p.y));return}
 if(mode==='build'){if(!first)return;const result=factory.place(building,p.x,p.y);notice(result||'Built '+(CATALOG[building]?.title||building));renderMachines();status();operations?.render();return}
 if(mode==='paint'){if(restrictedMaterials.has(material)&&!factory.creative){if(first)notice('Enable Creative Sandbox to place rare resources');return}if(material===-1){const n=factory.dig(p.x,p.y,brush);if(first)notice('Excavated '+n+' terrain cells')}else world.paint(p.x,p.y,material,brush)}
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
   fxGraphics=this.add.graphics().setDepth(6);
   this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setZoom(1.4).centerOn(240,350);
   this.input.on('pointerdown',p=>{drag=true;lastPointer=null;interact(p,true)});
   this.input.on('pointermove',p=>{if(drag&&p.isDown)interact(p,false)});
   this.input.on('pointerup',()=>{drag=false;lastPointer=null});
   this.input.on('gameout',()=>{drag=false;lastPointer=null});
   this.input.on('wheel',(pointer,objects,dx,dy)=>{setZoom(dy>0?.9:1.1)});
   this.input.on('pointerdown',p=>{if(this.input.pointer1.isDown&&this.input.pointer2.isDown){drag=false;lastPointer=null}});
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
   while(acc>=step&&count<3){acc-=step;count++;for(let s=0;s<speed;s++){world.simulate();dynamics.step();if(++ops%6===0)factory.operate()}}
   if(time-lastFrame>65){if(world.dirty||time-lastFrame>450)renderTerrain();renderMachines(time);renderEffects(time);status();lastFrame=time}
   if(time-autoSaveTime>90000){autoSaveTime=time;saveEngine()}
   frameCount++;if(time-perfTime>3000){const fps=Math.round(frameCount*1000/Math.max(1,time-perfTime));const el=$('fps');if(el)el.textContent=fps+' FPS';frameCount=0;perfTime=time}
  }
 }
 try{game=new Phaser.Game({type:Phaser.AUTO,parent:'viewport',width:WIDTH,height:HEIGHT,backgroundColor:'#08121d',pixelArt:true,roundPixels:true,antialias:false,render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:WIDTH,height:HEIGHT},input:{activePointers:3},scene:[FactoryScene],audio:{noAudio:true},banner:false})}
 catch(e){$('loading').textContent='Phaser startup failed';$('error').textContent=e.message}
}
makeTools();if(!loadEngine())world.generate();operations=createOperations(factory,{notice,save:saveEngine,status});migration=createMigration({world,factory,dynamics,save:saveEngine,refresh:()=>{renderTerrain();renderMachines();status();operations?.render()},notice,travel:i=>{if(scene){scene.cameras.main.centerOn((i*60+30)*SCALE,350);clampCamera();status()}}});startPhaser();
window.addEventListener('pagehide',()=>{if(scene)saveEngine()});
