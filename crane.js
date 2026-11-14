import * as T from 'three';
import * as C from './config.js';
import { createCrane } from './crane_geometry.js';
import { particleCloud, randomSequence } from './particles.js';

export function makeCrane(starCount) {
  const fade={value:0};
  function materialFactory(part) {
    return new T.ShaderMaterial({
      transparent:true, depthWrite:false, side:T.DoubleSide,
      uniforms:{
        fade, tint:{value:new T.Color(C.COLORS.PAPER)},
        opacityRange:{value:new T.Vector2(...C.CRANE_OPACITY)},
        facetStrength:{value:part==='wing'?.19:.26}
      },
      vertexShader:`
        varying vec3 viewNormal,eye;
        void main(){
          vec4 view=modelViewMatrix*vec4(position,1.);
          viewNormal=normalize(normalMatrix*normal);
          eye=-view.xyz;
          gl_Position=projectionMatrix*view;
        }`,
      fragmentShader:`
        uniform float fade,facetStrength;
        uniform vec3 tint;
        uniform vec2 opacityRange;
        varying vec3 viewNormal,eye;
        void main(){
          vec3 n=normalize(viewNormal);
          float grazing=1.-abs(dot(n,normalize(eye)));
          float facet=abs(dot(n,normalize(vec3(-.45,.71,.55))));
          float fresnel=pow(grazing,1.65);
          float alpha=mix(opacityRange.x,opacityRange.y,clamp(.82*fresnel+.18*facet,0.,1.));
          gl_FragColor=vec4(tint*(.48+facet*facetStrength+.38*fresnel),alpha*fade);
        }`
    });
  }

  const {group, setWingAngle, wingLeftPivot, wingRightPivot}=createCrane(T,materialFactory);
  const edge=new T.LineBasicMaterial({
    color:new T.Color(C.COLORS.PAPER_EDGE).multiplyScalar(C.CRANE_EDGE_GLOW),
    transparent:true, opacity:0, depthWrite:false
  });
  const faces=[];
  for(const mesh of [group.children[0],wingLeftPivot.children[0],wingRightPivot.children[0]]){
    // 每个折面的聚合目标使用原始几何，并跟随当前翅膀的铰链变换。
    const line=new T.LineSegments(new T.EdgesGeometry(mesh.geometry,C.CRANE.EDGE_THRESHOLD),edge);
    line.renderOrder=4;
    mesh.add(line);
    mesh.renderOrder=3;
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i+=3){
      const vertices=[0,1,2].map(offset=>new T.Vector3().fromBufferAttribute(positions,i+offset));
      faces.push({mesh,vertices});
    }
  }

  const stars=particleCloud(starCount,{depthTest:true});
  stars.points.renderOrder=2;
  group.add(stars.points);
  const rng=randomSequence(2317);
  const colors=[new T.Color(C.COLORS.WHITE),new T.Color(C.COLORS.PALE_GOLD)];
  const seeds=Array.from({length:starCount},()=>[rng(),rng(),rng(),rng()]);
  const mix=T.MathUtils.lerp;
  return {
    group,faces,stars,
    alpha(value){
      group.visible=value>0;
      fade.value=value;
      edge.opacity=value*C.CRANE.EDGE_OPACITY;
    },
    pose(time,motion,paper){
      const wave=.5+.5*Math.sin(time*C.WING_FLAP_SPEED)*motion*paper;
      setWingAngle(mix(C.WING_ANGLE_MIN,C.WING_ANGLE_MAX,wave));
      group.rotation.set(...C.CRANE.ANGLES);
      if(paper<=0) return;
      const flow=time*C.CRANE.STAR_SPEED*motion;
      seeds.forEach(([phase,a,b,c],i)=>{
        // 轨迹留在身体的折面之间。
        const x=.62*Math.sin(flow*(.7+a*.6)+phase*2*Math.PI);
        const room=1-Math.abs(x)/.95;
        const y=.18+room*.21*(b-.5)+room*.045*Math.cos(flow+phase*6.28);
        const z=room*.16*(c-.5)*Math.cos(flow*.67+phase*6.28);
        const energy=mix(...C.CRANE.STAR_BRIGHTNESS,b)*paper;
        stars.write(i,x,y,z,colors[i%2],mix(...C.CRANE.STAR_SIZE,c),energy,i%9===0?1:0,phase);
      });
      stars.flush();
    }
  };
}
