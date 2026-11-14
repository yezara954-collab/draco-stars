// crane_geometry.js — 程序化千纸鹤几何数据（折面风格，无需任何模型文件）
// 坐标系：x 向前（鸟喙方向），y 向上，z 向左右两侧。整只鹤长约 4 个单位，缩放用 CRANE_SCALE。
// 用法：const crane = createCrane(THREE, materialFactory); scene.add(crane.group); 每帧调用 crane.setWingAngle(度数)。
// 翅膀角度：0 = 水平展开，+60 = 向上高举，-30 = 向下压。建议扇动范围 -25 到 +55。
// 材质请用 DoubleSide（双面）；折面明暗靠光照或 fresnel 区分。

export const CRANE_SCALE = 1.0;

// 身体、脖子、头、尾巴（每项是一个三角形，世界坐标）
export const BODY_TRIANGLES = [[[0.95, 0.18, 0], [0, 0.5, 0], [0.02, 0.12, 0.22]], [[0.95, 0.18, 0], [0.02, 0.12, -0.22], [0, 0.5, 0]], [[-0.95, 0.18, 0], [0.02, 0.12, 0.22], [0, 0.5, 0]], [[-0.95, 0.18, 0], [0, 0.5, 0], [0.02, 0.12, -0.22]], [[0.95, 0.18, 0], [0.02, 0.12, 0.22], [0, -0.3, 0]], [[0.95, 0.18, 0], [0, -0.3, 0], [0.02, 0.12, -0.22]], [[-0.95, 0.18, 0], [0, -0.3, 0], [0.02, 0.12, 0.22]], [[-0.95, 0.18, 0], [0.02, 0.12, -0.22], [0, -0.3, 0]], [[0.9, 0.22, 0.08], [0.96, 0.02, 0], [1.7, 1.12, 0]], [[0.96, 0.02, 0], [0.9, 0.22, -0.08], [1.7, 1.12, 0]], [[0.9, 0.22, -0.08], [0.9, 0.22, 0.08], [1.7, 1.12, 0]], [[0.9, 0.22, 0.08], [0.9, 0.22, -0.08], [0.96, 0.02, 0]], [[1.7, 1.12, 0], [1.72, 1.13, 0.05], [2.12, 0.98, 0.0]], [[1.72, 1.13, 0.05], [1.68, 1.18, 0.0], [2.12, 0.98, 0.0]], [[1.68, 1.18, 0.0], [1.72, 1.13, -0.05], [2.12, 0.98, 0.0]], [[1.72, 1.13, -0.05], [1.7, 1.12, 0], [2.12, 0.98, 0.0]], [[1.7, 1.12, 0], [1.72, 1.13, -0.05], [1.68, 1.18, 0.0]], [[1.7, 1.12, 0], [1.68, 1.18, 0.0], [1.72, 1.13, 0.05]], [[-0.9, 0.22, 0.08], [-0.96, 0.02, 0], [-1.85, 1.0, 0]], [[-0.96, 0.02, 0], [-0.9, 0.22, -0.08], [-1.85, 1.0, 0]], [[-0.9, 0.22, -0.08], [-0.9, 0.22, 0.08], [-1.85, 1.0, 0]], [[-0.9, 0.22, 0.08], [-0.9, 0.22, -0.08], [-0.96, 0.02, 0]]];

// 左翅（z 为正侧）三角形，坐标相对于铰链点 WING_PIVOT。右翅由 z 取反镜像得到。
export const WING_PIVOT = [0.0, 0.5, 0.06];
export const WING_TRIANGLES_LEFT = [[[0.45, 0.0, 0.0], [0.05, 0.14, 0.79], [-0.55, 0.06, 0.84]], [[0.05, 0.14, 0.79], [-0.55, 0.05, 1.74], [-0.55, 0.06, 0.84]], [[-0.55, 0.06, 0.84], [-0.55, 0.05, 1.74], [-0.65, 0.0, 0.0]], [[0.45, 0.0, 0.0], [-0.55, 0.06, 0.84], [-0.65, 0.0, 0.0]]];

function toGeometry(THREE, tris, mirrorZ = false) {
  const pos = [];
  for (const t of tris) {
    const pts = mirrorZ ? [t[0], t[2], t[1]] : t; // 镜像后调换顶点顺序，保持面朝向
    for (const p of pts) pos.push(p[0], p[1], mirrorZ ? -p[2] : p[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); // 非索引几何，法线按面计算，得到折面感
  return g;
}

// materialFactory(part) 由你提供，part 为 'body' 或 'wing'，返回对应材质。
// 返回 { group, setWingAngle, ... }：翅膀 Mesh 已放进各自的铰链 pivot 里。
export function createCrane(THREE, materialFactory) {
  const group = new THREE.Group();
  const bodyGeometry = toGeometry(THREE, BODY_TRIANGLES);
  const wingLeftGeometry = toGeometry(THREE, WING_TRIANGLES_LEFT);
  const wingRightGeometry = toGeometry(THREE, WING_TRIANGLES_LEFT, true);

  group.add(new THREE.Mesh(bodyGeometry, materialFactory('body')));

  const wingLeftPivot = new THREE.Group();
  wingLeftPivot.position.set(WING_PIVOT[0], WING_PIVOT[1], WING_PIVOT[2]);
  wingLeftPivot.add(new THREE.Mesh(wingLeftGeometry, materialFactory('wing')));
  const wingRightPivot = new THREE.Group();
  wingRightPivot.position.set(WING_PIVOT[0], WING_PIVOT[1], -WING_PIVOT[2]);
  wingRightPivot.add(new THREE.Mesh(wingRightGeometry, materialFactory('wing')));
  group.add(wingLeftPivot, wingRightPivot);

  group.scale.setScalar(CRANE_SCALE);

  // 绕 x 轴旋转：左翅 -θ、右翅 +θ，翅尖同时上抬
  function setWingAngle(deg) {
    const a = THREE.MathUtils.degToRad(deg);
    wingLeftPivot.rotation.x = -a;
    wingRightPivot.rotation.x = a;
  }
  setWingAngle(20);

  return { group, bodyGeometry, wingLeftGeometry, wingRightGeometry, wingLeftPivot, wingRightPivot, setWingAngle };
}
