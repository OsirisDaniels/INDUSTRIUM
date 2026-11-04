import {Autonomy} from './autonomy.js?v=0233';
import {createPlayer} from './player.js?v=0232';
import {LivingWorld} from './living.js?v=0231';
import {Intelligence} from './intelligence.js?v=0233';
import {createCore} from './core.js?v=0233';
import {createCoreUI} from './core-ui.js?v=0230';
import {createPerformance} from './performance.js?v=0170';
import {createSound} from './sound.js?v=0231';
import {paintTerrain,drawMachines,drawAtmosphere,drawPlacement} from './visuals.js?v=0233';
import {createGameShell} from './shell.js?v=0233';
import {createMigration} from './migration.js?v=0230';
import {Dynamics} from './dynamics.js?v=0120';
import {createOperations} from './operations.js?v=0100';
import {World,W,H,T,COLORS,REGIONS} from '../js/world.js?v=080-frontiers-final';
import {Factory,PRICES,DEMAND,COLORS as MACHINE_COLORS} from '../js/factory.js?v=0233';
import {CATALOG,unlocked,unlockHint} from '../js/catalog.js?v=080-frontiers-final';

// Phaser owns the game scene, graphics texture, camera, pointer input and update loop.
// INDUSTRIUM's deterministic cellular physics and factory rules are kept as game systems.
// Engine saves use a separate key so the stable release is never overwritten.
const $=id=>document.getElementById(id),KEY='industrium-phaser-engine-v1';
const world=new World(),factory=new Factory(world),dynamics=new Dynamics(world,factory),sound=createSound(),perfController=createPerformance();
const living=new LivingWorld(world,factory,dynamics),intelligence=new Intelligence(world,factory,dynamics,living),autonomy=new Autonomy(factory,intelligence),player=createPlayer(world),core=createCore(factory,dynamics,living,intelligence);
let coreUI,lastCoreRender=0,playerGraphics,lastPlayerDraw=0,lastFootstep=0,lastHazardSound=0,joyAxis=0,joyPointer=null,joyJumpLatched=false,pressStart=null,touchGesture=false;
try{perfController.setMode(localStorage.getItem('industrium-performance')||'auto')}catch(e){}
try{sound.setEnabled(localStorage.getItem('industrium-sound')!=='off');sound.setVolume(Number(localStorage.getItem('industrium-volume')??35)/100);sound.setAmbience(localStorage.getItem('industrium-ambience')!=='off')}catch(e){}
const WIDTH=960,HEIGHT=640,SCALE=4;
let lastPreviewKey='',lastPreviewText='',lastTerrainAt=0,lastMachinesAt=0,lastEffectsAt=0,hoverCell=null,targetZoom=1.4,worldTime=0,previewReason=null,previewGraphics,ambienceGraphics,miniOpen=false,lastMini=0,lastHud=0;let shell,migration,operations,fxGraphics,fxClock=0,frameCount=0,perfTime=0,autoSaveTime=0,showEffects=true,showGrid=false,batterySaver=false;let game,scene,texture,terrain,buildGraphics,overlayGraphics,mode='pan',material=-1,building='drill',brush=3,paused=false,speed=1,drag=false,lastPointer=null,lastFrame=0,acc=0,ops=0;
const notice=s=>{const el=$('notice');if(el.textContent!==s)el.textContent=s};
const materialNames=[['Sand',T.SAND],['Water',T.WATER],['Stone',T.STONE],['Ore',T.ORE],['Fire',T.FIRE],['Metal',T.METAL],['Steam',T.STEAM],['Wet Sand',T.WET_SAND],['Gold',T.GOLD],['Residue',T.RESIDUE],['Ash',T.BURNT_RESIDUE],['Ice',T.ICE],['Lava',T.LAVA],['Glass',T.GLASS],['Sandsoil',T.SANDSOIL],['Silt',T.SILT],['Oil',T.OIL],['Crystal',T.CRYSTAL],['Basalt',T.BASALT],['Acid',T.ACID],['Vapour',T.VAPOUR],['Snow',T.SNOW],['Artefact',T.ARTIFACT],['Obsidian',T.OBSIDIAN],['Fuel',T.FUEL],['Erase',T.AIR],['Dig',-1]];
const restrictedMaterials=new Set([T.ORE,T.GOLD,T.WET_SAND,T.RESIDUE,T.BURNT_RESIDUE,T.OIL,T.CRYSTAL,T.FUEL,T.ARTIFACT]);
const buildNames=['generator','drill','collector','furnace','solar','wind','storage','belt','pump','mixer','sifter','oilrig','distiller','combustor','battery','crystaldrill','surveyor','stabilizer','crusher','warehouse','deepdrill','refinery','hopper','kiln','press','filter','cooler','excavator','condenser','waterwheel'];
const performanceNow=()=>performance.now();
const valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function status(){
 const p=factory.power(),c=scene?.cameras.main,x=c?Math.max(0,Math.min(W-1,Math.floor(c.midPoint.x/SCALE))):0;
 const region=world.region(x);$('region').textContent=region.title;if(!factory.regionVisits.includes(region.id)){factory.regionVisits.push(region.id);const r=living.regions[Math.floor(x/60)];if(r)r.visits++;living.record('Expedition reached '+region.title,region.id)}
 $('power').textContent='Power '+p.production+' / '+p.use;
 $('credits').textContent='Credits $'+Math.floor(factory.credits);
 $('machines').textContent=factory.machines.length+' machines';
 $('heat').textContent='Heat '+dynamics.heatPeak;
 $('pollution').textContent='Pollution '+dynamics.pollutionPeak;
 $('worldBiome').textContent=region.title.toUpperCase()+' · '+living.getWeather(x).toUpperCase();$('worldCoords').textContent=x+', '+(c?Math.max(0,Math.min(H-1,Math.floor(c.midPoint.y/SCALE))):0)+' · '+factory.machines.length+' active installations';
 $('worldMode').textContent=mode==='build'?'CONSTRUCTION':mode==='paint'?'EXCAVATION':mode==='inspect'?'MACHINE INSPECTOR':mode==='walk'?'ON FOOT':'CAMERA CONTROL';
 $('worldTime').textContent='CYCLE '+Math.max(1,Math.floor(world.tick/900)+1);
 $('playerTitle').textContent=player.style.toUpperCase()+' 01';$('playerStatus').textContent='HP '+Math.round(player.health)+' · Energy '+Math.round(player.stamina);
}
function refreshButtons(){
 for(const b of document.querySelectorAll('[data-material]'))b.classList.toggle('active',mode==='paint'&&material===Number(b.dataset.material));
 for(const b of document.querySelectorAll('[data-machine]'))b.classList.toggle('active',mode==='build'&&building===b.dataset.machine);
 for(const id of ['paint','pan','walk','inspect'])$(id).classList.toggle('active',mode===id);
 $('playerStyle').value=player.style;$('paint').textContent=factory.creative?'Draw':'Excavate';$('touchControls').hidden=mode!=='walk';$('followPlayer').textContent=player.follow?'Follow On':'Follow Off';$('followPlayer').classList.toggle('active',player.follow);
 $('pause').textContent=paused?'Resume':'Pause';
 $('speed').textContent=speed+'× speed';$('toolName').textContent='Tool: '+(mode==='build'?(CATALOG[building]?.title||building):mode==='paint'?(materialNames.find(m=>m[1]===material)?.[0]||'Paint'):mode==='inspect'?'Inspector':mode==='walk'?'Engineer':'Camera');
}
function makeTools(){
 const mat=$('materials'),machines=$('factoryTools');
 for(const [name,id] of materialNames){const b=document.createElement('button');b.textContent=name;b.dataset.material=id;b.dataset.restricted=restrictedMaterials.has(id)?'1':'0';if(id>=0&&COLORS[id]){const color=COLORS[id];b.style.borderLeft='4px solid rgb('+color.join(',')+')'}b.onclick=()=>{if(!factory.creative&&id!==-1){notice('Career Mode: free material spawning is locked. Use Excavate or switch to Creative.');sound.play('error');return}material=id;mode='paint';refreshButtons();sound.play('select');notice(name+' tool selected')};mat.append(b)}
 for(const kind of buildNames){const b=document.createElement('button');b.textContent=(CATALOG[kind]?.title||kind)+' · $'+PRICES[kind];b.dataset.machine=kind;b.dataset.price=PRICES[kind];b.dataset.category=CATALOG[kind]?.category||'Other';b.onclick=()=>{if(!unlocked(kind,factory)){notice((CATALOG[kind]?.title||kind)+' locked: '+unlockHint(kind));shell?.refreshCatalog();return}building=kind;mode='build';refreshButtons();sound.play('select');notice('Tap the world to place '+(CATALOG[kind]?.title||kind))};machines.append(b)}
 for(const id of ['paint','pan','walk','inspect'])$(id).onclick=()=>{if(id==='paint'&&!factory.creative)material=-1;if(id==='walk')player.follow=true;mode=id;sound.play('select');refreshButtons();notice(id==='pan'?'Drag with one finger to pan. Pinch with two to zoom.':id==='walk'?'Use the thumb joystick and JUMP, or tap to walk.':id==='inspect'?'Tap machinery to inspect':'Tap or drag to edit terrain')};
 $('pause').onclick=()=>{paused=!paused;sound.play(paused?'pause':'resume');refreshButtons()};
 $('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;sound.play('click');refreshButtons()};
 $('effects').onclick=()=>{showEffects=!showEffects;$('effects').classList.toggle('active',showEffects);$('effects').textContent='Effects '+(showEffects?'On':'Off');if(!showEffects)fxGraphics?.clear()};
 $('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('active',showGrid);$('grid').textContent='Grid '+(showGrid?'On':'Off')};
 $('soundToggle').textContent=sound.enabled?'Sound On':'Sound Off';$('soundToggle').classList.toggle('active',sound.enabled);$('soundVolume').value=Math.round(sound.volume*100);
 $('soundToggle').onclick=()=>{sound.setEnabled(!sound.enabled);$('soundToggle').textContent=sound.enabled?'Sound On':'Sound Off';$('soundToggle').classList.toggle('active',sound.enabled);try{localStorage.setItem('industrium-sound',sound.enabled?'on':'off')}catch(e){}if(sound.enabled)sound.play('select')};
 $('playerStyle').onchange=e=>{player.style=e.target.value;sound.play('select');saveEngine(true);refreshButtons()};
 $('soundAmbience').textContent=sound.ambience?'Ambience On':'Ambience Off';$('soundAmbience').classList.toggle('active',sound.ambience);
 $('soundAmbience').onclick=()=>{sound.setAmbience(!sound.ambience);$('soundAmbience').textContent=sound.ambience?'Ambience On':'Ambience Off';$('soundAmbience').classList.toggle('active',sound.ambience);try{localStorage.setItem('industrium-ambience',sound.ambience?'on':'off')}catch(e){}};
 $('soundVolume').oninput=e=>{sound.setVolume(Number(e.target.value)/100);try{localStorage.setItem('industrium-volume',e.target.value)}catch(e){}};
 $('performanceMode').value=perfController.mode;
 $('performanceMode').onchange=e=>{perfController.setMode(e.target.value);try{localStorage.setItem('industrium-performance',perfController.mode)}catch(err){}notice('Performance profile: '+perfController.mode)};
 $('batterySaver').onclick=()=>{batterySaver=!batterySaver;$('batterySaver').classList.toggle('active',batterySaver);$('batterySaver').textContent='Saver '+(batterySaver?'On':'Off');notice('Battery saver '+(batterySaver?'enabled: reduced render and simulation frequency':'disabled'))};
 $('environment').onclick=()=>{dynamics.active=!dynamics.active;$('environment').textContent='Dynamics '+(dynamics.active?'On':'Off');$('environment').classList.toggle('active',dynamics.active);notice('Environmental simulation '+(dynamics.active?'enabled':'paused'))};
 $('home').onclick=()=>{if(!scene)return;scene.cameras.main.centerOn(480,350);clampCamera();status()};
 $('undoTool').onclick=()=>{mode='pan';hoverCell=null;previewGraphics?.clear();refreshButtons();notice('Camera control selected')};
 $('followPlayer').onclick=()=>{player.follow=!player.follow;refreshButtons();sound.play('select');notice(player.follow?'Camera follows engineer':'Free camera enabled')};
 $('jumpBtn').onpointerdown=e=>{e.preventDefault();player.jump();sound.play('jump')};
 const pad=$('joyPad'),knob=$('joyKnob');
 const moveJoy=e=>{const r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),radius=r.width*.38;joyAxis=Math.max(-1,Math.min(1,dx/radius));knob.style.transform='translate('+Math.round(Math.max(-radius,Math.min(radius,dx)))+'px,'+Math.round(Math.max(-radius,Math.min(radius,dy)))+'px)';if(dy<-radius*.6&&!joyJumpLatched){joyJumpLatched=true;player.jump();sound.play('jump')}if(dy>-radius*.25)joyJumpLatched=false};
 pad.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;pad.setPointerCapture(e.pointerId);moveJoy(e)});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){e.preventDefault();moveJoy(e)}});
 const releaseJoy=e=>{if(e.pointerId===joyPointer){joyPointer=null;joyAxis=0;joyJumpLatched=false;knob.style.transform='translate(0,0)'}};
 pad.addEventListener('pointerup',releaseJoy);pad.addEventListener('pointercancel',releaseJoy);
 $('mapToggle').onclick=()=>{miniOpen=!miniOpen;$('miniMapPanel').hidden=!miniOpen;if(miniOpen)drawMiniMap(true)};
 $('miniMapClose').onclick=()=>{miniOpen=false;$('miniMapPanel').hidden=true};
 $('miniMap').onclick=e=>{if(!scene)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.max(0,Math.min(W-1,Math.floor((e.clientX-r.left)/r.width*W))),y=Math.max(0,Math.min(H-1,Math.floor((e.clientY-r.top)/r.height*H)));travel(x,y);notice('Camera moved to '+world.region(x).title)};
 $('zoomIn').onclick=()=>{sound.play('zoom');setZoom(1.25)};
 $('zoomOut').onclick=()=>{sound.play('zoom');setZoom(.8)};
 $('save').onclick=()=>saveEngine();
 $('load').onclick=()=>{if(loadEngine()){notice('Engine save loaded');coreUI?.render();renderTerrain();renderMachines();status();operations?.render();migration?.render();shell?.updateMenu();shell?.refreshCatalog();shell?.syncMaterials()}else notice('No engine save found')};
 $('new').onclick=()=>{if(!confirm('Replace the Phaser autosave with a new random planet?'))return;newWorld()};
 refreshButtons();
}
function setZoom(mult){if(!scene)return;targetZoom=Phaser.Math.Clamp(targetZoom*mult,.65,4.5);status()}
function clampCamera(){if(!scene)return;const c=scene.cameras.main,visW=c.width/c.zoom,visH=c.height/c.zoom;if(visW>=WIDTH)c.centerOn(WIDTH/2,c.midPoint.y);if(visH>=HEIGHT)c.centerOn(c.midPoint.x,HEIGHT/2);c.setScroll(Phaser.Math.Clamp(c.scrollX,0,Math.max(0,WIDTH-visW)),Phaser.Math.Clamp(c.scrollY,0,Math.max(0,HEIGHT-visH)))}
function saveEngine(silent=false){try{if(!silent)sound.play('save');localStorage.setItem(KEY,JSON.stringify({grid:Array.from(world.grid),seed:world.seed,factory:factory.serialize(),environment:dynamics.snapshot(),living:living.snapshot(),intelligence:intelligence.snapshot(),autonomy:autonomy.snapshot(),player:player.snapshot(),savedAt:Date.now()}));if(!silent)notice('Factory saved');return true}catch(e){notice('Save failed: '+e.message);return false}}
function newWorld(seed){const creative=factory.creative,weather=factory.weather;world.generate(seed);factory.load({creative,weather});dynamics.reset();living.reset();intelligence.reset();autonomy.reset();player.spawn();core.reset();world.dirty=true;saveEngine(true);renderTerrain();renderMachines();status();operations?.render();migration?.render();coreUI?.render();shell?.refreshCatalog();shell?.updateMenu();notice('New planet ready · Seed '+world.seed)}
function travel(x,y){if(!scene)return;scene.cameras.main.centerOn(x*SCALE,y*SCALE);clampCamera();status()}
function loadEngine(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||!world.import(s.grid))return false;world.seed=s.seed||0;factory.load(s.factory||{});dynamics.restore(s.environment);living.restore(s.living);intelligence.restore(s.intelligence);autonomy.restore(s.autonomy);player.restore(s.player);core.reset();return true}catch(e){return false}}
function renderTerrain(time=worldTime){paintTerrain(texture,world,time,!batterySaver)}
function drawMiniMap(force=false){
 if(!miniOpen||!scene||!texture||(!force&&worldTime-lastMini<800))return;lastMini=worldTime;
 const el=$('miniMap'),ctx=el.getContext('2d',{alpha:false});if(!ctx)return;
 ctx.clearRect(0,0,W,H);ctx.drawImage(texture.getSourceImage(),0,0,W,H);
 ctx.fillStyle='#f2fff6';for(const m of factory.machines)ctx.fillRect(m.x-1,m.y-1,3,3);
 ctx.fillStyle='#f9c179';ctx.fillRect(Math.round(player.x)-1,Math.round(player.y)-1,3,3);
 const camera=scene.cameras.main,left=Math.max(0,camera.scrollX/SCALE),top=Math.max(0,camera.scrollY/SCALE),ww=Math.min(W,camera.width/camera.zoom/SCALE),hh=Math.min(H,camera.height/camera.zoom/SCALE);
 ctx.strokeStyle='#8ef4cf';ctx.lineWidth=1.4;ctx.strokeRect(left+.5,top+.5,ww,hh);
}
function renderMachines(time=0){drawMachines(buildGraphics,factory,time)}
function renderEffects(time){drawAtmosphere(fxGraphics,world,time,showEffects,showGrid,scene?.cameras.main.zoom||1,factory.weather?living.weather:[]);if(ambienceGraphics)ambienceGraphics.clear()}
function worldPoint(pointer){const p=scene.cameras.main.getWorldPoint(pointer.x,pointer.y);return{x:Math.floor(p.x/SCALE),y:Math.floor(p.y/SCALE)}}
function interact(pointer,first){
 const p=worldPoint(pointer);hoverCell=p;if(!valid(p.x,p.y))return;
 if(mode==='pan'){if(lastPointer){const c=scene.cameras.main;c.scrollX-=(pointer.x-lastPointer.x)/c.zoom;c.scrollY-=(pointer.y-lastPointer.y)/c.zoom;clampCamera()}lastPointer={x:pointer.x,y:pointer.y};return}
 if(mode==='walk'){if(first){player.walkTo(p.x);sound.play('select')}return}
 if(mode==='inspect'){if(!first)return;sound.play('inspect');const m=factory.machineAt(p.x,p.y);operations?.inspect(m);if(m){coreUI?.hide();shell?.openSheet('industry',true)}notice(m?(CATALOG[m.kind]?.title||m.kind)+' · '+(m.lastAction||'Ready')+' · Health '+(m.integrity??100)+'%':world.region(p.x).title+' · material '+world.at(p.x,p.y));return}
 if(mode==='build'){if(!first)return;const result=factory.place(building,p.x,p.y);sound.play(result?'error':['generator','solar','wind','battery'].includes(building)?'power':['drill','deepdrill','oilrig','excavator'].includes(building)?'drill':'build');notice(result||'Built '+(CATALOG[building]?.title||building));renderMachines();status();operations?.render();return}
 if(mode==='paint'){if(!factory.creative&&material!==-1){if(first){notice('Career Mode cannot spawn material. Select Excavate instead.');sound.play('error')}return}if(material===-1){sound.play('dig');const n=factory.dig(p.x,p.y,brush);if(first)notice('Excavated '+n+' terrain cells')}else{sound.play(material===T.WATER?'water':material===T.LAVA?'lava':material===T.STEAM?'steam':'paint');world.paint(p.x,p.y,material,brush)}}
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
   previewGraphics=this.add.graphics().setDepth(9);
   ambienceGraphics=this.add.graphics().setDepth(2);
   fxGraphics=this.add.graphics().setDepth(6);
   playerGraphics=this.add.graphics().setDepth(8);
   playerGraphics.setVisible(true);
   this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setZoom(targetZoom).centerOn(240,350);
   this.scale.on('resize',()=>{clampCamera();status()});
   let pinch=0,pinchCenter=null;
   this.keys=this.input.keyboard?.addKeys('W,A,D,UP,LEFT,RIGHT,SPACE');
   this.input.on('pointerdown',p=>{
    sound.unlock();
    const a=this.input.pointer1,b=this.input.pointer2;
    if(a.isDown&&b.isDown){touchGesture=true;pinch=0;pinchCenter=null;pressStart=null;lastPointer=null;hoverCell=null;previewGraphics?.clear();return}
    touchGesture=false;pressStart={x:p.x,y:p.y};drag=mode==='pan'||mode==='paint';lastPointer={x:p.x,y:p.y};
    if(mode==='paint')interact(p,true);
   });
   this.input.on('pointermove',p=>{
    const a=this.input.pointer1,b=this.input.pointer2;
    if(a.isDown&&b.isDown){
     const d=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
     const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
     if(pinch>0&&d>4)targetZoom=Phaser.Math.Clamp(targetZoom*d/pinch,.65,4.5);
     if(pinchCenter){const cam=this.cameras.main;cam.scrollX-=(center.x-pinchCenter.x)/cam.zoom;cam.scrollY-=(center.y-pinchCenter.y)/cam.zoom;clampCamera()}
     pinch=d;pinchCenter=center;touchGesture=true;pressStart=null;drag=false;hoverCell=null;return;
    }
    pinch=0;pinchCenter=null;
    if(p.isDown&&pressStart&&Math.hypot(p.x-pressStart.x,p.y-pressStart.y)>13&&mode!=='pan'&&mode!=='paint'){
     // Dragging moves the camera even when a machine or inspection tool is selected.
     const cam=this.cameras.main;cam.scrollX-=(p.x-lastPointer.x)/cam.zoom;cam.scrollY-=(p.y-lastPointer.y)/cam.zoom;clampCamera();touchGesture=true;lastPointer={x:p.x,y:p.y};hoverCell=null;return;
    }
    hoverCell=worldPoint(p);
    if(p.isDown&&mode==='pan'){interact(p,false)}
    else if(p.isDown&&mode==='paint'&&!touchGesture)interact(p,false);
   });
   this.input.on('pointerup',p=>{
    if(!touchGesture&&pressStart&&mode!=='pan'&&mode!=='paint'&&Math.hypot(p.x-pressStart.x,p.y-pressStart.y)<13)interact(p,true);
    if(!this.input.pointer1.isDown&&!this.input.pointer2.isDown){touchGesture=false;pinch=0;pinchCenter=null}
    drag=false;pressStart=null;lastPointer=null;hoverCell=null;
   });
   this.input.on('gameout',()=>{drag=false;pressStart=null;touchGesture=false;lastPointer=null;hoverCell=null;previewGraphics?.clear()});
   this.input.on('wheel',(_pointer,_objects,_dx,dy)=>{setZoom(dy>0?.9:1.1)});


   this.input.addPointer(2);
   renderTerrain();renderMachines();player.draw(playerGraphics,0);status();
   $('loading').classList.add('hide');
   $('engine').textContent='Phaser '+Phaser.VERSION+' · '+(this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas');
   notice('Phaser scene ready. Select a material or machine, then tap the world.');
  }
  update(time,delta){
   worldTime=time;
   const frameStart=performanceNow();let simCost=0,renderCost=0;
   const camera=this.cameras.main;
   if(Math.abs(camera.zoom-targetZoom)>.003){camera.setZoom(Phaser.Math.Linear(camera.zoom,targetZoom,Math.min(1,delta*.012)));clampCamera()}
   const previewKey=hoverCell&&mode!=='pan'?[mode,hoverCell.x,hoverCell.y,brush,material,building,factory.credits,factory.machines.length].join(':'):'';
   if(previewKey!==lastPreviewKey){
    lastPreviewKey=previewKey;
    if(previewKey){
     previewReason=drawPlacement(previewGraphics,{mode,cell:hoverCell,brush,material,building,factory,world});
     const label=$('previewHint');label.hidden=false;
     const message=mode==='build'?(previewReason?'BLOCKED · '+previewReason:'READY · '+(CATALOG[building]?.title||building)+' · $'+PRICES[building]):mode==='inspect'?'INSPECT · Tap a machine':'DRAW · '+(materialNames.find(m=>m[1]===material)?.[0]||'Terrain')+' · Brush '+brush;
     if(message!==lastPreviewText){label.textContent=message;lastPreviewText=message}
    }else{previewGraphics?.clear();$('previewHint').hidden=true}
   }
   if(paused)return;
   const keyLeft=this.keys?.A?.isDown||this.keys?.LEFT?.isDown,keyRight=this.keys?.D?.isDown||this.keys?.RIGHT?.isDown;
   player.setInput(mode==='walk'?(joyAxis+(keyRight?1:0)-(keyLeft?1:0)):0,false);
   if(mode==='walk'&&(this.keys?.W?.isDown||this.keys?.UP?.isDown||this.keys?.SPACE?.isDown)&&player.grounded){player.jump();sound.play('jump')}
   const wasGrounded=player.grounded,oldHealth=player.health;player.step(delta);if(!wasGrounded&&player.grounded)sound.play('land');if(player.health<oldHealth&&time-lastHazardSound>3200){sound.play('warning');lastHazardSound=time}
   if(mode==='walk'&&player.moving&&time-lastFootstep>320){lastFootstep=time;sound.play('footstep')}
   if(player.follow){camera.centerOn(Phaser.Math.Linear(camera.midPoint.x,player.x*SCALE,.12),Phaser.Math.Linear(camera.midPoint.y,player.y*SCALE-40,.12));clampCamera()}
   if(time-lastPlayerDraw>45){player.draw(playerGraphics,time);lastPlayerDraw=time}
   acc=Math.min(acc+Math.min(delta,100),200);
   const cfg=perfController.config(batterySaver),step=cfg.simStep;let count=0;
   const simStart=performanceNow();while(acc>=step&&count<cfg.steps&&performanceNow()-simStart<12){acc-=step;count++;for(let s=0;s<speed;s++){world.simulate();dynamics.step();if(++ops%6===0){const actions=autonomy.actions;autonomy.step();if(autonomy.actions>actions)sound.play('automation');factory.operate();living.step();intelligence.step();core.observe();core.refresh();if(factory.pendingEvents.length){const msg=factory.pendingEvents.shift();notice(msg);if(/damage|lost|overheat|warning|failure/i.test(msg))sound.play('warning')}}if(performanceNow()-simStart>12)break}}simCost=performanceNow()-simStart;
   const renderStart=performanceNow();if(time-lastFrame>65){if(world.dirty&&time-lastTerrainAt>cfg.terrainMs){renderTerrain(time);lastTerrainAt=time}if(time-lastMachinesAt>cfg.machineMs){renderMachines(time);lastMachinesAt=time}if(time-lastEffectsAt>cfg.fxMs){renderEffects(time);lastEffectsAt=time}if(time-lastHud>cfg.hudMs){status();if(coreUI?.open&&time-lastCoreRender>4300){coreUI.render();lastCoreRender=time}lastHud=time}drawMiniMap();sound.step({weather:living.getWeather(player.x),machines:factory.machines.length,nearbyKinds:factory.machines.filter(m=>Math.abs(m.x-player.x)<28&&Math.abs(m.y-player.y)<28&&!m.autoHold&&!m.safetyHold).map(m=>m.kind),moving:player.moving,hot:dynamics.heatPeak>150,now:time});lastFrame=time}renderCost=performanceNow()-renderStart;perfController.report(performanceNow()-frameStart,simCost,renderCost,time);
   if(time-autoSaveTime>90000){autoSaveTime=time;if('requestIdleCallback' in window)window.requestIdleCallback(()=>saveEngine(true),{timeout:10000});else saveEngine(true)}
   frameCount++;if(time-perfTime>3000){const fps=Math.round(frameCount*1000/Math.max(1,time-perfTime));const el=$('fps');if(el)el.textContent=fps+' FPS';const d=$('perfDetail'),stats=perfController.stats;if(d)d.textContent=perfController.name+' · '+stats.work.toFixed(1)+' ms/frame · Physics '+stats.simulation.toFixed(1)+' ms · Graphics '+stats.graphics.toFixed(1)+' ms';frameCount=0;perfTime=time}
  }
 }
 try{game=new Phaser.Game({type:Phaser.AUTO,parent:'viewport',width:WIDTH,height:HEIGHT,backgroundColor:'#08121d',pixelArt:true,roundPixels:true,antialias:false,render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.NO_CENTER,width:window.innerWidth,height:window.innerHeight},input:{activePointers:3},scene:[FactoryScene],audio:{noAudio:true},banner:false})}
 catch(e){$('loading').textContent='Phaser startup failed';$('error').textContent=e.message}
}
document.addEventListener('pointerdown',e=>{if(e.target.closest('button')){sound.unlock();sound.play('click')}},{passive:true});
makeTools();if(!loadEngine()){world.generate();player.spawn()}refreshButtons();
operations=createOperations(factory,{notice,save:()=>saveEngine(true),status});
coreUI=createCoreUI({core,living,intelligence,autonomy,factory,notice,save:()=>saveEngine(true),sound});
migration=createMigration({world,factory,dynamics,living,intelligence,autonomy,player,core,save:()=>saveEngine(true),refresh:()=>{renderTerrain();renderMachines();status();operations?.render();shell?.refreshCatalog();shell?.updateMenu();coreUI?.render()},notice,travel:i=>travel(i*60+30,90)});
shell=createGameShell({world,factory,dynamics,operations,migration,notice,onTravel:travel,onNewWorld:newWorld,onPause:p=>{paused=!!p;acc=0;refreshButtons()},onSave:saveEngine,onBrush:n=>{brush=n},onCreativeChange:creative=>{if(!creative){material=-1;if(mode==='paint')notice('Career Mode: excavation only')}refreshButtons()}});
shell.setMenu(true);startPhaser();
window.addEventListener('pagehide',()=>{if(scene)saveEngine(true)});
