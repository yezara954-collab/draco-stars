# Draco Malfoy 星空互动 · 阶段 1

解压后在项目目录运行 `python3 -m http.server 8000`，打开 [本地页面](http://localhost:8000)。点击或轻触右侧人物，也可以用 Tab 聚焦后按 Enter。吹气在 0–2.5 秒发生，粒子在 2.5–4.5 秒收拢为折纸鹤。阶段 1 的纸鹤留在成形位置轻扇翅膀。刷新可再次检查完整序列。

把解压后的文件放在 GitHub Pages 的发布目录根部即可。页面需要支持 WebGL 2 的浏览器和可访问 jsDelivr 的网络。Three.js 固定为 0.170.0，通过 importmap 加载，运行时无需构建。

## 调试

- `config.js` 集中保存场景参数与中文注释。编辑后刷新页面。
- `DEBUG_START_STATE` 可设为 0（待机）、1（自动开始吹气）、2（自动从聚鹤开始）。
- `MOUTH_POS` 是原图 UV，原点在左上角。胶片照片的轮廓可用 `MASK.BODY`、`MASK.HAIR` 调整。打开 `MASK.SHOW_REJECTED` 会用粉色采样点标记被过滤的区域。
- `DRACO_POSITION`、`DRACO_SCALE` 和 `LAYOUT` 分别配置横屏与竖屏。
- 查看页面 `#stage` 的 `data-state`、`data-quality` 和 `data-fps` 可检查状态、质量档位及采样帧率。
- 触屏设备如支持设备方向事件，可以用右下角按钮启用体感。开启系统减少动态效果后，点击会快速切换为已折好的纸鹤。

## 素材

- `assets/draco_ref.jpg` 由上传的 09.png 转存，保持 1536 × 1024 尺寸、构图和内容。
- `assets/draco_depth.png` 来自 Depth Anything V2 Small 的 ONNX UINT8 模型本地推理。输入为原图，归一化为 8 位相对逆深度，亮处更近，输出与原图对齐。
- 纸鹤由 16 个三角面组成，折面光照与发光轮廓独立绘制。
