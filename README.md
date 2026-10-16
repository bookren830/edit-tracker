# 编辑工作追踪系统

教材编辑个人工作追踪工具：每日 to-do（日/周/月三视图）、选题全流程（策划→营销 13 个节点）管理、工作成果看板、进度预警、个人档案。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `编辑工作追踪系统.html` | 系统本体，单文件 HTML，浏览器打开即用 |
| `app/index.html` | 打包用副本（与上方同步） |
| `app/main.js` | Electron 主进程入口 |
| `app/package.json` | Electron 打包配置（electron-builder） |
| `tests/系统测试用例.js` | 自动化测试（node 直接运行，172 项断言） |

## v2.1 更新记录（2026-10-16）

- 选题执行看板新增「表格（Excel）视图」：标题右侧胶囊切换；十列固定占位折叠（选题名10字/选题号9字/书号5字/院校6字/最新提醒10字），当前节点带 to-do 铃铛，「...」下拉（关联to-do/提醒记录/删除选题）
- 周/月视图 to-do 增加「选题标签」字段展示（创建时填的 6 字标签）
- 表格交互修正：末行 hover 浮窗改 fixed 定位不再被裁剪；表头加粗放大居中；全列默认居中
- 周/月视图换行文字与标签左对齐
- 测试扩至 172 项断言

## v2 更新记录（2026-10-12）

- 新增「每日 to-do」模块：日/周/月三视图、逾期/待办/已完成三色状态、‹ › 周期翻页 + 一键回今天、周/月格子就地创建
- 选题卡片：新增「推进节点」按钮（当前节点有未完成 to-do 时弹窗提醒，可跳转查看）；删除整卡点击进编辑
- 关联 to-do 弹窗：就地创建（默认关联选题当前节点）、完成状态勾选框
- 数据备份：导出 JSON 带 schemaVersion 版本号，导入自动校验与迁移旧版备份
- 弹窗：选题 / to-do 表单未保存关闭时二次确认；关联与提醒弹窗仅保留右上角关闭
- 测试体系：`tests/系统测试用例.js` 固化 131 项断言，覆盖预警口径、to-do 逻辑、渲染结构与数据安全

## 使用方式

- **浏览器版**：直接双击 `编辑工作追踪系统.html`
- **桌面版**：用 Electron 打包为便携 exe（见下），数据存本机 localStorage，支持导出 / 导入 JSON 备份

## 运行测试

```bash
node tests/系统测试用例.js
```

## 重新打包 exe

```bash
cd app
npm install
npx electron-builder --win portable
# 产物：app/dist/EditTracker-Portable.exe
```

国内网络建议先设置镜像：

```bash
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

## 数据说明

- 数据保存在本机浏览器 / exe 的 localStorage 中，不上传任何服务器
- 浏览器版与 exe 版数据互相独立，可通过「个人档案 → 数据备份」导出 / 导入 JSON 迁移
- 备份文件带 schemaVersion 版本号，旧版备份导入时自动迁移
