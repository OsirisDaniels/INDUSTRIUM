// Alpha 0.27: procedural Phaser sprite-atlas for industrial machinery.
// Built at runtime: no extra downloads, no changes to save data or machine rules.
const thermal=new Set(['furnace','kiln','combustor','refinery','distiller']);
const mining=new Set(['drill','deepdrill','crystaldrill','excavator','oilrig']);
const transport=new Set(['belt','filter','hopper','pump','condenser','cooler']);
const energy=new Set(['generator','wind','waterwheel','battery']);
const groups=['thermal','mining','transport','energy','general'];
const colors={thermal:0xe98665,mining:0xe3b66b,transport:0x74c9ce,energy:0x89e3b5,general:0xb4b7d5};
export function createIndustrialSprites(scene,factory){
 const atlasKey='industrium-industrial-027';
 if(!scene.textures.exists(atlasKey)){
  const g=scene.make.graphics({x:0,y:0},false);
  const atlas=document.createElement('canvas');atlas.width=32*4;atlas.height=32*groups.length;
  const ctx=atlas.getContext('2d');
  if(!ctx)return{draw(){},destroy(){}};
  for(let row=0;row<groups.length;row++)for(let f=0;f<4;f++){
   const type=groups[row],x=f*32,y=row*32,col=colors[type],pulse=f%2;
   g.clear();g.fillStyle(0x091823,1);g.fillRoundedRect(2,2,28,28,4);
   g.lineStyle(1,0x547281,1);g.strokeRoundedRect(3,3,26,26,3);
   g.fillStyle(0x18343e,1);g.fillRect(5,6,22,20);
   g.fillStyle(col,1);g.fillRect(6,6,20,4);
   if(type==='thermal'){g.fillStyle(0xffa04e,.5+pulse*.35);g.fillRect(9,12,14,12);g.fillStyle(0xffdf91,1);g.fillTriangle(12,24,16,11+f,20,24)}
   else if(type==='mining'){g.fillStyle(col,1);g.fillTriangle(16,8+f,9,21,23,21);g.fillRect(12,21,8,5)}
   else if(type==='transport'){g.fillStyle(col,1);g.fillRect(7,14,18,4);g.fillStyle(0xd9faff,1);g.fillCircle(9+f*4,16,2)}
   else if(type==='energy'){g.lineStyle(2,col,1);g.strokeCircle(16,17,9);g.lineBetween(16,17,16+Math.cos(f*Math.PI/2)*8,17+Math.sin(f*Math.PI/2)*8)}
   else{g.fillStyle(col,1);g.fillRoundedRect(9,12,14,12,2);g.fillStyle(0xe4faff,1);g.fillRect(12+f%2,15,6,3)}
   g.generateTexture('__industrium_temp_027',32,32);
   const img=scene.textures.get('__industrium_temp_027').getSourceImage();
   ctx.drawImage(img,x,y);
   scene.textures.remove('__industrium_temp_027');
  }
  g.destroy();
  scene.textures.addCanvas(atlasKey,atlas);
  const tex=scene.textures.get(atlasKey);
  for(let row=0;row<groups.length;row++)for(let f=0;f<4;f++)tex.add(groups[row]+'-'+f,0,f*32,row*32,32,32);
 }
 const sprites=new Map();
 const typeOf=k=>thermal.has(k)?'thermal':mining.has(k)?'mining':transport.has(k)?'transport':energy.has(k)?'energy':'general';
 function draw(time,camera,quality='Balanced'){
  const fast=quality==='Fast'||quality==='Ultra',alive=new Set(),list=factory.machines||[];
  const left=camera?camera.scrollX/4-12:0,right=camera?(camera.scrollX+camera.width/camera.zoom)/4+12:240;
  const top=camera?camera.scrollY/4-12:0,bottom=camera?(camera.scrollY+camera.height/camera.zoom)/4+12:160;
  const stride=1; // Every visible machine stays visible; low tiers only reduce animation frequency.
  for(let i=0;i<list.length;i+=stride){
   const m=list[i];if(m.x<left||m.x>right||m.y<top||m.y>bottom)continue;
   const id=i;alive.add(id);
   let sp=sprites.get(id);if(!sp){sp=scene.add.image(0,0,atlasKey,'general-0').setDepth(5);sprites.set(id,sp)}
   const active=!m.autoHold&&!m.safetyHold&&m.integrity!==0;
   const frame=active?Math.floor(time/(fast?360:145)+i)%4:0;
   sp.setFrame(typeOf(m.kind)+'-'+frame).setPosition(m.x*4,m.y*4).setAlpha(active?.96:.55).setVisible(true);
   if(m.integrity!=null&&m.integrity<35)sp.setTint(0xff9b86);else sp.clearTint();
  }
  for(const [id,sp] of sprites)if(!alive.has(id)){sp.destroy();sprites.delete(id)}
 }
 function destroy(){for(const sp of sprites.values())sp.destroy();sprites.clear()}
 return{draw,destroy,count:()=>sprites.size};
}
