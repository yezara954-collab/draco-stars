import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as C from './config.js';
import { particleCloud, randomSequence } from './particles.js';
import { makePortrait } from './portrait.js';
import { makeCrane } from './crane.js';

const stage=document.querySelector('#stage');
const button=document.querySelector('#portrait');
const orientation=document.querySelector('#orientation');
const renderer=new T.WebGLRenderer({canvas:document.querySelector('#scene'),antialias:false,alpha:false});
renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();
scene.background=new T.Color(C.BG_COLOR);
const camera=new T.PerspectiveCamera(C.CAMERA.FOV,.1,.1,70);
const composer=new EffectComposer(renderer);
const bloom=new UnrealBloomPass(new T.Vector2(1,1),C.RENDER.BLOOM_STRENGTH,C.RENDER.BLOOM_RADIUS,C.RENDER.BLOOM_THRESHOLD);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(bloom);
composer.addPass(new OutputPass());

const mobile=matchMedia('(pointer: coarse)').matches || innerWidth<=C.RENDER.MOBILE_WIDTH;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const limit=Math.min(mobile?15000:40000,mobile?C.RENDER.MOBILE_LIMIT:C.RENDER.DESKTOP_LIMIT,
  mobile?C.RENDER.MOBILE_BUDGET:C.RENDER.DESKTOP_BUDGET);
const skyCount=Math.min(C.SKY.COUNT,Math.floor(limit*.10));
const breathCount=Math.min(C.BREATH.COUNT+C.BREATH.STREAMS*C.BREATH.BEADS,Math.floor(limit*.3));
const portrait=await makePortrait(limit-skyCount-breathCount);
const Draco=new T.Group();
Draco.add(portrait.cloud.points);
scene.add(Draco);
const mouth=portrait.local(...C.MOUTH_POS);
const crane=makeCrane();
const sky=particleCloud(skyCount,{pulse:.57,rate:.48});
const breath=particleCloud(breathCount,{depthTest:true});
scene.add(sky.points,breath.points,crane.group);
breath.geometry.setDrawRange(0,0);
crane.alpha(0);
const [ambient,key,back]=C.CRANE.LIGHTS;
scene.add(new T.HemisphereLight(C.COLORS.PALE_GOLD,C.COLORS.CYAN,ambient));
const keyLight=new T.DirectionalLight(C.COLORS.PALE_GOLD,key);
keyLight.position.set(-2,4,5);
const backLight=new T.DirectionalLight(C.COLORS.WHITE,back);
backLight.position.set(3,1,-4);
scene.add(keyLight,backLight);
const rng=randomSequence(989);
const white=new T.Color(C.COLORS.WHITE), gold=new T.Color(C.COLORS.GOLD);
const cream=new T.Color(C.COLORS.PALE_GOLD), cyan=new T.Color(C.COLORS.CYAN);
const mix=T.MathUtils.lerp, clamp=T.MathUtils.clamp, smooth=T.MathUtils.smoothstep;
for(let i=0;i<skyCount;i++){
  const [x,y,z]=C.SKY.SPREAD;
  const kind=rng()<C.SKY.SPARK_CHANCE?4:0;
  sky.write(i,(rng()-.5)*x,(rng()-.5)*y,C.SKY.Z_CENTER+(rng()-.5)*z,
    rng()>.8?cream:white,mix(...C.SKY.SIZE,rng()),mix(...C.SKY.BRIGHTNESS,rng()),kind,rng());
}
sky.flush();
const effects=Array.from({length:breathCount},(_,i)=>{
  const bead=i<C.BREATH.STREAMS*C.BREATH.BEADS;
  const trail=bead?i%C.BREATH.BEADS:0;
  const f=rng(), phase=rng();
  const kind=bead?0:f<.045?4:f<.12?2:f<.24?1:f<.32?3:0;
  return {
    bead,trail,phase,kind, size:bead?mix(4.4,1.8,trail/Math.max(1,C.BREATH.BEADS-1)):
      kind?mix(C.BREATH.POINT_SIZE[1],C.BREATH.SPARK_SIZE,phase):mix(...C.BREATH.POINT_SIZE,phase),
    tint:kind===3&&phase>.5?cyan:phase<.17?white:phase<.59?cream:gold,
    q:rng(),r:rng(), s:rng(), face:Math.floor(rng()*crane.faces.length), a:rng(), b:rng()
  };
});
const origin=new T.Vector3(), goal=new T.Vector3(), end=new T.Vector3(), p=new T.Vector3();
const pointer=new T.Vector2(), lean=new T.Vector2(), projected=new T.Vector3();
const hover=new T.Vector3();
let width=1,height=1,layout='landscape',viewHeight=1,viewWidth=1;
let quality=0, fpsTime=0, fpsFrames=0, raf=0, last=0, clock=0, elapsed=0;
let playing=C.DEBUG_START_STATE===1||C.DEBUG_START_STATE===2;
let done=false, tilt=false;
if(C.DEBUG_START_STATE===2) elapsed=C.TIMELINE[2];
let dpr=1;

