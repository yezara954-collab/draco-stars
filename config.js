// 先调布局、遮罩和嘴的位置，再调粒子亮度与辉光。坐标为原图 UV（左上角为 0,0）。
export const DEBUG_START_STATE = 0; // 0 待机，1 吹气，2 聚成千纸鹤；3–7 预留给后续阶段
export const BG_COLOR = '#000000';
export const COLORS = {
  WHITE: '#FFFFFF', GOLD: '#FFD66B', PALE_GOLD: '#FFE9A8',
  PINK: '#FF9EC4', CYAN: '#7FF0FF', MINT: '#6BFFC1',
  PALE_MINT: '#B6FFD9', DARK_MINT: '#1F7A5A', REJECTED: '#FF9EC4',
  PAPER: '#FFF8EC', PAPER_EDGE: '#FFFFFF'
};
export const DRACO_POSITION = { landscape: [.72, .47], portrait: [.64, .33] }; // 画面百分比
export const DRACO_SCALE = { landscape: .76, portrait: .52 }; // 人物占可用视口的比例
export const LAYOUT = {
  landscape: { CRANE: [.32, .47], TREE: [.23, .61] },
  portrait: { CRANE: [.27, .55], TREE: [.29, .73] }
};
export const MOUTH_POS = [.526, .479];
export const MAGIC_TARGET = [.572, .389]; // 后续魔法命中位置
export const DEPTH_SCALE = .74; // 以浮雕高度为单位；灰度白端在前
export const POINT_DENSITY = .92; // 0–1，越大采样越密
export const LUMA_THRESHOLD = .16; // 明度低于此值的区域稀疏采样
export const EDGE_BOOST = 2.1;
export const MASK = {
  SHOW_REJECTED: false, // 粉色显示被筛掉的点，便于调试
  DEPTH_RANGE: [.44, .88], // 深度区间；极近的石柱和远景会被过滤
  EDGE_WIDTH: .006, // UV，暗部轮廓串珠带的宽度
  BODY: [[.324,1],[.378,.866],[.452,.642],[.503,.602],[.491,.508],[.477,.407],
    [.468,.288],[.478,.211],[.489,.17],[.564,.133],[.67,.087],[.716,.097],
    [.756,.133],[.778,.188],[.787,.339],[.801,.439],[.787,.518],[.799,.558],
    [.792,.568],[.817,.593],[.846,.602],[.879,.649],[.887,1]],
  HAIR: [[.392,.307],[.429,.259],[.481,.218],[.525,.241],[.562,.288],
    [.57,.346],[.529,.372],[.477,.38],[.417,.362]],
  HAIR_LUMA: .35, HAIR_EDGE: .065, EDGE_LIGHT: .16,
  CROP_CENTER: [.604,.542], IMAGE_HEIGHT: .91
};
export const RENDER = {
  MAX_DPR: 2, DESKTOP_LIMIT: 40000, MOBILE_LIMIT: 15000,
  DESKTOP_BUDGET: 34000, MOBILE_BUDGET: 14000,
  QUALITY: [1,.78,.60,.46], TARGET_FPS: 30, QUALITY_WINDOW: 2,
  MOBILE_WIDTH: 760, BLOOM_THRESHOLD: 1.06, BLOOM_STRENGTH: .55, BLOOM_RADIUS: .54,
  CHROMATIC_OFFSET: 1.25, // RGB 彩边的偏移量，单位 CSS 像素
  MAX_FRAME_DELTA: .1
};
export const CAMERA = {
  FOV: 37, HEIGHT: .24, DISTANCE: 9, DRIFT: [.13,.075], DRIFT_RATE: .27,
  ZOOM: .13, ZOOM_RATE: .19, PARALLAX: [.19,.12], FOLLOW: 3.5, TILT_RANGE: 24
};
export const TIMELINE = [0, 0, 2.5, 4.5, 12, 13.5, 17, 23]; // 每个状态在点击后的起点
export const PORTRAIT = {
  SAMPLE_WIDTH: 640, BASE_SIZE: 1.6, HIGHLIGHT_SIZE: 2.1,
  DARK_DENSITY: .10, CONTOUR_DENSITY: .54, HIGHLIGHT_DENSITY: 1.45,
  HIGHLIGHT_POWER: 1.42, DARK_EMISSION: .22, EDGE_EMISSION: .44, LIGHT_EMISSION: 2.7,
  SPARK_CHANCE: .035, ROLL_DEGREES: 1.5, SWAY_DEGREES: 15, SWAY_RATE: .38,
  POINT_DRIFT: .0055, PULSE: .12, PULSE_RATE: 1.15,
  HAIR_TRAIL_CHANCE: .29, HAIR_BEADS: 3, HAIR_SPACING: .008,
  BOTTOM_FADE: .11, HIT_BOUNDS: [.38,.08,.885,1]
};
export const SKY = {
  COUNT: 330, SPREAD: [27,20,17], Z_CENTER: -10, SIZE: [1.3,4.0],
  BRIGHTNESS: [.07,.45], SPARK_CHANCE: .025
};
// 吹气粒子总数，包含串珠拖尾。原版共 1792 粒。
export const BREATH_COUNT = 448;
export const BREATH_SPREAD = [.12,.19,.17]; // 气流沿 x/y/z 的扩散幅度
export const BREATH_LENGTH = 2/3; // 吹气向左推进的距离比例，纸鹤的成形位置另由 LAYOUT 控制
export const BREATH_SIZE = .82; // 粒径倍率
export const BREATH_BRIGHTNESS = .78; // 粒子亮度倍率
export const BREATH = {
  STREAMS: 14, BEADS: 9, BEAD_DELAY: .016,
  EMIT_DURATION: 1.55, TRAVEL: .92,
  CURVE: [[0,0,0],[.27,.06,.05],[.73,.08,.16],[1,0,0]], // X 为从嘴到气流终点的比例，Y/Z 为偏移
  GATHER_WIDTH: .50, FLASH: .64, REDUCED_DURATION: .3,
  POINT_SIZE: [2,8], SPARK_SIZE: 12, LUMINANCE: [1.25,3.2]
};

