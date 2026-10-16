# 编辑工作追踪系统 · 交接文档（HANDOFF）

> 用途：新开对话时，把这份文档作为起点，即可无缝继续迭代本系统。
> 生成时间：2026-10-13 ｜ 当前版本：**v2** ｜ 主文件：`编辑工作追踪系统.html`

---

## 0. 新会话如何快速上手（先读这段）

1. 工作目录：`C:\Users\Lenovo\WorkBuddy\2026-10-08-22-46-35\`
2. 主文件：`编辑工作追踪系统.html`（单文件，HTML+CSS+JS 全内联，浏览器双击即可运行）
3. 开场可直接对新会话说：

   > 继续迭代「编辑工作追踪系统」，先读工作目录下的 HANDOFF.md 和 .workbuddy/memory/ 最新日志，再按我的意见改。

4. 铁律（用户反复强调）：
   - **默认只改 HTML，不动 exe**，除非明确说「重新打包 exe」
   - 改完**必须跑测试**：`node tests/系统测试用例.js`
   - 用户偏好**截图 + 编号意见**，逐条对应汇报，不整段重写

---

## 1. 项目是什么

教材编辑（用户本人）的个人工作追踪工具。纯本地、无服务器、数据存 localStorage。

**四大页面**（导航顺序即默认落地页顺序）：

| 页面 | 作用 |
| --- | --- |
| 每日 to-do | 日/周/月三视图任务管理（v2 新增，当前迭代重心） |
| 选题执行看板 | 选题全流程 13 节点管理、进度预警、推进节点 |
| 工作成果看板 | 发稿/出版/策划等指标、时间范围筛选、流程统计 |
| 个人档案 | 基本信息、数据备份（导出/导入/清空） |

---

## 2. 文件与产物地图

| 路径 | 说明 |
| --- | --- |
| `编辑工作追踪系统.html` | **系统本体**，唯一真源，所有迭代改这里（当前 1732 行 / 约 83 KB） |
| `编辑工作追踪系统.exe` | 便携版桌面程序（74 MB，v2，Electron 打包） |
| `app/index.html` | 打包用副本，**必须与主 HTML 同步**后再打包 |
| `app/main.js` | Electron 主进程入口 |
| `app/package.json` | 打包配置（version 2.0.0，productName=EditTracker） |
| `app/dist/EditTracker-Portable.exe` | 打包中间产物 |
| `tests/系统测试用例.js` | **自动化测试套件**（node 直接跑，131 项断言） |
| `README.md` | 仓库说明（已更新到 v2） |
| `.workbuddy/memory/*.md` | 逐日工作日志（**重要：含全部历史决策与踩坑记录**） |
| `.workbuddy/push_v2.py` | GitHub 推送脚本（复用，令牌从环境变量读，不落盘） |
| GitHub 仓库 | https://github.com/bookren830/edit-tracker （公开，main 分支） |

> ⚠️ `.gitignore` 已忽略：`node_modules/`、`app/dist/`、`*.exe`、`.workbuddy/`、`app/package-lock.json`。exe 和 workbuddy 日志不进仓库。

---

## 3. 当前版本状态（v2，四产物已对齐）

| 产物 | 状态 |
| --- | --- |
| 浏览器版 HTML | ✅ v2 |
| 桌面 exe | ✅ v2（2026-10-12 重新打包，冒烟测试通过） |
| GitHub 仓库 | ✅ v2 已推送（提交 `v2: 每日to-do模块 + 推进节点 + 备份schema版本号 + 未保存提醒`） |
| 测试套件 | ✅ 131 项断言全过 |

**数据兼容**：新旧 exe 的 `productName` 未变，userData 目录沿用，用户 old exe 里的 localStorage 数据自动保留，无需迁移。

---

## 4. 代码地图（改代码前先看这里）

### 4.1 存储键（localStorage）

- `wb_edittrack_topics` — 选题数组
- `wb_edittrack_plans` — 发稿计划
- `wb_edittrack_profile` — 个人信息
- `wb_edittrack_todos` — to-do 数组

导出/导入/清空均覆盖这四个键；导出 JSON 额外带 `schemaVersion`。

### 4.2 关键常量

- `SCHEMA_VERSION = 2` — 备份 schema 版本
- `CAL_MAX_TASKS = 2` — 月视图每格最多显示任务数（超出折叠「还有 n 项 ›」）
- `NODES` — 13 节点数组：策划 → … → 营销
  - `NODE_BIANJIA = 3`（编辑加工）、`NODE_FAGAO = 6`（发稿）、`NODE_YINGXIAO = 12`（营销）

### 4.3 函数分组（约 75 个）

**数据层**：`loadAll / saveTopics / savePlans / saveProfile / saveTodos / exportJSON / importJSON / migrateBackup / clearAllData`

**选题与看板**：`refreshAll / renderTopicGrid / topicTableHtml / renderKanbanViewSeg / setKanbanView / openTopicModal / saveTopicForm / advanceNode / doAdvanceNode / deleteTopic / renderMetrics / renderFlowStats / renderKanbanTabs / warnList / stageOf / avgPublishDays / gotoStage / gotoWarnings`
（看板有卡片/表格两视图，`state.kanbanView` 切换，默认 card；表格视图十列见 2026-10-16 日志）

**预警**：`warnList`（三口径：总流程>240 天从初审起算、单节点停留>60 天（策划同 60）、编写>180 天；仅未出版选题）

**to-do 核心**：`newTodo / todoAnchor / navTodo / navTodoToday / todoPeriodLabel / weekDates / monthCells / dayBuckets / todoPeriodSet / overdueTodos / nodeOptionsFor / topicTodos / currentNodePending / toggleTodo / topicTagHtml / trunc`

**to-do 渲染**：`renderTodoPage / renderTodoTabs / renderTodoNav / pnavHtml / renderTodoStats / todoRowHtml / renderDayView / renderWeekView / calTodoHtml / gotoDay / renderMonthView / openTodoModal / saveTodoForm / deleteTodo / openTopicTodos / openTodoModalFromRel / toggleTodoRel`

**弹窗守卫**：`snapModalForm / closeGuarded / closeTopicModal / closeTodoModal / closeModal`
（快照机制：打开弹窗时对 `.modal-body` 内全部 input/select/textarea 取值存快照，关闭时比对，有差异则 confirm 拦截）

### 4.4 弹窗统一骨架（三段式）

```html
.modal-head     标题 + 右上角 ×（唯一关闭入口）
.modal-body     滚动区
.modal-actions  吸底按钮栏（按需；提醒记录/关联to-do 弹窗已无此栏）
```

点击遮罩**不关闭**（已删除该逻辑）。

### 4.5 设计规范（用户明确口径，勿擅改）

- **状态色系统**：紫 `--line` = 品牌色（主按钮 / 选中态 / 完成率）；绿 = 已完成；红 = 已逾期；青 `--cyan` = 进行中。
  不加状态标签，颜色落在分区标题、复选框、状态框（`.wk-st` / `.cal-st`）上。
- **状态框三态**：未完成 = 青空框；逾期 = 红空框；已完成 = 绿底 + CSS 白勾（纯 CSS 绘制，无 emoji，无图标字体）。
- **布局**：统计卡四列横排，任务列表整宽自然延伸至页底（`.todo-panel` flex:1），避免底部空洞。
- **翻页组件**：`‹ 今天 ›` —— ‹/› 翻周期，「今天」回当前周期（偏移=0 时置灰）。位于任务列表卡片头右上角，三视图统一。
- **折叠/省略**：周视图 to-do 两行（`-webkit-line-clamp:2`），长文本包 `.wk-txt` 子元素才能出省略号（flex 下裸文本不触发）；月格超出 `CAL_MAX_TASKS` 折叠为「还有 n 项 ›」。
- **文字禁忌**：不使用半角引号、破折号仅用于标题、不使用生僻词与口语化表达；列表层级用全角括号。

---

## 5. 标准工作流

### 5.1 改 HTML（每次迭代）

1. 用 Grep/Read 摸清相关代码
2. 用 Edit 精确局部修改（**不要整段重写**）
3. 跑测试：`node tests/系统测试用例.js`，全绿才交付
4. 同步副本：`cp 编辑工作追踪系统.html app/index.html`
5. 写日志：追加到 `.workbuddy/memory/YYYY-MM-DD.md`
6. 交付：用 present_files 展示 HTML

### 5.2 运行测试

```bash
"C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-6/node.exe" tests/系统测试用例.js
```

> 测试原理：Node 读取 HTML → 正则提取内联 `<script>` → stub 出 localStorage / document / confirm / Blob / FileReader → `eval` 源码 → 跑断言。
> **坑**：eval 的源码块里**不能有 `'use strict'`**，否则函数声明不外泄，测试拿不到被测函数。

测试分 7 组：A 工具函数 / B 选题与预警 / C to-do 逻辑 / D 渲染结构 / E 数据安全 / F v2 新功能 / G 弹窗守卫。

### 5.3 推送 GitHub

```bash
# github.com 直连被沙箱拦，但 api.github.com 通，走 REST Contents API
GITHUB_TOKEN="<fine-grained PAT>" \
  "C:/Users/Lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe" .workbuddy/push_v2.py
```

- 需要一个 fine-grained PAT（仅需 edit-tracker 仓库 Contents 读写权限），**用户每次在对话中临时提供，用完即弃、不落盘**
- 推送前确认 `app/index.html` 已与主 HTML 同步
- 脚本内 `FILES` 与 `MESSAGE` 需按本次内容更新

### 5.4 重新打包 exe（仅在用户明确要求时）

```bash
cd app
# 第一步：重建免压缩目录（沙箱自动放行）
npx electron-builder --dir
# 第二步：压缩为便携 exe（必须关沙箱，约 2 分钟）
npx electron-builder --prepackaged dist/win-unpacked --win portable
```

- 打包前把 `app/package.json` 的 `version` 递增，并确认 `app/index.html` 已同步
- 产物：`app/dist/EditTracker-Portable.exe`（74 MB）→ `cp` 覆盖工作目录 `编辑工作追踪系统.exe`
- 包内校验：用 `@electron/asar` 的 **node API**（`asar.extractFile`）确认 index.html 含新功能标记 —— `npx asar extract-file` CLI 在本机会静默失败写不出文件
- 冒烟测试：`env -u ELECTRON_RUN_AS_NODE ./编辑工作追踪系统.exe`（**必须剔除 `ELECTRON_RUN_AS_NODE` 环境变量**，否则 Electron 被当 Node 跑、进程不启动），25 秒后应有 4 个进程稳定运行

---

## 6. 历史踩坑记录（省时间用）

| 坑 | 症状 | 解法 |
| --- | --- | --- |
| Electron zip 缓存损坏 | 打包报解压失败 | 删除缓存重下 |
| winCodeSign 解压失败 | 打包中断 | 手动预置缓存目录 |
| `ELECTRON_RUN_AS_NODE` | exe 启动即退、冒烟误判 | `env -u ELECTRON_RUN_AS_NODE` 后再启动 |
| 压缩 exe 卡死 | 沙箱下 5.5 小时不动 | 第二步必须 `dangerouslyDisableSandbox` |
| github.com 不通 | git push 被拦 | 改用 api.github.com + REST API |
| 连接器无写权限 | 建仓/推送失败 | 用户网页建仓 + 临时 PAT |
| flex 不出省略号 | 长文本被裁无「...」 | 文本包 `.wk-txt` 子元素 |
| grid 栏被撑破 | 周视图某栏超宽 | `minmax(0,1fr)` + `.wk-col{min-width:0}` |
| 月视图空行 | 表头行被撑成 134px | 表头拆为独立 `.cal-dow-row`，首格 `grid-column-start` 对齐 |
| eval 严格模式 | 测试取不到函数 | 源码块内禁用 `'use strict'` |
| npx asar CLI 静默失败 | 校验文件写不出 | 改用 node API |
| 网络下载慢 | 依赖装不动 | 用 npmmirror 镜像（`ELECTRON_MIRROR` 等） |

---

## 7. 环境信息

- 系统：Windows（联想），shell 为 Git Bash
- Python：`C:\Users\Lenovo\.workbuddy\binaries\python\versions\3.13.12\python.exe`
- Node：`C:\Users\Lenovo\.workbuddy\binaries\node\versions\22.22.2-6\node.exe`
- 浏览器自动化：**未安装** agent-browser / Playwright（自检视觉效果目前靠人工或代码核对）
- 网络：直连 GitHub 受限，api.github.com 可用；下载走 npmmirror 镜像

---

## 8. 待办与已知优化项（可直接挑来迭代）

### 8.1 此前评估提出、尚未落地

**P0 数据安全与交付闭环**
- （1）**HTML 与 exe 版本可能再次分裂**：建议页脚加版本号 + 构建日期，确立单一事实源；每次迭代后决定是否同步 exe
- （2）**数据单点风险**：数据仅存本机，清缓存即丢。建议档案页加「距上次导出已 x 天，建议备份」温和提醒
- （3）备份迁移：已做 schema 版本号，可继续补更细的迁移规则

**P1 核心工作流闭环**
- （4）**预警只能看不能办**：建议加「已跟进 / 暂缓 7 天」动作，治告警疲劳
- （5）节点推进与 to-do 联动：已在 v2 部分实现（推进时拦截未完成 to-do），可继续做反向提示
- （6）「回到今天」：v2 已做 ✅
- （7）周/月就地创建：v2 已做 ✅

**P2 体验完善**
- （8）**逾期数口径易误读**：全局口径与周期内数据并列，建议加口径说明
- （9）**移动端 hover 浮窗全部失效**（备注、关联 to-do、预警三角），建议改点按
- （10）**缺周报导出**：基于周视图一键生成「本周完成/逾期/下周计划」纯文本

### 8.2 更早遗留的 8 个待确认点（部分已被覆盖）

1. 新建 to-do 弹窗无删除按钮（仅编辑时显示），是否坚持两键
2. 「逾期任务数」三视图是否改周期内口径
3. 周视图逾期只显示在原日期格（现状）是否保持
4. 翻页（已实现 ✅）
5. 月视图折叠阈值 `CAL_MAX_TASKS`（当前 2）
6. 月视图当日待完成不含历史逾期（现状，注释标明可改）
7. 选题标签按实际字数（已完整展示 6 字 ✅）
8. 移动端 hover 改点按（未做）

### 8.3 给用户的产品成长建议（PM 叙事用）

若要把本项目作为面试案例，建议补三件事：
1. 给 v2 补一个「**假设 → 指标 → 验证**」闭环（哪怕自测 7 天）
2. 用数据讲一次取舍（做了什么 / 砍了什么，各因什么指标与成本）
3. 给 3 位同事用一周，收反馈跑一轮迭代

---

## 9. 用户协作偏好（务必遵守）

- 意见形式：**截图 + 编号**，逐条修改，禁止整段重写；用户提供完整文本时须原文替换、不意译
- 汇报形式：**按编号逐条对照汇报执行情况**，标明哪些做了、哪些是口径变化
- 语言：中文；不用半角引号，破折号仅用于标题，列表用全角括号（1）（2）（3）
- 风格：**极简、克制、固定对齐**；倾向「先看整体框架，再分阶段推进」
- 迭代节奏：**默认只改 HTML**；测试必须全过才交付；exe 仅在明确要求时重打包
- 汇报要直白真实：用户能接受尖锐的功能评价，但要求**客观**

---

## 10. 一键自检清单（交付前过一遍）

- [ ] `node tests/系统测试用例.js` 全绿
- [ ] `app/index.html` 与主 HTML 同步（`cmp` 或 `cp`）
- [ ] 若动了功能，`.workbuddy/memory/今天的日期.md` 已追加日志
- [ ] 若推送 GitHub：PAT 临时提供、未落盘、推送后核对远端提交
- [ ] 若打包 exe：version 递增、asar 校验含新标记、冒烟测试通过并清理进程
- [ ] 用 present_files 展示交付物
