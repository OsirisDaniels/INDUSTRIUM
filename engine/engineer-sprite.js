// Alpha 0.28: procedural engineer animation, no external assets.
export function createEngineerSprite(scene,player){
 const key='engineer-028',styles=['engineer','surveyor','mechanic'],states=['idle','walk','jump','hurt'];
 if(!scene.textures.exists(key)){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=40*12;
  const c=canvas.getContext('2d');if(!c)return null;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
  for(let s=0;s<3;s++)for(let a=0;a<4;a++)for(let f=0;f<4;f++){
   const x=f*32,y=(s*4+a)*40,step=a===1?Math.sin(f*Math.PI/2)*3:0;
   rect(x+11+step,y+28,4,8,'#355464');rect(x+17-step,y+28,4,8,'#355464');
   rect(x+10,y+17,12,13,a===3?'#e18380':['#7cdfb7','#79baff','#f0bd72'][s]);
   rect(x+8,y+18+step,3,10,'#cfa468');rect(x+22,y+18-step,3,10,'#cfa468');
   rect(x+11,y+7-(a===2?2:0),11,12,'#f4b96e');
   rect(x+9,y+5-(a===2?2:0),15,6,'#f9df9b');
   rect(x+13,y+11-(a===2?2:0),9,4,'#17303c');
   rect(x+18,y+12-(a===2?2:0),3,2,'#98f5fa');
  }
  const tex=scene.textures.addCanvas(key,canvas);
  for(let s=0;s<3;s++)for(let a=0;a<4;a++)for(let f=0;f<4;f++)tex.add(styles[s]+'-'+states[a]+'-'+f,0,f*32,(s*4+a)*40,32,40);
 }
 const sprite=scene.add.image(0,0,key,'engineer-idle-0').setDepth(8);
 let previousHealth=player.health,hurtUntil=0;
 function update(time){
  if(player.health<previousHealth)hurtUntil=time+400;previousHealth=player.health;
  const state=time<hurtUntil?'hurt':!player.grounded?'jump':player.moving?'walk':'idle';
  const frame=state==='walk'?Math.floor(time/110)%4:state==='idle'?Math.floor(time/600)%4:0;
  sprite.setFrame(player.style+'-'+state+'-'+frame).setPosition(player.x*4,player.y*4-17).setFlipX(player.face<0);
 }
 return{update,destroy:()=>sprite.destroy()};
}
