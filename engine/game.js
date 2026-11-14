import {decodeFactorySave} from './save-transfer.js?v=0350';
import {createEngineerSprite} from './engineer-sprite.js?v=0280';
import {createIndustrialSprites} from './sprites.js?v=0340';
import {createStructures} from './structures.js?v=0250';
import {createHybrid} from './hybrid.js?v=0280';
import {Autonomy} from './autonomy.js?v=0233';
import {createPlayer} from './player.js?v=0290';
import {LivingWorld} from './living.js?v=0231';
import {Intelligence} from './intelligence.js?v=0233';
import {createCore} from './core.js?v=0233';
import {createCoreUI} from './core-ui.js?v=0330';
import {createPerformance} from './performance.js?v=0290';
import {createSound} from './sound.js?v=0231';
import {paintTerrain,drawMachines,drawAtmosphere,drawPlacement,drawMachineRoute} from './visuals.js?v=0310';
import {createGameShell} from './shell.js?v=0320';
import {createMigration} from './migration.js?v=0250';
import {Dynamics} from './dynamics.js?v=0120';
import {createOperations} from './operations.js?v=0330';
import {World,W,H,T,COLORS,REGIONS} from '../js/world.js?v=0242';
import {Factory,PRICES,DEMAND,ROTATABLE_MACHINES,COLORS as MACHINE_COLORS} from '../js/factory.js?v=0330';
import {CATALOG,unlocked,unlockHint} from '../js/catalog.js?v=080-frontiers-final';

