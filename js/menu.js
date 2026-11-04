// INDUSTRIUM's standalone game-shell UI. All game state remains in the existing simulation.
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SLOT_PREFIX='industrium-slot-';
const settingsKey='industrium-settings-v1';
const fmt=n=>Math.floor(n||0).toLocaleString('en-NZ');
export function createGameMenu({world,factory,save,refresh,note,onPause,onResume,onNewWorld,onSettings}){
 const screen=$('#gameMenu'),panel=$('#menuBody'),nav=$('#menuNav'),title=$('#menuTitle'),back=$('#menuBack'),start=$('#menuStart');
 let page='home',visible=true,started=false;
 let settings={sound:false,particles:true,showHints:true,confirmNew:true,...read(settingsKey,{})};
 function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
 function write(key,obj){try{localStorage.setItem(key,JSON.stringify(obj));return true}catch{return false}}
 const saveSlot=i=>{const snapshot={version:1,time:Date.now(),grid:Array.from(world.grid),factory:factory.serialize()};if(write(SLOT_PREFIX+i,snapshot)){note('Factory saved to Slot '+i);render()}else note('Save failed. Storage may be full.')};
 const loadSlot=i=>{const s=read(SLOT_PREFIX+i);if(!s||!Array.isArray(s.grid))return note('Empty save slot');if(settings.confirmNew&&!confirm('Load Slot '+i+'? Unsaved progress will be replaced.'))return;if(!world.import(s.grid))return note('Invalid world data');factory.load(s.factory||{});save(world,factory);refresh();note('Slot '+i+' loaded');render()};
 const button=(label,action,secondary=false)=>'<button type="button" class="menuAction'+(secondary?' secondary':'')+'" data-action="'+action+'">'+label+'</button>';
 const navs=[['home','Home'],['play','Play'],['saves','Save games'],['progress','Career'],['guide','Field manual'],['settings','Settings']];
 function setPage(next){page=next;render()}
 function show(next='home'){visible=true;screen.hidden=false;screen.classList.add('show');onPause();setPage(next)}
 function hide(){visible=false;started=true;screen.hidden=true;screen.classList.remove('show');onResume()}
 function newWorld(){if(settings.confirmNew&&!confirm('Start a fresh world? The current autosave will be replaced. You can save to a slot first.'))return;onNewWorld();hide()}
 function render(){
 title.textContent=({home:'INDUSTRIUM',play:'Start your shift',saves:'Save management',progress:'Career overview',guide:'Field manual',settings:'Game settings'})[page]||'INDUSTRIUM';
 nav.innerHTML=navs.map(([id,label])=>'<button type="button" data-page="'+id+'" class="'+(id===page?'selected':'')+'">'+label+'</button>').join('');
 back.hidden=page==='home';start.textContent=started?'Resume factory':'Enter factory';
 if(page==='home'){panel.innerHTML='<div class="menuHero"><span class="menuEyebrow">ALPHA 0.7 · OPERATIONS</span><h2>Build a world that works.</h2><p>Excavate the earth. Engineer material reactions. Build automated industry from loose grains to gold.</p></div><div class="menuCards"><div><span>YOUR FACTORY</span><strong>$'+fmt(factory.credits)+'</strong><small>'+factory.machines.length+' machines · '+fmt(factory.goldProduced)+' gold produced</small></div><div><span>WORLD STATUS</span><strong>'+ (factory.weather?'Living':'Calm')+'</strong><small>'+fmt(factory.mined)+' ore mined · '+fmt(factory.sifted)+' sand separated</small></div></div><div class="menuStack">'+button(started?'Continue game':'Continue autosave','resume')+button('New game','new',true)+button('Save slots','saves',true)+button('How to play','guide',true)+'</div>'}
 if(page==='play'){panel.innerHTML='<p class="menuLead">Your factory continues exactly where you left it. You can also begin a new world or load a saved factory.</p><div class="menuStack">'+button('Continue factory','resume')+button('Start new world','new',true)+button('Load save slot','saves',true)+'</div><p class="menuFine">Autosave runs every 20 seconds and whenever the game goes into the background. Manual slots are separate.</p>'}
 if(page==='saves'){panel.innerHTML='<p class="menuLead">Three independent factory snapshots. Autosave is separate and stays active.</p>'+[1,2,3].map(i=>{const s=read(SLOT_PREFIX+i),date=s?.time?new Date(s.time).toLocaleString('en-NZ'):'Empty slot';return '<div class="saveSlot"><div><b>Slot '+i+'</b><small>'+esc(date)+(s?.factory?' · $'+fmt(s.factory.credits)+' · '+(s.factory.m?.length||0)+' machines':'')+'</small></div><div class="slotActions">'+button('Save','save-'+i)+button('Load','load-'+i,true)+'</div></div>'}).join('')+button('Return to factory','resume',true)}
 if(page==='progress'){const goals=factory.goals();const complete=goals.filter(g=>g.claimed).length;panel.innerHTML='<p class="menuLead">The more you automate, the further your industry can grow.</p><div class="menuCards"><div><span>CONTRACTS CLAIMED</span><strong>'+complete+'/'+goals.length+'</strong></div><div><span>RESEARCH POINTS</span><strong>'+fmt(factory.rp)+'</strong></div><div><span>REVENUE</span><strong>$'+fmt(factory.revenue)+'</strong></div><div><span>GOLD PRODUCED</span><strong>'+fmt(factory.goldProduced)+'</strong></div></div><h3>Industrial contracts</h3>'+goals.map(g=>'<div class="menuGoal"><div><b>'+esc(g.title)+'</b><small>'+esc(g.detail)+'</small></div><span>'+ (g.claimed?'CLAIMED':g.done?'READY':'IN PROGRESS')+'</span></div>').join('')+'<p class="menuFine">Claim completed contract rewards in the Factory Dashboard while playing.</p>'}
 if(page==='guide'){panel.innerHTML='<p class="menuLead">Every pixel is part of the production chain. Learn the basics, then experiment.</p>'+[
 ['01 · Excavate','Choose Materials → Excavate and drag over the earth. Digging sandsoil releases sand. Ore and gold can be collected directly.'],
 ['02 · Make wet sand','Sand and water react to create wet sand. Shape channels and reservoirs with stone.'],
 ['03 · Extract value','Build a generator and Wet-Sand Separator near wet sand. The separator makes residue and sometimes gold.'],
 ['04 · Recycle waste','Send residue into a Thermal Kiln. Feed burnt residue into a Compression Press for extra gold.'],
 ['05 · Automate','Use hoppers, belts, filters and storage. Inspect machines to see missing inputs, power and their direction.'],
 ['06 · Expand','Sell products, research upgrades, complete contracts and unlock higher industrial tiers.'],
 ['07 · Touch controls','Tap a tool in the bottom bar, then touch the world. Use Pan to move the camera, Zoom to inspect details, Rotate to change outputs.']
 ].map(([h,p])=>'<details class="manualEntry"><summary>'+h+'</summary><p>'+p+'</p></details>').join('')+button('Start building','resume')}
 if(page==='settings'){panel.innerHTML='<p class="menuLead">Tune your factory for the way you like to play.</p><div class="menuSetting"><div><b>Living-world events</b><small>Rain, underground tremors and geothermal pulses</small></div><button data-action="weather">'+(factory.weather?'ON':'OFF')+'</button></div><div class="menuSetting"><div><b>HUD hints</b><small>Show guidance at the bottom of the game</small></div><button data-action="hints">'+(settings.showHints?'ON':'OFF')+'</button></div><div class="menuSetting"><div><b>Confirm destructive actions</b><small>Ask before starting over or loading a slot</small></div><button data-action="confirm">'+(settings.confirmNew?'ON':'OFF')+'</button></div><div class="menuSetting"><div><b>Low-power mode</b><small>Limit display redraws to save battery</small></div><button data-action="battery">'+(settings.battery?'ON':'OFF')+'</button></div><p class="menuFine">Sound and visual effects are reserved for a future update. Your settings are saved on this device.</p>'+button('Return to game','resume')}
 }
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)setPage(b.dataset.page)});
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(a==='resume')hide();else if(a==='new')newWorld();else if(['saves','guide','play','settings','progress'].includes(a))setPage(a);
 else if(a.startsWith('save-'))saveSlot(Number(a.slice(5)));
 else if(a.startsWith('load-'))loadSlot(Number(a.slice(5)));
 else if(a==='weather'){factory.weather=!factory.weather;save(world,factory);render()}
 else if(a==='hints'){settings.showHints=!settings.showHints;write(settingsKey,settings);onSettings(settings);render()}
 else if(a==='confirm'){settings.confirmNew=!settings.confirmNew;write(settingsKey,settings);render()}
 else if(a==='battery'){settings.battery=!settings.battery;write(settingsKey,settings);onSettings(settings);render()}
 });
 $('#menuOpen').onclick=()=>show('home');back.onclick=()=>setPage('home');start.onclick=()=>hide();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!visible)show('home');else if(page!=='home')setPage('home');else hide()}});
 onSettings(settings);render();show('home');
 return {show,hide,render,isVisible:()=>visible,settings:()=>settings};
}