function resize(){
  width=stage.clientWidth || 1;
  height=stage.clientHeight || 1;
  layout=width>=height?'landscape':'portrait';
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
  viewHeight=2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*C.CAMERA.DISTANCE;
  viewWidth=viewHeight*camera.aspect;
  dpr=Math.min(C.RENDER.MAX_DPR,devicePixelRatio||1)*C.RENDER.QUALITY[quality];
  renderer.setPixelRatio(dpr);
  renderer.setSize(width,height,false);
  composer.setPixelRatio(dpr);
  composer.setSize(width,height);
  for(const cloud of [sky,portrait.cloud,breath]) cloud.uniforms.dpr.value=dpr;
  const fraction=C.RENDER.QUALITY[quality];
  sky.geometry.setDrawRange(0,Math.floor(skyCount*fraction));
  portrait.cloud.geometry.setDrawRange(0,Math.floor(portrait.count*fraction));
  stage.dataset.quality=quality;
}
function place(target,uv,z=0){
  target.set((uv[0]-.5)*viewWidth,(.5-uv[1])*viewHeight,z);
}
function updateContent(motion){
  place(Draco.position,C.DRACO_POSITION[layout]);
  const size=Math.min(viewHeight,viewWidth/portrait.width)*C.DRACO_SCALE[layout];
  Draco.scale.setScalar(size);
  if (!playing && !done) {
    Draco.rotation.y=Math.sin(clock*C.PORTRAIT.SWAY_RATE)*T.MathUtils.degToRad(C.PORTRAIT.SWAY_DEGREES)*motion;
    Draco.rotation.z=Math.sin(clock*C.PORTRAIT.SWAY_RATE*.6)*T.MathUtils.degToRad(C.PORTRAIT.ROLL_DEGREES)*motion;
  }
  Draco.updateWorldMatrix(true,true);
  origin.copy(mouth).applyMatrix4(Draco.matrixWorld);
  place(goal,C.LAYOUT[layout].CRANE,.26);
  hover.copy(goal);
  const t=elapsed;
  const form=smooth(t,C.TIMELINE[2],C.TIMELINE[3]);
  let paper=smooth(form,C.CRANE.FORM_VISIBLE_AT,1);
  if(reduced.matches && (done||t>=C.BREATH.REDUCED_DURATION)) paper=1;
  hover.y+=Math.sin(t*C.CRANE.HOVER_RATE)*C.CRANE.HOVER*paper*motion;
  crane.group.position.copy(hover);
  crane.group.scale.setScalar(Math.min(viewWidth,viewHeight)*C.CRANE.SIZE[layout]*mix(C.CRANE.FORM_INITIAL_SCALE,1,paper));
  crane.pose(t,motion*paper);
  crane.alpha(paper);
  crane.group.updateMatrixWorld(true);
  if(!playing || reduced.matches){
    breath.geometry.setDrawRange(0,0);
    return;
  }
  const flight=new T.CubicBezierCurve3(...C.BREATH.CURVE.map(([x,y,z])=>new T.Vector3(
    mix(origin.x,goal.x,x),mix(origin.y,goal.y,x)+y,mix(origin.z,goal.z,x)+z
  )));
  let visible=0;
  const allowed=Math.floor(breathCount*C.RENDER.QUALITY[quality]);
  // 串珠按同一条路径连续采样，首粒更亮，尾珠依次滞后。
  for(let i=0;i<allowed;i++){
    const a=effects[i];
    const head=a.bead?effects[i-a.trail]:a;
    const age=t-head.q*C.BREATH.EMIT_DURATION-a.trail*C.BREATH.BEAD_DELAY;
    if(age<0) continue;
    const f=clamp(age/C.BREATH.TRAVEL,0,1);
    flight.getPoint(f,p);
    const plume=Math.sin(f*Math.PI*.64);
    const spin=head.phase*2*Math.PI+f*Math.PI*1.8;
    p.x+=(head.r-.5)*C.BREATH.SPREAD[0]*plume;
    p.y+=(Math.cos(spin)*(.24+head.r*.76))*C.BREATH.SPREAD[1]*plume;
    p.z+=(Math.sin(spin)*(.24+head.s*.76))*C.BREATH.SPREAD[2]*plume;
    if(form>0){
      const face=crane.faces[a.face];
      const s=Math.sqrt(a.a);
      end.copy(face[0]).multiplyScalar(1-s).addScaledVector(face[1],s*(1-a.b)).addScaledVector(face[2],s*a.b);
      end.multiplyScalar(1+(a.s-.5)*C.BREATH.GATHER_WIDTH*(1-form)).applyMatrix4(crane.group.matrixWorld);
      p.lerp(end,form);
    }
    const energy=mix(...C.BREATH.LUMINANCE,a.phase)*(a.bead?1-a.trail/C.BREATH.BEADS*.65:1);
    const opacity=smooth(age,0,.09)*(1-smooth(form,.69,1));
    breath.write(visible++,p.x,p.y,p.z,a.tint,a.size,energy*opacity,a.kind,a.phase);
  }
  const flash=Math.sin(Math.PI*smooth(form,.79,1))*C.BREATH.FLASH;
  if(flash>0 && visible<breathCount) breath.write(visible++,goal.x,goal.y,goal.z,white,C.BREATH.SPARK_SIZE*2,flash*5,4,.4);
  breath.geometry.setDrawRange(0,visible);
  breath.flush();
}