// 纸鹤材质的基础透明度范围。面朝镜头较透，掠射角更亮。
export const CRANE_OPACITY = [.25,.55];
export const CRANE_EDGE_GLOW = 2.15; // 白色折痕的 HDR 亮度
export const CRANE_SCALE = {landscape: .092, portrait: .127}; // 模型尺寸相对于视口短边
export const WING_FLAP_SPEED = 8.6; // 正弦相位推进，弧度/秒
export const WING_ANGLE_MIN = -25; // 翅膀最低角度，单位为度
export const WING_ANGLE_MAX = 55; // 翅膀最高角度，单位为度
export const CRANE = {
  ANGLES: [.42,.62,-.14], HOVER: .10, HOVER_RATE: 2.2,
  EDGE_OPACITY: .76, EDGE_THRESHOLD: 6, STAR_COUNT: 28,
  STAR_SPEED: .72, STAR_SIZE: [1.3,2.8], STAR_BRIGHTNESS: [.70,1.55],
  FORM_VISIBLE_AT: .62, FORM_INITIAL_SCALE: .72
};

// 布料风效。幅度以人物浮雕高度为单位，正方向是画面右侧。
export const WIND_STRENGTH = .031;
export const WIND_WAVE_SPEED = 1.45; // 正弦相位推进，弧度/秒
export const WIND_TRAIL_LENGTH = .036; // 右向拖尾最大长度
export const WIND = {
  HOOD_BACK_START: .68, SHOULDER_START: .58, EDGE_WIDTH: .055, // UV
  TRAIL_COUNT: 3, TRAIL_CHANCE: .32
};
