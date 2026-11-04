// Migration tools: read original saves, never modify original storage keys.
import {W,H,REGIONS,COLORS} from '../js/world.js?v=080-frontiers-final';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const OLD='industrium-save-v3',SLOT='industrium-slot-',ENGINE_SLOT='industrium-engine-slot-';
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
export function createMigration({world,factory,dynamics,save,refresh,notice,travel}){
 const panel=$('migrationBody');let tab='import';
 const snapshot=()=>({version:5,grid:Array.from(world.grid),seed:world.seed,factory:factory.serialize(),environment:dynamics.snapshot(),savedAt:Date.now()});
 const valid=s=>s&&Array.isArray(s.grid)&&[W*H,160*120].includes(s.grid.length)&&s.factory&&typeof s.factory==='object';
 const original=()=>[{key:OLD,label:'Original autosave',data:read(OLD)},...[1,2,3].map(i=>({key:SLOT+i,label:'Original Slot '+i,data:read(SLOT+i)}))];
 const slots=()=>[1,2,3].map(i=>({key:ENGINE_SLOT+i,label:'Phaser Slot '+i,data:read(ENGINE_SLOT+i)}));
 function restore(s){
  if(!valid(s))return false;
  if(!world.import(s.grid))return false;
  if(Number.isFinite(s.seed))world.seed=s.seed;
  factory.load(s.factory);dynamics.restore(s.environment);refresh();save();return true;
 }
 const item=(title,detail,action,button,disabled=false)=>'<div class="operation"><strong>'+esc(title)+'</strong><small>'+esc(detail)+'</small><button data-migrate="'+esc(action)+'" '+(disabled?'disabled':'')+'>'+esc(button)+'</button></div>';
 function render(){
  for(const name of ['Import','Slots','Atlas'])$('mig'+name).classList.toggle('active',tab===name.toLowerCase());
  if(tab==='import'){
   panel.innerHTML='<p class="metricsLine">Bring your original INDUSTRIUM factory into Phaser. Import copies your world, machinery, credits, upgrades and career progress. The original save stays untouched. Saves must be in this browser on this device.</p>'+original().map(s=>item(s.label,valid(s.data)?'Ready · '+s.data.grid.length+' cells · $'+Math.floor(s.data.factory.credits||0)+' · '+(s.data.factory.m||s.data.factory.machines||[]).length+' machines':'No compatible save found','import:'+s.key,'Copy into Phaser',!valid(s.data))).join('');
  }else if(tab==='slots'){
   panel.innerHTML='<p class="metricsLine">Three manual Phaser saves, separate from the automatic engine save and the original game.</p>'+slots().map(s=>'<div class="operation"><strong>'+s.label+'</strong><small>'+(valid(s.data)?new Date(s.data.savedAt||Date.now()).toLocaleString('en-NZ')+' · $'+Math.floor(s.data.factory.credits||0):'Empty slot')+'</small><div class="controls"><button data-migrate="save:'+s.key+'">Save here</button><button data-migrate="load:'+s.key+'" '+(!valid(s.data)?'disabled':'')+'>Load slot</button></div></div>').join('');
  }else{
   panel.innerHTML='<p class="metricsLine">Four regions. Tap a destination to move the Phaser camera.</p><div class="atlasGrid">'+REGIONS.map((r,i)=>'<button data-migrate="travel:'+i+'" style="border-left:4px solid '+r.color+'"><strong>'+esc(r.title)+'</strong><small>'+esc(r.subtitle)+'</small></button>').join('')+'</div><div class="metricsLine">Seed '+world.seed+' · '+W+' × '+H+' world · '+factory.machines.length+' machines</div>';
  }
  panel.querySelectorAll('[data-migrate]').forEach(b=>b.onclick=()=>{
   const [action,key]=b.dataset.migrate.split(':');
   if(action==='travel'){travel(Number(key));notice('Travelled to '+REGIONS[Number(key)].title);return}
   if(action==='save'){try{localStorage.setItem(key,JSON.stringify(snapshot()));notice('Saved '+b.closest('.operation').querySelector('strong').textContent)}catch(e){notice('Save failed: '+e.message)}render();return}
   const source=read(key);if(!valid(source)){notice('No compatible save in this slot');return}
   if(!confirm((action==='import'?'Import original factory':'Load Phaser slot')+'? Current unsaved Phaser progress will be replaced.'))return;
   if(restore(source))notice(action==='import'?'Original factory copied successfully into Phaser':'Phaser slot loaded');else notice('Could not restore that save');
   render();
  });
 }
 for(const name of ['Import','Slots','Atlas'])$('mig'+name).onclick=()=>{tab=name.toLowerCase();render()};
 render();return {render};
}
