# 编辑工作追踪系统

教材编辑个人工作追踪工具：选题全流程（策划→营销 13 个节点）管理、工作成果看板、进度预警、个人档案。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `编辑工作追踪系统.html` | 系统本体，单文件 HTML，浏览器打开即用 |
| `app/index.html` | 打包用副本（与上方同步） |
| `app/main.js` | Electron 主进程入口 |
| `app/package.json` | Electron 打包配置（electron-builder） |

## 使用方式

- **浏览器版**：直接双击 `编辑工作追踪系统.html`
- **桌面版**：用 Electron 打包为便携 exe（见下），数据存本机 localStorage，支持导出 / 导入 JSON 备份

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
