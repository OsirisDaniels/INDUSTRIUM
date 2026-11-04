// Keep the original local-storage key so Alpha 0.1–0.7 factories are never orphaned.
const KEY='industrium-save-v3';
export function save(world,factory){try{localStorage.setItem(KEY,JSON.stringify({version:4,width:world.grid.length,seed:world.seed||0,grid:Array.from(world.grid),factory:factory.serialize()}));return true}catch(e){return false}}
export function load(world,factory){try{
 const latest=JSON.parse(localStorage.getItem(KEY));
 if(latest&&world.import(latest.grid)){if(Number.isFinite(latest.seed)&&latest.grid.length===world.grid.length)world.seed=latest.seed;factory.load(latest.factory||{});return latest.grid.length===160*120?'Legacy factory safely expanded into the larger world':'Factory autosave restored'}
 const v2=JSON.parse(localStorage.getItem('industrium-save-v2'));
 if(v2&&world.import(v2.g)){factory.load(v2);save(world,factory);return 'Alpha 0.2 factory imported into the expanded world'}
 const v1=JSON.parse(localStorage.getItem('industrium-save-v1'));
 if(v1&&world.import(v1.grid)){factory.load(v1);save(world,factory);return 'Alpha 0.1 factory imported into the expanded world'}
 }catch(e){return 'Save unavailable; starting a fresh planet'}
 world.generate();return 'New world generated · '+world.seed}
export function reset(world,factory){world.generate();factory.load({});save(world,factory)}
