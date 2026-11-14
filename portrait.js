import * as T from 'three';
import * as C from './config.js';
import { particleCloud, randomSequence } from './particles.js';

function readImage(src) {
  return new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取 ' + src));
    image.src = src;
  });
}
function imagePixels(image,w,h) {
  const canvas = document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0,w,h);
  return ctx.getImageData(0,0,w,h).data;
}
function boundary(u,v,polygon) {
  let inside=false, nearest=Infinity;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [x,y]=polygon[i], [a,b]=polygon[j];
    if ((y>v)!==(b>v) && u<(a-x)*(v-y)/(b-y)+x) inside=!inside;
    const dx=a-x, dy=b-y;
    const f=T.MathUtils.clamp(((u-x)*dx+(v-y)*dy)/(dx*dx+dy*dy),0,1);
    nearest=Math.min(nearest,Math.hypot(u-x-dx*f,v-y-dy*f));
  }
  return {inside,nearest};
}

export async function makePortrait(capacity) {
  const [photo,depth]=await Promise.all([readImage('./assets/draco_ref.jpg'),readImage('./assets/draco_depth.png')]);
  if (photo.width !== depth.width || photo.height !== depth.height) throw new Error('照片与深度图像素尺寸须一致');
  const aspect=photo.width/photo.height;
  const width=C.PORTRAIT.SAMPLE_WIDTH, height=Math.round(width/aspect);
  const rgb=imagePixels(photo,width,height), z=imagePixels(depth,width,height);
  const [cx,cy]=C.MASK.CROP_CENTER;
  const lum=new Float32Array(width*height);
  for (let k=0;k<lum.length;k++) lum[k]=(.2126*rgb[k*4]+.7152*rgb[k*4+1]+.0722*rgb[k*4+2])/255;
  const depthAt=(u,v)=>z[(Math.round(v*(height-1))*width+Math.round(u*(width-1)))*4]/255;
  const local=(u,v,value=depthAt(u,v))=>new T.Vector3(
    (u-cx)*aspect/C.MASK.IMAGE_HEIGHT,(cy-v)/C.MASK.IMAGE_HEIGHT,(value-depthAt(cx,cy))*C.DEPTH_SCALE
  );
  const rng=randomSequence(4128);
  const gold=new T.Color(C.COLORS.GOLD), cream=new T.Color(C.COLORS.PALE_GOLD);
  const white=new T.Color(C.COLORS.WHITE), reject=new T.Color(C.COLORS.REJECTED);
  const accepted=[], rejected=[];
  for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
    const k=y*width+x, l=lum[k], value=z[k*4]/255, u=x/(width-1), v=y/(height-1);
    const rim=boundary(u,v,C.MASK.BODY);
    const edge=Math.max(Math.abs(lum[k-1]-lum[k+1]),Math.abs(lum[k-width]-lum[k+width]));
    const hair=boundary(u,v,C.MASK.HAIR).inside && l>C.MASK.HAIR_LUMA && edge>C.MASK.HAIR_EDGE;
    const contour=rim.nearest<C.MASK.EDGE_WIDTH;
    const inDepth=value>=C.MASK.DEPTH_RANGE[0] && value<=C.MASK.DEPTH_RANGE[1];
    const enclosed=rim.inside && (inDepth || (contour && l>C.MASK.EDGE_LIGHT));
    if (!enclosed && !hair) {
      if (C.MASK.SHOW_REJECTED && rng()<.035) rejected.push({p:local(u,v,value), color:reject,size:2, energy:.48,shape:3,seed:rng()});
      continue;
    }
    const highlights=Math.pow(T.MathUtils.smoothstep(l,C.LUMA_THRESHOLD,1),C.PORTRAIT.HIGHLIGHT_POWER);
    const edgeLight=Math.min(1,edge*C.EDGE_BOOST);
    const density=C.PORTRAIT.DARK_DENSITY+C.PORTRAIT.HIGHLIGHT_DENSITY*highlights+
      (contour?C.PORTRAIT.CONTOUR_DENSITY:0)+edgeLight+(hair?.45:0);
    if (rng()>density) continue;
    const p=local(u,v,value), seed=rng();
    const color=gold.clone().lerp(cream,Math.min(1,l*.74+rgb[k*4+2]/510)).lerp(white,highlights*.65);
    const bottom=1-T.MathUtils.smoothstep(v,1-C.PORTRAIT.BOTTOM_FADE,1);
    const energy=(C.PORTRAIT.DARK_EMISSION+C.PORTRAIT.LIGHT_EMISSION*highlights+
      (contour?C.PORTRAIT.EDGE_EMISSION:0)+edgeLight*.56)*bottom;
    const shape=highlights>.38 && seed<C.PORTRAIT.SPARK_CHANCE ? (seed<.01?4:1) : 0;
    const size=C.PORTRAIT.BASE_SIZE+C.PORTRAIT.HIGHLIGHT_SIZE*highlights+(shape?4:0);
    accepted.push({p,color,size,energy,shape,seed});
    if (hair && seed<C.PORTRAIT.HAIR_TRAIL_CHANCE) for (let i=1;i<=C.PORTRAIT.HAIR_BEADS;i++) {
      const tail=p.clone();
      tail.x-=i*C.PORTRAIT.HAIR_SPACING;
      tail.y+=i*C.PORTRAIT.HAIR_SPACING*(seed-.19);
      accepted.push({p:tail,color,size:size*.62,energy:energy*(1-i/(C.PORTRAIT.HAIR_BEADS+1)),shape:0,seed});
    }
  }
  for (let i=accepted.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [accepted[i],accepted[j]]=[accepted[j],accepted[i]];
  }
  const debugCount=Math.min(rejected.length,Math.floor(capacity*.2));
  const portraitCount=Math.min(capacity-debugCount,Math.round(accepted.length*T.MathUtils.clamp(C.POINT_DENSITY,0,1)));
  const samples=accepted.slice(0,portraitCount);
  for(let i=0;i<debugCount;i++) samples.splice(Math.floor(i*samples.length/debugCount),0,rejected[i]);
  const cloud=particleCloud(samples.length,{
    drift:C.PORTRAIT.POINT_DRIFT, pulse:C.PORTRAIT.PULSE, rate:C.PORTRAIT.PULSE_RATE
  });
  samples.forEach(({p,color,size,energy,shape,seed},i)=>cloud.write(i,p.x,p.y,p.z,color,size,energy,shape,seed));
  cloud.flush();
  return {cloud,count:samples.length,local,width:aspect*(C.PORTRAIT.HIT_BOUNDS[2]-C.PORTRAIT.HIT_BOUNDS[0])/C.MASK.IMAGE_HEIGHT};
}
