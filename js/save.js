const KEY='industrium-save-v3';
export function save(world,factory){try{localStorage.setItem(KEY,JSON.stringify({version:3,grid:Array.from(world.grid),factory:factory.serialize()}));return true}catch(e){return false}}
export function load(world,factory){try{const latest=JSON.parse(localStorage.getItem(KEY));if(latest&&world.import(latest.grid)){factory.load(latest.factory||{});return 'Alpha 0.3.1 save restored'}
 const v2=JSON.parse(localStorage.getItem('industrium-save-v2'));if(v2&&world.import(v2.g)){factory.load(v2);save(world,factory);return 'Alpha 0.2 factory imported safely'}
 const v1=JSON.parse(localStorage.getItem('industrium-save-v1'));if(v1&&world.import(v1.grid)){factory.load(v1);save(world,factory);return 'Alpha 0.1 factory imported safely'}
 }catch(e){return 'Save unavailable; starting a new factory'}world.generate();return 'New Alpha 0.3.1 factory ready'}
export function reset(world,factory){localStorage.removeItem(KEY);world.generate();}