// Operations UI is isolated from the Phaser rendering scene.
const $=id=>document.getElementById(id);
const research={drill:['Extraction',30],refining:['Metallurgy',40],energy:['Generation',45],sifting:['Separation',40],logistics:['Logistics',55],survey:['Geology',60],petro:['Petrochemistry',75],grid:['Power grid',65],stability:['Hazard control',90]};
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function createOperations(factory,{notice,save,status}){
 let tab='career',selected=null;
 const root=$('operationsBody');
 const card=(title,detail,button,action,disabled=false)=>'<div class="operation"><strong>'+esc(title)+'</strong><small>'+esc(detail)+'</small>'+(button?'<button data-act="'+esc(action)+'" '+(disabled?'disabled':'')+'>'+esc(button)+'</button>':'')+'</div>';
 function render(){
  for(const name of ['Career','Research','Market','Inspector'])$('tab'+name).classList.toggle('active',tab===name.toLowerCase());
  if(tab==='career'){
   const goals=factory.goals();root.innerHTML='<div class="metricsLine">'+goals.filter(g=>g.claimed).length+' / '+goals.length+' contracts complete · '+factory.rp+' RP</div>'+goals.map(g=>card(g.title,g.detail+' · $'+g.reward+' + '+g.rp+' RP',g.claimed?'Completed':g.done?'Claim reward':'Locked','claim:'+g.id,g.claimed||!g.done)).join('');
  }else if(tab==='research'){
   root.innerHTML='<div class="metricsLine">'+factory.rp+' research points available</div>'+Object.entries(research).map(([key,[title,base]])=>{const lv=factory.up[key]||0,cost=base*(lv+1);return card(title+' · Level '+lv+'/5',lv>=5?'Fully researched':'Next upgrade: '+cost+' RP',lv>=5?'Complete':'Research','research:'+key,lv>=5||factory.rp<cost)}).join('');
  }else if(tab==='market'){
   root.innerHTML='<div class="metricsLine">Market ×'+factory.market.toFixed(2)+' · Debt $'+factory.debt+' · Revenue $'+factory.revenue+'</div><div class="inventory">'+[['Ore',factory.ore],['Metal',factory.metal],['Gold',factory.gold],['Quartz',factory.crystal],['Oil',factory.oil],['Fuel',factory.fuel]].map(([k,v])=>'<span>'+k+': <b>'+v+'</b></span>').join('')+'</div>'+card('Inventory sales','Sell all inventory at the current market price','Sell inventory','sell')+card('Auto-sell',factory.autoSell?'Enabled':'Disabled',factory.autoSell?'Disable':'Enable','auto');
  }else{
   const m=selected&&factory.machines.includes(selected)?selected:null;
   root.innerHTML=m?card(m.kind+' · '+m.x+','+m.y,'Health '+(m.integrity??100)+'% · '+(m.lastAction||'Standing by'),'Repair machine','repair')+card('Orientation','Turn directional machines clockwise','Rotate','rotate'):card('Inspect a machine','Select Inspect and tap a machine on the map','','');
  }
  root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{
   const [action,key]=b.dataset.act.split(':');let msg='';
   if(action==='claim')msg=factory.claim(key)||'Not ready';
   if(action==='research'){const level=factory.up[key]||0,base=research[key]?.[1],cost=base*(level+1);if(base&&level<5&&factory.rp>=cost){factory.rp-=cost;factory.up[key]++;msg='Research upgraded: '+research[key][0]}else msg='Not enough RP'}
   if(action==='sell')msg='Inventory sold for $'+factory.sell();
   if(action==='auto'){factory.autoSell=!factory.autoSell;msg='Auto-sell '+(factory.autoSell?'on':'off')}
   if(action==='repair')msg=selected?factory.repair(selected):'Select a machine first';
   if(action==='rotate')msg=selected&&factory.rotate(selected.x,selected.y)?'Rotated':'Machine cannot rotate';
   notice(msg);status();render();save();
  });
 }
 for(const name of ['Career','Research','Market','Inspector'])$('tab'+name).onclick=()=>{tab=name.toLowerCase();render()};
 $('borrow').onclick=()=>{notice(factory.borrow());status();render();save()};
 render();
 return {render,inspect(m){selected=m;tab='inspector';render()}};
}
