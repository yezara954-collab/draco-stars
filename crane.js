import * as T from 'three';
import { COLORS, CRANE } from './config.js';

export function makeCrane() {
  const group=new T.Group();
  const body=new T.Group(), left=new T.Group(), right=new T.Group();
  group.add(body,left,right);
  const paper=new T.MeshStandardMaterial({color:COLORS.PAPER,roughness:.68,metalness:.09,
    emissive:new T.Color(COLORS.PAPER_EDGE).multiplyScalar(.085),side:T.DoubleSide,flatShading:true,transparent:true});
  const rim=new T.LineBasicMaterial({color:new T.Color(COLORS.PAPER_EDGE).multiplyScalar(CRANE.EDGE_EMISSION),
    transparent:true,opacity:0,depthWrite:false});
  const faces=[];
  const keel=[0,-.15,0], chest=[.24,.01,0], tailRoot=[-.31,.025,0], spine=[-.02,.22,0];
  const neck=[.47,.44,0], neckA=[.40,.39,.052], neckB=[.40,.39,-.052];
  const nose=[.65,.36,0], tail=[-.84,.22,0];
  function folded(parent, triangles, edges) {
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(triangles.flat(2),3));
    geo.computeVertexNormals();
    parent.add(new T.Mesh(geo,paper));
    const outline=new T.BufferGeometry().setFromPoints(edges.flat().map(v=>new T.Vector3(...v)));
    parent.add(new T.LineSegments(outline,rim));
    for(const triangle of triangles) faces.push(triangle.map(v=>new T.Vector3(...v).add(parent.position)));
  }
  for(const s of [-1,1]) {
    const flank=[-.08,.018,s*.16], n=s===1?neckA:neckB;
    folded(body,[[chest,spine,flank],[chest,flank,keel],[tailRoot,flank,spine],
      [chest,n,neck],[n,nose,neck]], [[chest,n],[n,nose],[nose,neck],[neck,chest],[spine,tailRoot]]);
    const wing=s===1?left:right;
    wing.position.z=s*.09;
    const lead=[.23,0,0], root=[-.37,0,0], tip=[-.36,.08,s*.82], crease=[-.16,-.11,s*.30];
    folded(wing,[[lead,crease,tip],[root,tip,crease]],[[lead,tip],[tip,root],[tip,crease]]);
  }
  folded(body,[[tailRoot,[ -.53,-.02,.084],tail],[tailRoot,tail,[-.53,-.02,-.084]]],
    [[tailRoot,tail],[tail,[-.53,-.02,.084]],[tail,[-.53,-.02,-.084]]]);
  const alpha=value=>{
    group.visible=value>0;
    paper.opacity=value;
    paper.depthWrite=value>.92;
    rim.opacity=value*CRANE.EDGE_OPACITY;
  };
  return {group,faces,alpha,pose(time,motion) {
    const flap=Math.sin(time*CRANE.FLAP_RATE)*CRANE.FLAP*motion;
    left.rotation.x=flap;
    right.rotation.x=-flap;
    group.rotation.set(CRANE.ANGLES[0]+.07*flap,CRANE.ANGLES[1],CRANE.ANGLES[2]);
  }};
}