function updateHitArea(){
  if(button.hidden) return;
  const [u,v,r,b]=C.PORTRAIT.HIT_BOUNDS;
  let minX=width,minY=height,maxX=0,maxY=0;
  for (const [x,y] of [[u,v],[r,v],[u,b],[r,b]]){
    projected.copy(portrait.local(x,y,0));
    projected.z=0;
    projected.applyMatrix4(Draco.matrixWorld).project(camera);
    const px=(projected.x*.5+.5)*width,py=(.5-projected.y*.5)*height;
    minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);
  }
  button.style.left=clamp(minX,0,width)+'px';
  button.style.top=clamp(minY,0,height)+'px';
  button.style.width=Math.max(44,Math.min(width,maxX)-Math.max(0,minX))+'px';
  button.style.height=Math.max(44,Math.min(height-15,maxY)-Math.max(0,minY))+'px';
}

function frame(now){
  raf=0;
  if(document.hidden) return;
  const raw=last?(now-last)/1000:0;
  last=now;
  const dt=Math.min(C.RENDER.MAX_FRAME_DELTA,raw);
  const motion=reduced.matches?0:1;
  clock+=dt*motion;
  if(playing) {
    elapsed+=dt;
    if(elapsed>=(motion?C.TIMELINE[3]:C.BREATH.REDUCED_DURATION)){
      elapsed=C.TIMELINE[3];playing=false;done=true;
    }
  } else if(done) elapsed+=dt*motion;
  stage.dataset.state=done?'2-complete':playing?(elapsed<C.TIMELINE[2]?'1':'2'):'0';
  lean.lerp(pointer,1-Math.exp(-dt*C.CAMERA.FOLLOW));
  camera.position.set(
    motion*(Math.sin(clock*C.CAMERA.DRIFT_RATE)*C.CAMERA.DRIFT[0]+lean.x*C.CAMERA.PARALLAX[0]),
    C.CAMERA.HEIGHT+motion*(Math.sin(clock*C.CAMERA.DRIFT_RATE*.81)*C.CAMERA.DRIFT[1]+lean.y*C.CAMERA.PARALLAX[1]),
    C.CAMERA.DISTANCE+motion*Math.sin(clock*C.CAMERA.ZOOM_RATE)*C.CAMERA.ZOOM);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
  updateContent(motion);
  updateHitArea();
  sky.uniforms.clock.value=clock;
  if(!playing) portrait.cloud.uniforms.clock.value=clock;
  composer.render(dt);
  if(raw>0 && !reduced.matches) {
    fpsFrames++;fpsTime+=raw;
    if(fpsTime>=C.RENDER.QUALITY_WINDOW){
      stage.dataset.fps=Math.round(fpsFrames/fpsTime);
      if(fpsFrames/fpsTime<C.RENDER.TARGET_FPS && quality<C.RENDER.QUALITY.length-1){quality++;resize();}
      fpsFrames=0;fpsTime=0;
    }
  }
  if(motion||playing) request();
}
function request(){if(!raf&&!document.hidden) raf=requestAnimationFrame(frame);}
button.addEventListener('click',()=>{
  if(playing||done) return;
  playing=true;elapsed=0;button.hidden=true;request();
});
stage.addEventListener('pointermove',event=>{
  if(!tilt && event.pointerType!=='touch') pointer.set(event.clientX/width*2-1,1-event.clientY/height*2);
});
stage.addEventListener('pointerleave',()=>{if(!tilt)pointer.set(0,0);});
if(mobile && 'DeviceOrientationEvent' in window){
  orientation.hidden=false;
  orientation.addEventListener('click',async()=>{
    try{
      if(typeof DeviceOrientationEvent.requestPermission==='function' &&
        await DeviceOrientationEvent.requestPermission()!=='granted') {
        orientation.textContent='体感权限未开启';return;
      }
      let base=null;
      window.addEventListener('deviceorientation',event=>{
        if(event.beta===null||event.gamma===null) return;
        base??=[event.beta,event.gamma];tilt=true;
        pointer.set(clamp((event.gamma-base[1])/C.CAMERA.TILT_RANGE,-1,1),
          clamp((base[0]-event.beta)/C.CAMERA.TILT_RANGE,-1,1));
        orientation.hidden=true;
      });
      orientation.textContent='等待体感数据';
    } catch { orientation.textContent='体感暂不可用'; }
  },{once:true});
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;fpsTime=0;fpsFrames=0;}
  else request();
});
reduced.addEventListener('change',()=>{
  if(reduced.matches) {
    clock=0;
    Draco.rotation.set(0,0,0);
    portrait.cloud.uniforms.clock.value=0;
  }
  request();
});
new ResizeObserver(()=>{resize();request();}).observe(stage);
button.hidden=playing;
document.querySelector('#notice').hidden=true;
resize();request();
