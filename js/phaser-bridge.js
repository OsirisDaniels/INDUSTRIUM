// Alpha 0.9: Phaser presentation layer. The deterministic cellular world, factory logic,
// save slots and touch input remain owned by INDUSTRIUM during the staged migration.
// If Phaser or WebGL cannot start, the existing Canvas2D renderer remains visible.
export function createPhaserBridge(source,{width,height,onStatus=()=>{}}){
 const Phaser=window.Phaser;
 if(!Phaser){onStatus('Canvas compatibility mode (Phaser unavailable)');return {present(){},isReady(){return false}}}
 let ready=false,game=null,frameTexture=null,screen=null;
 const parent=source.parentElement;
 try{
  class WorldScene extends Phaser.Scene{
   constructor(){super({key:'IndustriumWorld'})}
   create(){
    const surface=document.createElement('canvas');surface.width=width;surface.height=height;
    frameTexture=this.textures.addCanvas('industrium-frame',surface);
    screen=this.add.image(width/2,height/2,'industrium-frame').setOrigin(.5).setDisplaySize(width,height);
    this.cameras.main.setBackgroundColor('#08111c');
    ready=true;
    parent.classList.add('phaser-active');
    onStatus('Phaser renderer active · cellular physics preserved');
   }
  }
  game=new Phaser.Game({type:Phaser.AUTO,width,height,parent,transparent:false,
   backgroundColor:'#08111c',pixelArt:true,roundPixels:true,
   antialias:false,antialiasGL:false,render:{pixelArt:true,antialias:false},
   input:{mouse:false,touch:false,keyboard:false,gamepad:false},
   scene:[WorldScene],scale:{mode:Phaser.Scale.NONE,width,height},
   banner:false,audio:{noAudio:true}});
 }catch(e){onStatus('Canvas compatibility mode · '+e.message)}
 return {
  isReady(){return ready},
  present(){
   if(!ready||!frameTexture)return;
   try{
    const context=frameTexture.getContext();
    context.clearRect(0,0,width,height);
    context.drawImage(source,0,0,width,height);
    frameTexture.refresh();
   }catch(e){
    ready=false;parent.classList.remove('phaser-active');
    onStatus('Canvas compatibility mode · rendering recovered');
    try{game?.destroy(true)}catch{}
   }
  }
 }
}
