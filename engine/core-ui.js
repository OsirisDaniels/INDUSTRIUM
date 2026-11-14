// Alpha 0.23: INDUSTRIUM CORE command centre and resource-aware automation policies.
export function createCoreUI({core,living,intelligence,autonomy,factory,notice,save,sound}){
 const $=id=>document.getElementById(id),body=$('coreBody'),main=$('operationsBody'),loan=$('borrow');
 let open=false,selected=null;
 const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function render(){
  if(!open)return;const s=core.snapshot(),e=escape,scroll=body.closest('.sheetBody'),scrollTop=scroll?.scrollTop||0;
  const cards=s.issues.length?s.issues.map(i=>'<article class="coreAlert priority'+i.priority+'"><strong>'+e(i.label)+'</strong><p>'+e(i.detail)+'</p><small>'+e(i.action)+'</small></article>').join(''):'<p class="coreGood">No significant factory issues detected.</p>';
  const regions=s.weather.map(r=>'<div class="coreRegion"><strong>'+e(r.region)+'</strong><span>'+e(r.weather)+(r.front?' · FRONT':'')+'</span><small>'+r.industry+' machines · Humidity '+Math.round(r.humidity||0)+'% · Impact '+r.damage+'/100</small></div>').join('');
  const logs=s.alerts.map(a=>'<li>'+e(a.message)+'</li>').join('');
  const history=s.history.map(a=>'<li>Cycle '+a.cycle+' · '+e(a.message)+'</li>').join('');
  const autolog=autonomy.logs.slice(0,6).map(a=>'<li>'+e(a.message)+'</li>').join('');
  const options=factory.machines.map((m,i)=>'<option value="'+i+'">'+e(m.kind)+' · '+m.x+','+m.y+'</option>').join('');
  const groups=s.groups.map(g=>'<div class="coreGroup"><span>'+e(g.name)+'</span><b>'+g.count+'</b><div class="coreMeter"><i style="width:'+Math.min(100,Math.round(g.count/Math.max(1,s.machines)*100))+'%"></i></div></div>').join('');
  body.innerHTML='<div class="coreIntro"><span class="eyebrow">INDUSTRIUM CORE · CONTROL INTELLIGENCE</span><h3>Factory command</h3><p>Local analysis, active automation and priority recommendations based on your actual factory.</p></div>'+
   '<div class="coreMetrics"><div><small>INSTALLATIONS</small><strong>'+s.machines+'</strong></div><div><small>OPERATING</small><strong>'+s.working+'</strong></div><div><small>EFFICIENCY</small><strong>'+s.efficiency+'%</strong></div></div>'+
   '<div class="coreForecast"><strong>Production forecast</strong><small>Estimated per 100 factory cycles (based on recent activity)</small><div class="coreForecastGrid"><span>ORE <b>'+s.forecast.ore+'</b></span><span>METAL <b>'+s.forecast.metal+'</b></span><span>TRANSPORT <b>'+s.forecast.transport+'</b></span></div><small>Power reserve: '+s.powerHeadroom+' · Production: '+s.power+' / Demand: '+s.powerUse+'</small></div>'+
   '<h4>Intelligent automation</h4><div class="coreControls"><label for="corePolicy">Factory policy</label><select id="corePolicy"><option value="off">Manual</option><option value="balanced">Balanced</option><option value="eco">Energy saver</option><option value="production">Max production</option></select></div>'+
   '<label class="coreCheck"><input type="checkbox" id="coreAutoService" '+(autonomy.autoService?'checked':'')+'> Auto-service and repair when funds allow</label>'+
   '<label class="coreCheck"><input type="checkbox" id="coreSafety" '+(intelligence.autoSafety?'checked':'')+'> Automatic overheat shutdown</label>'+
   '<h4>Installation groups</h4><div class="coreGroups">'+groups+'</div>'+
   '<h4>Priority recommendations</h4>'+cards+
   '<h4>Machine diagnostics</h4><div class="coreControls"><select id="coreMachine"><option value="">Choose machine</option>'+options+'</select><button id="coreService">Service</button><button id="coreRepair">Repair</button></div><div id="coreDiagnostic"></div>'+
   '<h4>Regional conditions</h4><div class="coreRegions">'+regions+'</div>'+
   '<h4>Automation log</h4><ul class="coreLog">'+(autolog||'<li>No automated actions yet.</li>')+'</ul>'+
   '<h4>Machine alerts</h4><ul class="coreLog">'+(logs||'<li>Nothing urgent reported.</li>')+'</ul>'+
   '<h4>Planetary history</h4><ul class="coreLog">'+(history||'<li>Your world is just getting started.</li>')+'</ul>';
  $('corePolicy').value=autonomy.mode;
  if(selected!==null&&selected<factory.machines.length)$('coreMachine').value=String(selected);
  $('corePolicy').onchange=e=>{autonomy.mode=e.target.value;core.refresh();notice('Automation: '+e.target.selectedOptions[0].textContent);sound?.play('automation');save();render()};
  $('coreAutoService').onchange=e=>{autonomy.autoService=e.target.checked;notice('Auto maintenance '+(autonomy.autoService?'on':'off'));save()};
  $('coreSafety').onchange=e=>{intelligence.autoSafety=e.target.checked;notice('Thermal safety '+(intelligence.autoSafety?'on':'off'));save()};
  $('coreMachine').onchange=e=>{selected=e.target.value===''?null:Number(e.target.value);diagnostic()};
  $('coreService').onclick=()=>{const m=selected===null?null:factory.machines[selected];notice(intelligence.service(m));sound?.play('repair');core.refresh();save();render()};
  $('coreRepair').onclick=()=>{const m=selected===null?null:factory.machines[selected];notice(m?factory.repair(m):'Choose a machine');sound?.play('repair');core.refresh();save();render()};
  diagnostic();if(scroll)scroll.scrollTop=scrollTop;
 }
 function diagnostic(){const d=$('coreDiagnostic'),m=selected===null?null:factory.machines[selected];if(!d)return;const s=intelligence.diagnostics(m);d.textContent=s?'Health '+s.health+'% · Wear '+s.wear+'% · Heat '+s.heat+' · '+s.power+' · '+s.safety+(m.autoHold?' · AUTO STANDBY':'')+' · '+s.action:'Choose a machine to inspect its actual condition.'}
 function show(){open=true;body.hidden=false;main.hidden=true;loan.hidden=true;for(const id of ['tabOverview','tabCareer','tabResearch','tabMarket','tabInspector','tabCore'])$(id).classList.toggle('active',id==='tabCore');render()}
 function hide(){if(!open)return;open=false;body.hidden=true;main.hidden=false;loan.hidden=false;$('tabCore').classList.remove('active')}
 $('tabCore').onclick=show;
 for(const id of ['tabOverview','tabCareer','tabResearch','tabMarket','tabInspector'])$(id).addEventListener('click',hide,true);
 return{render,show,hide,get open(){return open}};
}