// Phaser owns the game scene, graphics texture, camera, pointer input and update loop.
// INDUSTRIUM's deterministic cellular physics and factory rules are kept as game systems.
// Engine saves use a separate key so the stable release is never overwritten.
const $=id=>document.getElementById(id),KEY='industrium-phaser-engine-v1';
const world=new World(),factory=new Factory(world),dynamics=new Dynamics(world,factory),sound=createSound(),perfController=createPerformance(window.matchMedia('(pointer: coarse)').matches);
const living=new LivingWorld(world,factory,dynamics),intelligence=new Intelligence(world,factory,dynamics,living),autonomy=new Autonomy(factory,intelligence),player=createPlayer(world),core=createCore(factory,dynamics,living,intelligence),hybrid=createHybrid(world,factory,dynamics),structures=createStructures(world,factory);
let coreUI,lastCoreRender=0,playerGraphics,lastPlayerDraw=0,lastFootstep=0,lastHazardSound=0,joyAxis=0,joyPointer=null,joyJumpLatched=false;
try{perfController.setMode(localStorage.getItem('industrium-performance')||'auto')}catch(e){}
try{world.chunked=localStorage.getItem('industrium-chunks')!=='off'}catch(e){}
try{structures.enabled=localStorage.getItem('industrium-structures')!=='off'}catch(e){}
try{spriteMode=localStorage.getItem('industrium-sprites')!=='off'}catch(e){}
try{hybrid.enabled=localStorage.getItem('industrium-hybrid')!=='off';hybrid.detail=localStorage.getItem('industrium-hybrid-detail')||'auto'}catch(e){}
try{sound.setEnabled(localStorage.getItem('industrium-sound')!=='off');sound.setVolume(Number(localStorage.getItem('industrium-volume')??35)/100);sound.setAmbience(localStorage.getItem('industrium-ambience')!=='off')}catch(e){}
const WIDTH=960,HEIGHT=640,SCALE=4;
let lastRouteKey='',lastPreviewKey='',lastPreviewText='',lastTerrainAt=0,lastMachinesAt=0,lastEffectsAt=0,hoverCell=null,targetZoom=1.4,worldTime=0,previewReason=null,previewGraphics,ambienceGraphics,miniOpen=false,lastMini=0,lastHud=0,previousUpdate=0;let engineerSprite=null,industrialSprites=null,spriteMode=true,shell,migration,operations,hybridGraphics,structureGraphics,fxGraphics,fxClock=0,frameCount=0,perfTime=0,autoSaveTime=0,showEffects=true,showGrid=false,batterySaver=false;let game,scene,texture,terrain,buildGraphics,overlayGraphics,mode='pan',material=-1,building='drill',brush=3,paused=false,speed=1,buildCell=null,buildDirection=0,lastFrame=0,acc=0,ops=0;
let noticeTimer;
const notice=s=>{
 const el=$('notice');
 if(el.textContent!==s)el.textContent=s;
 el.hidden=false;clearTimeout(noticeTimer);
 noticeTimer=setTimeout(()=>{el.hidden=true},3400);
};
const materialNames=[['Sand',T.SAND],['Water',T.WATER],['Stone',T.STONE],['Ore',T.ORE],['Fire',T.FIRE],['Metal',T.METAL],['Steam',T.STEAM],['Wet Sand',T.WET_SAND],['Gold',T.GOLD],['Residue',T.RESIDUE],['Ash',T.BURNT_RESIDUE],['Ice',T.ICE],['Lava',T.LAVA],['Glass',T.GLASS],['Sandsoil',T.SANDSOIL],['Silt',T.SILT],['Oil',T.OIL],['Crystal',T.CRYSTAL],['Basalt',T.BASALT],['Acid',T.ACID],['Vapour',T.VAPOUR],['Snow',T.SNOW],['Artefact',T.ARTIFACT],['Obsidian',T.OBSIDIAN],['Fuel',T.FUEL],['Erase',T.AIR],['Dig',-1]];
const restrictedMaterials=new Set([T.ORE,T.GOLD,T.WET_SAND,T.RESIDUE,T.BURNT_RESIDUE,T.OIL,T.CRYSTAL,T.FUEL,T.ARTIFACT]);
const buildNames=['generator','drill','collector','furnace','solar','wind','storage','belt','pump','mixer','sifter','oilrig','distiller','combustor','battery','crystaldrill','surveyor','stabilizer','crusher','warehouse','deepdrill','refinery','hopper','kiln','press','filter','cooler','excavator','condenser','waterwheel'];
const performanceNow=()=>performance.now();
const valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function status(){
 const p=factory.power(),c=scene?.cameras.main,x=c?Math.max(0,Math.min(W-1,Math.floor(c.midPoint.x/SCALE))):0;
 const region=world.region(x);if(!factory.regionVisits.includes(region.id)){factory.regionVisits.push(region.id);const r=living.regions[Math.floor(x/60)];if(r)r.visits++;living.record('Expedition reached '+region.title,region.id)}
 $('power').textContent='Power '+p.production+' / '+p.use;
 $('credits').textContent='Credits $'+Math.floor(factory.credits);
 $('machines').textContent=factory.machines.length+' machines';
 $('heat').textContent='Heat '+dynamics.heatPeak;
 $('pollution').textContent='Pollution '+dynamics.pollutionPeak;
 $('worldBiome').textContent=region.title.toUpperCase()+' · '+living.getWeather(x).toUpperCase();$('worldCoords').textContent=x+', '+(c?Math.max(0,Math.min(H-1,Math.floor(c.midPoint.y/SCALE))):0);
 $('power').classList.toggle('warning',p.production<p.use);
 $('worldTime').textContent='CYCLE '+Math.max(1,Math.floor(world.tick/900)+1);
 $('playerTitle').textContent=player.style.toUpperCase()+' 01';$('playerStatus').textContent='HP '+Math.round(player.health)+' · Energy '+Math.round(player.stamina);
 updateMachineInspector();
 operations?.updateOverview();
}
function updateMachineInspector(){
 const visible=!$('gameSheet').hidden&&!$('operationsBody').hidden&&!$('tabInspector').closest('[data-section]').hidden&&$('tabInspector').classList.contains('active');
 const m=(mode==='inspect'||visible)?operations?.selection():null;
 const info=m?factory.diagnose(m):null,route=info?.route;
 if(visible)operations?.updateInspector(info);
 const key=m?[m.x,m.y,route?.x,route?.y,info.condition==='Output blocked'].join(':'):'';
 if(overlayGraphics&&key!==lastRouteKey){lastRouteKey=key;drawMachineRoute(overlayGraphics,m,route,info?.condition)}
}
function refreshButtons(){
 if(mode!=='build')buildCell=null;
 if(mode!=='pan'&&miniOpen){miniOpen=false;$('miniMapPanel').hidden=true;$('mapToggle').setAttribute('aria-expanded','false')}
 refreshBuildControls();
 for(const b of document.querySelectorAll('[data-material]'))b.classList.toggle('active',mode==='paint'&&material===Number(b.dataset.material));
 for(const b of document.querySelectorAll('[data-machine]'))b.classList.toggle('active',mode==='build'&&building===b.dataset.machine);
 for(const id of ['pan','walk','inspect']){
  $(id).classList.toggle('active',mode===id);
  $(id).setAttribute('aria-pressed',String(mode===id));
 }
 $('paint').classList.toggle('active',mode==='paint'&&material===-1);
 document.querySelector('[data-pane="build"]').classList.toggle('toolActive',mode==='build');
 document.querySelector('[data-pane="terrain"]').classList.toggle('toolActive',mode==='paint');
 $('playerHud').hidden=mode!=='walk';
 $('cameraRail').hidden=mode!=='pan';
 $('terrainHint').hidden=factory.creative;
 $('playerStyle').value=player.style;$('touchControls').hidden=mode!=='walk';$('followPlayer').textContent=player.follow?'Follow On':'Follow Off';$('followPlayer').classList.toggle('active',player.follow);
 $('pause').textContent=paused?'Resume':'Pause';
 $('pause').setAttribute('aria-pressed',String(paused));
 $('speed').textContent=speed+'× speed';$('toolName').textContent=(mode==='build'?(CATALOG[building]?.title||building):mode==='paint'?(material===-1?'Excavate':materialNames.find(m=>m[1]===material)?.[0]||'Terrain'):mode==='inspect'?'Inspector':mode==='walk'?'Engineer':'Camera');
}
function makeTools(){
 const mat=$('materials'),machines=$('factoryTools');
 for(const [name,id] of materialNames){if(id===-1)continue;const b=document.createElement('button');b.textContent=name;b.dataset.material=id;b.dataset.restricted=restrictedMaterials.has(id)?'1':'0';if(id>=0&&COLORS[id]){const color=COLORS[id];b.style.borderLeft='4px solid rgb('+color.join(',')+')'}b.onclick=()=>{if(!factory.creative&&id!==-1){notice('Career Mode: free material spawning is locked. Use Excavate or switch to Creative.');sound.play('error');return}material=id;mode='paint';refreshButtons();sound.play('select');notice(name+' tool selected')};mat.append(b)}
 for(const kind of buildNames){const b=document.createElement('button');const title=document.createElement('strong'),price=document.createElement('small');title.textContent=CATALOG[kind]?.title||kind;price.textContent='$'+PRICES[kind];b.append(title,price);b.dataset.machine=kind;b.onclick=()=>{if(!unlocked(kind,factory)){notice((CATALOG[kind]?.title||kind)+' locked: '+unlockHint(kind));shell?.refreshCatalog();return}building=kind;buildCell=null;buildDirection=0;mode='build';refreshButtons();sound.play('select');notice('Touch the world to preview '+(CATALOG[kind]?.title||kind))};machines.append(b)}
 for(const id of ['paint','pan','walk','inspect'])$(id).onclick=()=>{shell?.closeSheet();if(id==='paint')material=-1;player.follow=id==='walk';hoverCell=null;mode=id;sound.play('select');refreshButtons();notice(id==='pan'?'Drag to pan · Pinch to zoom':id==='walk'?'Use the joystick or tap to walk':id==='inspect'?'Tap a machine to inspect it':'Drag over terrain to excavate')};
 $('buildConfirm').onclick=()=>{if(mode==='build'&&buildCell)placeBuilding(buildCell)};
 $('buildRotate').onclick=()=>{buildDirection=(buildDirection+1)%4;refreshBuildControls()};
 $('buildCancel').onclick=()=>{buildCell=null;hoverCell=null;refreshBuildControls()};
 $('pause').onclick=()=>{paused=!paused;sound.play(paused?'pause':'resume');refreshButtons()};
 $('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;sound.play('click');refreshButtons()};
 $('effects').onclick=()=>{showEffects=!showEffects;$('effects').classList.toggle('active',showEffects);$('effects').textContent='Effects '+(showEffects?'On':'Off');if(!showEffects){fxGraphics?.clear();hybridGraphics?.clear();structureGraphics?.clear()}};
 $('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('active',showGrid);$('grid').textContent='Grid '+(showGrid?'On':'Off')};
 $('soundToggle').textContent=sound.enabled?'Sound On':'Sound Off';$('soundToggle').classList.toggle('active',sound.enabled);$('soundVolume').value=Math.round(sound.volume*100);
 $('soundToggle').onclick=()=>{sound.setEnabled(!sound.enabled);$('soundToggle').textContent=sound.enabled?'Sound On':'Sound Off';$('soundToggle').classList.toggle('active',sound.enabled);try{localStorage.setItem('industrium-sound',sound.enabled?'on':'off')}catch(e){}if(sound.enabled)sound.play('select')};
 $('playerStyle').onchange=e=>{player.style=e.target.value;sound.play('select');saveEngine(true);refreshButtons()};
 $('soundAmbience').textContent=sound.ambience?'Ambience On':'Ambience Off';$('soundAmbience').classList.toggle('active',sound.ambience);
 $('soundAmbience').onclick=()=>{sound.setAmbience(!sound.ambience);$('soundAmbience').textContent=sound.ambience?'Ambience On':'Ambience Off';$('soundAmbience').classList.toggle('active',sound.ambience);try{localStorage.setItem('industrium-ambience',sound.ambience?'on':'off')}catch(e){}};
 $('soundVolume').oninput=e=>{sound.setVolume(Number(e.target.value)/100);try{localStorage.setItem('industrium-volume',e.target.value)}catch(e){}};
 $('performanceMode').value=perfController.mode;
 $('performanceMode').onchange=e=>{perfController.setMode(e.target.value);try{localStorage.setItem('industrium-performance',perfController.mode)}catch(err){}notice('Performance profile: '+perfController.mode)};
 $('chunkToggle').textContent=world.chunked?'Chunks On':'Chunks Off';$('chunkToggle').classList.toggle('active',world.chunked);
 $('chunkToggle').onclick=()=>{world.chunked=!world.chunked;world.chunkEpoch=-1;$('chunkToggle').textContent=world.chunked?'Chunks On':'Chunks Off';$('chunkToggle').classList.toggle('active',world.chunked);try{localStorage.setItem('industrium-chunks',world.chunked?'on':'off')}catch(e){}notice('Chunk acceleration '+(world.chunked?'enabled':'disabled'))};
 $('spriteToggle').textContent=spriteMode?'Sprites On':'Sprites Off';$('spriteToggle').classList.toggle('active',spriteMode);
 $('spriteToggle').onclick=()=>{spriteMode=!spriteMode;$('spriteToggle').textContent=spriteMode?'Sprites On':'Sprites Off';$('spriteToggle').classList.toggle('active',spriteMode);buildGraphics?.setVisible(!spriteMode);if(!spriteMode)industrialSprites?.destroy();else renderMachines(worldTime);try{localStorage.setItem('industrium-sprites',spriteMode?'on':'off')}catch(e){}notice('Animated machine sprites '+(spriteMode?'enabled':'disabled'))};
 $('structureToggle').textContent=structures.enabled?'Structures On':'Structures Off';$('structureToggle').classList.toggle('active',structures.enabled);
 $('structureToggle').onclick=()=>{structures.enabled=!structures.enabled;$('structureToggle').textContent=structures.enabled?'Structures On':'Structures Off';$('structureToggle').classList.toggle('active',structures.enabled);if(!structures.enabled)structureGraphics?.clear();try{localStorage.setItem('industrium-structures',structures.enabled?'on':'off')}catch(e){}notice('Structural physics '+(structures.enabled?'enabled':'disabled'))};
 $('hybridToggle').textContent=hybrid.enabled?'Hybrid On':'Hybrid Off';$('hybridToggle').classList.toggle('active',hybrid.enabled);
 $('hybridToggle').onclick=()=>{hybrid.enabled=!hybrid.enabled;$('hybridToggle').textContent=hybrid.enabled?'Hybrid On':'Hybrid Off';$('hybridToggle').classList.toggle('active',hybrid.enabled);if(!hybrid.enabled)hybridGraphics?.clear();try{localStorage.setItem('industrium-hybrid',hybrid.enabled?'on':'off')}catch(e){}notice('Hybrid rendering and microphysics '+(hybrid.enabled?'enabled':'disabled'))};
 $('hybridDetail').value=hybrid.detail;
 $('hybridDetail').onchange=e=>{hybrid.detail=e.target.value;try{localStorage.setItem('industrium-hybrid-detail',hybrid.detail)}catch(err){}notice('Hybrid detail: '+hybrid.detail)};
 $('batterySaver').onclick=()=>{batterySaver=!batterySaver;$('batterySaver').classList.toggle('active',batterySaver);$('batterySaver').textContent='Saver '+(batterySaver?'On':'Off');notice('Battery saver '+(batterySaver?'enabled: reduced render and simulation frequency':'disabled'))};
 $('environment').onclick=()=>{dynamics.active=!dynamics.active;$('environment').textContent='Dynamics '+(dynamics.active?'On':'Off');$('environment').classList.toggle('active',dynamics.active);notice('Environmental simulation '+(dynamics.active?'enabled':'paused'))};
 $('home').onclick=()=>{if(!scene)return;scene.cameras.main.centerOn(480,350);clampCamera();status()};
 $('followPlayer').onclick=()=>{player.follow=!player.follow;refreshButtons();sound.play('select');notice(player.follow?'Camera follows engineer':'Free camera enabled')};
 const requestJump=()=>{if(mode==='walk'&&!paused)player.jump()};
 $('jumpBtn').onpointerdown=e=>{e.preventDefault();requestJump()};
 $('jumpBtn').onclick=e=>{if(e.detail===0)requestJump()};
 const pad=$('joyPad'),knob=$('joyKnob');
 const moveJoy=e=>{const r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),radius=r.width*.38;joyAxis=Math.max(-1,Math.min(1,dx/radius));knob.style.transform='translate('+Math.round(Math.max(-radius,Math.min(radius,dx)))+'px,'+Math.round(Math.max(-radius,Math.min(radius,dy)))+'px)';if(dy<-radius*.6&&!joyJumpLatched){joyJumpLatched=true;requestJump()}if(dy>-radius*.25)joyJumpLatched=false};
 pad.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;pad.setPointerCapture(e.pointerId);moveJoy(e)});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){e.preventDefault();moveJoy(e)}});
 const releaseJoy=e=>{if(e.pointerId===joyPointer){joyPointer=null;joyAxis=0;joyJumpLatched=false;knob.style.transform='translate(0,0)'}};
 pad.addEventListener('pointerup',releaseJoy);pad.addEventListener('pointercancel',releaseJoy);pad.addEventListener('lostpointercapture',releaseJoy);
 $('mapToggle').onclick=()=>{miniOpen=!miniOpen;$('miniMapPanel').hidden=!miniOpen;$('mapToggle').setAttribute('aria-expanded',String(miniOpen));if(miniOpen)drawMiniMap(true)};
 $('miniMapClose').onclick=()=>{miniOpen=false;$('miniMapPanel').hidden=true;$('mapToggle').setAttribute('aria-expanded','false')};
 $('miniMap').onclick=e=>{if(!scene)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.max(0,Math.min(W-1,Math.floor((e.clientX-r.left)/r.width*W))),y=Math.max(0,Math.min(H-1,Math.floor((e.clientY-r.top)/r.height*H)));travel(x,y);notice('Camera moved to '+world.region(x).title)};
 $('zoomIn').onclick=()=>{sound.play('zoom');setZoom(1.25)};
 $('zoomOut').onclick=()=>{sound.play('zoom');setZoom(.8)};
 $('save').onclick=()=>saveEngine();
 const code=$('factorySaveCode');
 const showTransfer=importing=>{
  $('factoryTransfer').hidden=false;
  $('copyFactory').hidden=importing;
  $('importFactory').hidden=!importing;
  code.readOnly=!importing;
  code.value=importing?'':localStorage.getItem(KEY);
  code.focus();
  if(!importing)code.select();
 };
 $('exportFactory').onclick=()=>{if(saveEngine(true))showTransfer(false)};
 $('openImportFactory').onclick=()=>showTransfer(true);
 $('copyFactory').onclick=async()=>{
  code.focus();code.select();
  try{await navigator.clipboard.writeText(code.value);notice('Save code copied')}
  catch{notice('Save code selected. Long press the selection and tap Copy.')}
 };
 $('importFactory').onclick=()=>{
  let data;
  try{data=decodeFactorySave(code.value,W*H,Object.keys(T).length)}catch{notice('That save code is invalid or incomplete');return}
  if(!confirm('Replace the current factory with this save?'))return;
  if(!saveEngine(true))return;
  const previous=localStorage.getItem(KEY);
  try{
   localStorage.setItem(KEY,JSON.stringify(data));
   if(!loadEngine()){
    localStorage.setItem(KEY,previous);loadEngine();notice('Import failed. Previous factory restored.');return;
   }
   refreshLoadedFactory();$('factoryTransfer').hidden=true;code.value='';notice('Factory imported');
  }catch{notice('Could not save the imported factory')}
 };
 $('load').onclick=()=>{if(loadEngine()){refreshLoadedFactory();notice('Engine save loaded')}else notice('No engine save found')};
 $('new').onclick=()=>{if(!confirm('Replace the Phaser autosave with a new random planet?'))return;newWorld()};
 refreshButtons();
}
function refreshLoadedFactory(){
 coreUI?.render();renderTerrain();renderMachines();status();operations?.render();migration?.render();
 shell?.updateMenu();shell?.refreshCatalog();shell?.syncMaterials();
}
function setZoom(mult){if(!scene)return;targetZoom=Phaser.Math.Clamp(targetZoom*mult,.65,4.5);status()}
function clampCamera(){if(!scene)return;const c=scene.cameras.main,visW=c.width/c.zoom,visH=c.height/c.zoom;if(visW>=WIDTH)c.centerOn(WIDTH/2,c.midPoint.y);if(visH>=HEIGHT)c.centerOn(c.midPoint.x,HEIGHT/2);c.setScroll(Phaser.Math.Clamp(c.scrollX,0,Math.max(0,WIDTH-visW)),Phaser.Math.Clamp(c.scrollY,0,Math.max(0,HEIGHT-visH)))}
function saveEngine(silent=false){try{if(!silent)sound.play('save');localStorage.setItem(KEY,JSON.stringify({grid:Array.from(world.grid),seed:world.seed,factory:factory.serialize(),environment:dynamics.snapshot(),living:living.snapshot(),intelligence:intelligence.snapshot(),autonomy:autonomy.snapshot(),player:player.snapshot(),structures:structures.snapshot(),savedAt:Date.now()}));if(!silent)notice('Factory saved');return true}catch(e){notice('Save failed: '+e.message);return false}}
function newWorld(seed){buildCell=null;refreshBuildControls();const creative=factory.creative,weather=factory.weather;world.generate(seed);factory.load({creative,weather});operations?.resetOverview();dynamics.reset();living.reset();intelligence.reset();autonomy.reset();player.spawn();core.reset();hybrid.reset();structures.reset();world.dirty=true;saveEngine(true);renderTerrain();renderMachines();status();operations?.render();migration?.render();coreUI?.render();shell?.refreshCatalog();shell?.updateMenu();notice('New planet ready · Seed '+world.seed)}
function travel(x,y){if(!scene)return;scene.cameras.main.centerOn(x*SCALE,y*SCALE);clampCamera();status()}
function loadEngine(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||!world.import(s.grid))return false;buildCell=null;refreshBuildControls();world.seed=s.seed||0;factory.load(s.factory||{});operations?.resetOverview();dynamics.restore(s.environment);living.restore(s.living);intelligence.restore(s.intelligence);autonomy.restore(s.autonomy);player.restore(s.player);core.reset();hybrid.reset();structures.restore(s.structures);return true}catch(e){return false}}
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
function renderMachines(time=0){if(spriteMode&&industrialSprites){buildGraphics?.setVisible(false);industrialSprites.draw(time,scene?.cameras.main,perfController.name);return}buildGraphics?.setVisible(true);const cam=scene?.cameras.main,view=cam?{left:cam.scrollX/SCALE,top:cam.scrollY/SCALE,right:(cam.scrollX+cam.width/cam.zoom)/SCALE,bottom:(cam.scrollY+cam.height/cam.zoom)/SCALE}:null;drawMachines(buildGraphics,factory,time,view,perfController.name)}
function renderEffects(time){drawAtmosphere(fxGraphics,world,time,showEffects,showGrid,scene?.cameras.main.zoom||1,factory.weather?living.weather:[]);if(hybridGraphics){if(showEffects&&hybrid.enabled)hybrid.draw(hybridGraphics,time,hybrid.detail==='auto'?perfController.name:hybrid.detail,factory.weather?living.weather:[],scene?.cameras.main);else hybridGraphics.clear()}if(structureGraphics){if(showEffects&&structures.enabled)structures.draw(structureGraphics,scene?.cameras.main,hybrid.detail);else structureGraphics.clear()}if(ambienceGraphics)ambienceGraphics.clear()}
function worldPoint(pointer){const p=scene.cameras.main.getWorldPoint(pointer.x,pointer.y);return{x:Math.floor(p.x/SCALE),y:Math.floor(p.y/SCALE)}}
function refreshBuildControls(){
 const active=mode==='build'&&buildCell!==null;
 $('buildControls').hidden=!active;
 if(!active)return;
 const reason=factory.canPlace(building,buildCell.x,buildCell.y);
 $('buildConfirm').disabled=!!reason;
 $('buildStatus').textContent=reason||((CATALOG[building]?.title||building)+' · $'+PRICES[building]);
 $('buildRotate').hidden=!ROTATABLE_MACHINES.has(building);
 $('buildRotate').textContent='Rotate '+['→','↓','←','↑'][buildDirection];
}
function placeBuilding(p){
 const result=factory.place(building,p.x,p.y,buildDirection);
 sound.play(result?'error':['generator','solar','wind','battery'].includes(building)?'power':['drill','deepdrill','oilrig','excavator'].includes(building)?'drill':'build');
 notice(result||'Built '+(CATALOG[building]?.title||building));
 if(!result){buildCell=null;hoverCell=null;renderMachines();status();operations?.render()}
 refreshBuildControls();
}
function editTerrain(p,first){
 if(!valid(p.x,p.y))return;
 if(!factory.creative&&material!==-1){if(first){notice('Career Mode cannot spawn material. Select Excavate instead.');sound.play('error')}return}
 if(material===-1){if(first)sound.play('dig');const n=factory.dig(p.x,p.y,brush);if(first)notice('Excavated '+n+' terrain cells')}
 else{if(first)sound.play(material===T.WATER?'water':material===T.LAVA?'lava':material===T.STEAM?'steam':'paint');world.paint(p.x,p.y,material,brush)}
}
function interact(pointer){
 const p=worldPoint(pointer);if(!valid(p.x,p.y))return;
 if(mode==='walk'){player.walkTo(p.x);sound.play('select');return}
 if(mode==='inspect'){sound.play('inspect');const m=factory.machines.find(m=>m.x===p.x&&m.y===p.y)||factory.machineAt(p.x,p.y);operations?.inspect(m);if(m){coreUI?.hide();shell?.openSheet('industry',true)}updateMachineInspector();notice(m?(CATALOG[m.kind]?.title||m.kind)+' · '+(m.lastAction||'Ready')+' · Health '+(m.integrity??100)+'%':world.region(p.x).title+' · material '+world.at(p.x,p.y));return}
 if(mode==='build'){
  if(pointer.wasTouch){buildCell=p;refreshBuildControls()}
  else placeBuilding(p);
 }
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
   industrialSprites=createIndustrialSprites(this,factory);
   overlayGraphics=this.add.graphics().setDepth(10);
   previewGraphics=this.add.graphics().setDepth(9);
   ambienceGraphics=this.add.graphics().setDepth(2);
   hybridGraphics=this.add.graphics().setDepth(3);
   structureGraphics=this.add.graphics().setDepth(4);
   fxGraphics=this.add.graphics().setDepth(6);
   engineerSprite=createEngineerSprite(this,player);
   playerGraphics=engineerSprite?null:this.add.graphics().setDepth(8);
   this.cameras.main.setBounds(0,0,WIDTH,HEIGHT).setZoom(targetZoom).centerOn(240,350);
   this.scale.on('resize',()=>{clampCamera();status()});
   const touches=new Map(),stroke=new Map();
   let press=null,pinch=null,gesturing=false;
   const moveCamera=(dx,dy)=>{
    if(player.follow){player.follow=false;refreshButtons()}
    const cam=this.cameras.main;
    cam.scrollX-=dx/cam.zoom;cam.scrollY-=dy/cam.zoom;clampCamera();
   };
   const pinchSample=()=>{
    const [a,b]=touches.values();
    return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   };
   const stageTerrain=p=>{
    const cell=worldPoint(p);
    if(valid(cell.x,cell.y))stroke.set(cell.y*W+cell.x,cell);
   };
   const cancelPress=()=>{press=null;stroke.clear();hoverCell=null};
   this.keys=this.input.keyboard?.addKeys('W,A,D,UP,LEFT,RIGHT,SPACE');
   this.input.on('pointerdown',p=>{
    sound.unlock();
    if(p.wasTouch){
     touches.set(p.id,p);
     if(touches.size>=2){gesturing=true;pinch=pinchSample();cancelPress();return}
     if(gesturing)return;
    }
    press={id:p.id,mode,x:p.x,y:p.y,lastX:p.x,lastY:p.y,panning:mode==='pan'};
    if(mode==='paint'){
     if(p.wasTouch){stageTerrain(p);hoverCell=worldPoint(p)}
     else editTerrain(worldPoint(p),true);
    }
   });
   this.input.on('pointermove',p=>{
    if(touches.size>=2){
     if(!touches.has(p.id))return;
     const next=pinchSample();
     if(pinch&&pinch.distance>4&&next.distance>4){
      targetZoom=Phaser.Math.Clamp(targetZoom*next.distance/pinch.distance,.65,4.5);
      moveCamera(next.x-pinch.x,next.y-pinch.y);
     }
     pinch=next;return;
    }
    if(gesturing)return;
    if(!press||press.id!==p.id||!p.isDown){if(!p.wasTouch)hoverCell=worldPoint(p);return}
    if(press.mode!==mode){cancelPress();return}
    if(mode!=='paint'&&Math.hypot(p.x-press.x,p.y-press.y)>=13)press.panning=true;
    if(press.panning){
     moveCamera(p.x-press.lastX,p.y-press.lastY);hoverCell=null;
     press.lastX=p.x;press.lastY=p.y;return;
    }
    hoverCell=worldPoint(p);
    if(mode==='paint'){
     if(p.wasTouch)stageTerrain(p);
     else editTerrain(hoverCell,false);
    }
   });
   const finishPointer=(p,cancelled=false)=>{
    if(p.wasTouch)touches.delete(p.id);
    if(gesturing){
     if(!touches.size){gesturing=false;pinch=null}
     else if(touches.size>=2)pinch=pinchSample();
     return;
    }
    if(!press||press.id!==p.id)return;
    if(!cancelled&&press.mode===mode&&!press.panning){
     if(mode==='paint'&&p.wasTouch){
      stageTerrain(p);
      let first=true;
      for(const cell of stroke.values()){editTerrain(cell,first);first=false}
     }else if(mode!=='paint'&&Math.hypot(p.x-press.x,p.y-press.y)<13)interact(p);
    }
    cancelPress();
   };
   this.input.on('pointerup',p=>finishPointer(p,p.event?.type==='touchcancel'));
   this.input.on('pointerupoutside',p=>finishPointer(p,true));
   this.input.on('gameout',()=>{touches.clear();gesturing=false;pinch=null;cancelPress()});
   this.input.on('wheel',(_pointer,_objects,_dx,dy)=>{setZoom(dy>0?.9:1.1)});


   this.input.addPointer(2);
   renderTerrain();renderMachines();
   if(engineerSprite)engineerSprite.update(0);else player.draw(playerGraphics,0);
   status();
   $('loading').classList.add('hide');
   $('engine').textContent='Phaser '+Phaser.VERSION+' · '+(this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas');
  }
  update(time,delta){
   const elapsed=previousUpdate?time-previousUpdate:delta;
   previousUpdate=time;
   worldTime=time;
   const frameStart=performanceNow();let simCost=0,renderCost=0;
   const camera=this.cameras.main;
   if(Math.abs(camera.zoom-targetZoom)>.003){camera.setZoom(Phaser.Math.Linear(camera.zoom,targetZoom,Math.min(1,delta*.012)));clampCamera()}
   const cell=buildCell||hoverCell;
   const previewKey=cell&&['build','paint','inspect'].includes(mode)?[mode,cell.x,cell.y,brush,material,building,buildDirection,Math.floor(factory.credits),factory.machines.length].join(':'):'';
   if(previewKey!==lastPreviewKey){
    lastPreviewKey=previewKey;
    if(previewKey){
     previewReason=drawPlacement(previewGraphics,{mode,cell,brush,material,building,factory,world,direction:buildDirection});
     const label=$('previewHint');label.hidden=!!buildCell;if(buildCell)refreshBuildControls();
     const message=mode==='build'?(previewReason||'Ready · $'+PRICES[building]):mode==='inspect'?'Select a machine':'Brush '+brush;
     if(message!==lastPreviewText){label.textContent=message;lastPreviewText=message}
    }else{previewGraphics?.clear();$('previewHint').hidden=true}
   }
   if(paused)return;
   const keyLeft=this.keys?.A?.isDown||this.keys?.LEFT?.isDown,keyRight=this.keys?.D?.isDown||this.keys?.RIGHT?.isDown;
   player.setInput(mode==='walk'?(joyAxis+(keyRight?1:0)-(keyLeft?1:0)):0);
   if(mode==='walk'&&(this.keys?.W?.isDown||this.keys?.UP?.isDown||this.keys?.SPACE?.isDown)&&player.grounded)player.jump();
   const wasGrounded=player.grounded,oldHealth=player.health;if(player.step(delta))sound.play('jump');if(!wasGrounded&&player.grounded)sound.play('land');if(player.health<oldHealth&&time-lastHazardSound>3200){sound.play('warning');lastHazardSound=time}
   if(mode==='walk'&&player.moving&&time-lastFootstep>320){lastFootstep=time;sound.play('footstep')}
   if(player.follow){camera.centerOn(Phaser.Math.Linear(camera.midPoint.x,player.x*SCALE,.12),Phaser.Math.Linear(camera.midPoint.y,player.y*SCALE-40,.12));clampCamera()}
   if(time-lastPlayerDraw>45){if(engineerSprite)engineerSprite.update(time);else player.draw(playerGraphics,time);lastPlayerDraw=time}
   acc=Math.min(acc+Math.min(delta,100),200);
   const cfg=perfController.config(batterySaver),step=cfg.simStep;let count=0;
   const simStart=performanceNow();while(acc>=step&&count<cfg.steps&&performanceNow()-simStart<12){acc-=step;count++;for(let s=0;s<speed;s++){world.simulate();dynamics.step();if((ops&1)===0)hybrid.step();if(ops%3===0)structures.step();if(++ops%6===0){const actions=autonomy.actions;autonomy.step();if(autonomy.actions>actions)sound.play('automation');factory.operate();operations?.recordProduction();living.step();intelligence.step();core.observe();core.refresh();if(factory.pendingEvents.length){const msg=factory.pendingEvents.shift();notice(msg);if(/damage|lost|overheat|warning|failure/i.test(msg))sound.play('warning')}}if(performanceNow()-simStart>12)break}}simCost=performanceNow()-simStart;
   const renderStart=performanceNow();if(time-lastFrame>65){if(world.dirty&&time-lastTerrainAt>cfg.terrainMs){renderTerrain(time);lastTerrainAt=time}if(time-lastMachinesAt>cfg.machineMs){renderMachines(time);lastMachinesAt=time}if(time-lastEffectsAt>cfg.fxMs){renderEffects(time);lastEffectsAt=time}if(time-lastHud>cfg.hudMs){status();if(coreUI?.open&&time-lastCoreRender>4300){coreUI.render();lastCoreRender=time}lastHud=time}drawMiniMap();sound.step({weather:living.getWeather(player.x),machines:factory.machines.length,nearbyKinds:factory.machines.filter(m=>Math.abs(m.x-player.x)<28&&Math.abs(m.y-player.y)<28&&!m.autoHold&&!m.safetyHold).map(m=>m.kind),moving:player.moving,hot:dynamics.heatPeak>150,now:time});lastFrame=time}renderCost=performanceNow()-renderStart;perfController.report(performanceNow()-frameStart,simCost,renderCost,time,elapsed);
   if(time-autoSaveTime>90000){autoSaveTime=time;if('requestIdleCallback' in window)window.requestIdleCallback(()=>saveEngine(true),{timeout:10000});else saveEngine(true)}
   frameCount++;if(time-perfTime>3000){const fps=Math.round(frameCount*1000/Math.max(1,time-perfTime));const el=$('fps');if(el)el.textContent=fps+' FPS';const d=$('perfDetail'),stats=perfController.stats;if(d)d.textContent=perfController.name+' · '+stats.work.toFixed(1)+' ms/frame · Physics '+stats.simulation.toFixed(1)+' ms · Graphics '+stats.graphics.toFixed(1)+' ms · Hybrid '+hybrid.stats().pressureEvents+' pressure / '+hybrid.stats().heatEvents+' heat';frameCount=0;perfTime=time}
  }
 }
 try{game=new Phaser.Game({type:Phaser.AUTO,parent:'viewport',width:WIDTH,height:HEIGHT,backgroundColor:'#08121d',pixelArt:true,roundPixels:true,antialias:false,render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.NO_CENTER,width:window.innerWidth,height:window.innerHeight},input:{activePointers:3},scene:[FactoryScene],audio:{noAudio:true},banner:false})}
 catch(e){$('loading').textContent='Phaser startup failed';$('error').textContent=e.message}
}
document.addEventListener('pointerdown',e=>{if(e.target.closest('button')){sound.unlock();sound.play('click')}},{passive:true});
makeTools();if(!loadEngine()){world.generate();player.spawn()}refreshButtons();
operations=createOperations(factory,{notice,save:()=>saveEngine(true),status,focusMachine:m=>{
 mode='inspect';player.follow=false;refreshButtons();
 coreUI?.hide();operations.inspect(m);
 travel(m.x,m.y);
 // A bottom sheet can cover the centre of the canvas on phones.
 const sheetTop=$('gameSheet').getBoundingClientRect().top;
 const camera=scene?.cameras.main;
 if(camera&&sheetTop<camera.height/2){
  camera.scrollY+=(camera.height/2-sheetTop/2)/camera.zoom;
  clampCamera();
 }
}});
coreUI=createCoreUI({core,living,intelligence,autonomy,factory,notice,save:()=>saveEngine(true),sound});
migration=createMigration({world,factory,dynamics,living,intelligence,autonomy,player,core,structures,save:()=>saveEngine(true),refresh:()=>{operations?.resetOverview();renderTerrain();renderMachines();status();operations?.render();shell?.refreshCatalog();shell?.updateMenu();coreUI?.render()},notice,travel:i=>travel(i*60+30,90)});
shell=createGameShell({world,factory,dynamics,operations,migration,notice,onTravel:travel,onNewWorld:newWorld,onPause:p=>{paused=!!p;acc=0;refreshButtons()},onSave:saveEngine,onBrush:n=>{brush=n},onCreativeChange:creative=>{if(!creative){material=-1;if(mode==='paint')notice('Career Mode: excavation only')}refreshButtons()}});
shell.setMenu(true);startPhaser();
window.addEventListener('pagehide',()=>{if(scene)saveEngine(true)});
