// Alpha 0.20: self-contained INDUSTRIUM CORE panel.
export function createCoreUI({core,living,intelligence,factory,notice,save}){
 const $=id=>document.getElementById(id),body=$('coreBody'),main=$('operationsBody'),loan=$('borrow');
 let open=false,lastUpdate=-1,selected=null;
 const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function render(){
  if(!open)return;const s=core.snapshot(),e=escape;
  const cards=s.issues.length?s.issues.map(i=>'<article class="coreAlert priority'+i.priority+'"><strong>'+e(i.label)+'</strong><p>'+e(i.detail)+'</p><small>'+e(i.action)+'</small></article>').join(''):'<p class="coreGood">No major bottlenecks detected. Your factory is operating within current limits.</p>';
  const regions=s.weather.map(r=>'<div class="coreRegion"><strong>'+e(r.region)+'</strong><span>'+e(r.weather)+'</span><small>'+r.industry+' machines · Impact '+r.damage+'/100</small></div>').join('');
  const alerts=s.alerts.map(a=>'<li>'+e(a.message)+'</li>').join('');
  const history=s.history.map(a=>'<li>Cycle '+a.cycle+' · '+e(a.message)+'</li>').join('');
  const machineOptions=factory.machines.map((m,i)=>'<option value="'+i+'">'+e(m.kind)+' · '+m.x+','+m.y+'</option>').join('');
  body.innerHTML='<div class="coreIntro"><span class="eyebrow">INDUSTRIUM CORE · LOCAL INTELLIGENCE</span><h3>Factory command</h3><p>Live recommendations based on actual machine and planetary conditions. No external AI required.</p></div>'+
   '<div class="coreMetrics"><div><small>INSTALLATIONS</small><strong>'+s.machines+'</strong></div><div><small>OPERATING</small><strong>'+s.working+'</strong></div><div><small>POWER</small><strong>'+s.power+'/'+s.powerUse+'</strong></div></div>'+
   '<h4>Priority recommendations</h4>'+cards+
   '<h4>Machine diagnostics</h4><div class="coreControls"><select id="coreMachine"><option value="">Choose machine</option>'+machineOptions+'</select><button id="coreService">Service</button><button id="coreRepair">Repair</button></div><div id="coreDiagnostic"></div>'+
   '<div class="coreControls"><label><input type="checkbox" id="coreSafety" '+(intelligence.autoSafety?'checked':'')+'> Automatic thermal safety</label></div>'+
   '<h4>Regional conditions</h4><div class="coreRegions">'+regions+'</div>'+
   '<h4>Machine alerts</h4><ul class="coreLog">'+(alerts||'<li>Nothing urgent reported.</li>')+'</ul>'+
   '<h4>Planetary history</h4><ul class="coreLog">'+(history||'<li>Your world is just getting started.</li>')+'</ul>';
  const selector=$('coreMachine');if(selected!==null&&selected<factory.machines.length)selector.value=String(selected);
  selector.onchange=()=>{selected=selector.value===''?null:Number(selector.value);diagnostic()};
  $('coreSafety').onchange=e=>{intelligence.autoSafety=e.target.checked;notice('Automatic safety '+(intelligence.autoSafety?'enabled':'disabled'));save()};
  $('coreService').onclick=()=>{const m=factory.machines[selected];notice(intelligence.service(m));core.refresh();save();render()};
  $('coreRepair').onclick=()=>{const m=factory.machines[selected];notice(m?factory.repair(m):'Choose a machine');core.refresh();save();render()};
  diagnostic();
 }
 function diagnostic(){const d=$('coreDiagnostic'),m=factory.machines[selected];if(!d)return;const s=intelligence.diagnostics(m);d.textContent=s?'Health '+s.health+'% · Wear '+s.wear+'% · Heat '+s.heat+' · '+s.power+' · '+s.safety+' · '+s.action:'Select a machine to view its live condition.'}
 function show(){open=true;body.hidden=false;main.hidden=true;loan.hidden=true;document.querySelectorAll('.tabs button').forEach(b=>{if(['tabCareer','tabResearch','tabMarket','tabInspector','tabCore'].includes(b.id))b.classList.toggle('active',b.id==='tabCore')});render()}
 function hide(){if(!open)return;open=false;body.hidden=true;main.hidden=false;loan.hidden=false;$('tabCore').classList.remove('active')}
 $('tabCore').onclick=show;
 for(const id of ['tabCareer','tabResearch','tabMarket','tabInspector'])$(id).addEventListener('click',hide);
 return{render,show,hide,get open(){return open}};
}
