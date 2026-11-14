import * as T from 'three';
import * as C from './config.js';

export function particleCloud(capacity, { drift = 0, pulse = 0, rate = 1, depthTest = false } = {}) {
  const data = {
    position: new T.BufferAttribute(new Float32Array(capacity * 3), 3),
    tint: new T.BufferAttribute(new Float32Array(capacity * 3), 3),
    style: new T.BufferAttribute(new Float32Array(capacity * 4), 4)
  };
  const geometry = new T.BufferGeometry();
  for (const [key, attribute] of Object.entries(data)) {
    geometry.setAttribute(key, attribute.setUsage(T.DynamicDrawUsage));
  }
  const uniforms = {
    clock: { value: 0 }, dpr: { value: 1 }, drift: { value: drift },
    pulse: { value: pulse }, rate: { value: rate }, chroma: { value: C.RENDER.CHROMATIC_OFFSET }
  };
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest, blending: T.AdditiveBlending,
    vertexShader: `
      uniform float clock,dpr,drift,pulse,rate;
      attribute vec3 tint;
      attribute vec4 style;
      varying vec3 rgb;
      varying vec4 mark;
      void main(){
        vec3 p=position;
        float phase=style.w*37.;
        p+=drift*vec3(sin(clock*1.1+phase),cos(clock*.81+phase),sin(clock*.63+phase));
        vec4 view=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*view;
        float size=style.x*clamp(9./max(.1,-view.z),.55,1.65);
        gl_PointSize=max(1.,size*dpr);
        rgb=tint*style.y*(1.+pulse*sin(clock*rate+phase));
        mark=vec4(style.z,style.w,size,0.);
      }`,
    fragmentShader: `
      uniform float chroma;
      varying vec3 rgb;
      varying vec4 mark;
      float mask(vec2 p){
        float r=length(p);
        if(mark.x<.5) return 1.-smoothstep(.08,.90,r);
        if(mark.x<1.5){
          float a=pow(abs(p.x),.56)+pow(abs(p.y),.56);
          return 1.-smoothstep(.65,1.02,a);
        }
        if(mark.x<2.5){
          float a=atan(p.y,p.x)+mark.y*6.283;
          float edge=.55+.28*cos(a*5.);
          return 1.-smoothstep(edge-.11,edge+.04,r);
        }
        if(mark.x<3.5) return 1.-smoothstep(.49,.71,max(abs(p.x),abs(p.y)));
        float cross= min(max(abs(p.x)*8.,abs(p.y)),max(abs(p.y)*8.,abs(p.x)));
        return 1.-smoothstep(.20,.96,cross);
      }
      void main(){
        vec2 p=gl_PointCoord*2.-1.;
        float core=mask(p);
        float shift=min(.32,2.*chroma/max(1.,mark.z)) *
          step(.5,mark.x)*smoothstep(.75,2.,max(rgb.r,max(rgb.g,rgb.b)));
        vec3 shape=vec3(mask(p-vec2(shift,0.)),core,mask(p+vec2(shift,0.)));
        gl_FragColor=vec4(rgb*mix(vec3(core),shape,.45),1.);
      }`
  });
  const points = new T.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points, uniforms, geometry,
    write(i,x,y,z,color,size,emission,shape,seed) {
      data.position.setXYZ(i,x,y,z);
      data.tint.setXYZ(i,color.r,color.g,color.b);
      data.style.setXYZW(i,size,emission,shape,seed);
    },
    flush() { for (const a of Object.values(data)) a.needsUpdate = true; }
  };
}

export function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
