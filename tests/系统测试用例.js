/**
 * 编辑工作追踪系统 · 自动化测试用例
 * 运行方式：node tests/系统测试用例.js
 * 原理：读取 HTML 提取内联 JS，用 stub 模拟 localStorage/document 后执行断言
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '编辑工作追踪系统.html'), 'utf-8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('未找到 script 块'); process.exit(1); }

/* ---------- DOM / 浏览器环境 stub ---------- */
const __els = {};
function mkEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, setAttribute() {}, appendChild() {}, click() {},
    getAttribute() { return null; }
  };
}
const localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};
const document = {
  getElementById(id) { if (!__els[id]) __els[id] = mkEl(); return __els[id]; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return mkEl(); },
  body: { appendChild() {}, removeChild() {} }
};
const window = { addEventListener() {} };
let __confirmRet = true;
const confirm = () => __confirmRet;
const alert = () => {};
let __lastBlobJson = '';
const Blob = function (parts) { __lastBlobJson = parts && parts[0] ? String(parts[0]) : ''; };
const URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
const FileReader = function () { this.readAsText = function () {}; FileReader._last = this; };

/* ---------- 执行被测源码 ---------- */
eval(m[1]);

/* ---------- 测试框架 ---------- */
let PASS = 0, FAIL = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { PASS++; } else { FAIL++; failures.push(name); console.log('  FAIL: ' + name); }
}
function eq(a, b, name) { ok(a === b, name + '（实际 ' + JSON.stringify(a) + '，预期 ' + JSON.stringify(b) + '）'); }
function cnt(s, re) { return (s.match(re) || []).length; }
function shift(ds, n) { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return dateStrOf(d); }
function group(name) { console.log('\n■ ' + name); }

const T = todayStr();
const Y1 = shift(T, -1), Y3 = shift(T, -3), F2 = shift(T, 2);

/* ==================== A. 工具函数 ==================== */
group('A. 工具函数');
eq(daysBetween('2026-01-01', '2026-01-31'), 30, 'A1 daysBetween 基本计算');
eq(esc('<script>alert("x")&</script>'), '&lt;script&gt;alert(&quot;x&quot;)&amp;&lt;/script&gt;', 'A2 esc XSS 转义');
eq(stageOf(0), 'writing', 'A3a 阶段边界：策划=编写中');
eq(stageOf(2), 'writing', 'A3b 阶段边界：初审=编写中');
eq(stageOf(3), 'prepub', 'A3c 阶段边界：编加=发稿前');
eq(stageOf(6), 'presale', 'A3d 阶段边界：发稿=出版前');
eq(stageOf(11), 'presale', 'A3e 阶段边界：质检=出版前');
eq(stageOf(12), 'marketing', 'A3f 阶段边界：营销=营销中');
ok(/^\d{4}-\d{2}-\d{2}$/.test(T), 'A4 todayStr 格式 YYYY-MM-DD');

/* ==================== B. 选题与进度预警 ==================== */
group('B. 选题与进度预警');
const tp = newTopic({ title: '测试书', author: '张三', startDate: T, node: 0 });
eq(tp.nodeDates[0], T, 'B1 newTopic 记录当前节点日期');
eq(tp.category, CATEGORIES[0], 'B2 newTopic 默认类别');
eq(tp.reminders.length, 0, 'B3 newTopic 空提醒');

state.topics = [];
/* 预警①：初审起算 >240 天 */
const w1 = newTopic({ title: '超期初审', author: 'a', startDate: shift(T, -300), node: 4 });
w1.nodeDates = { 2: shift(T, -241), 4: shift(T, -10) };
state.topics.push(w1);
let wl = warnList();
eq(wl.length, 1, 'B4 预警①：初审至今241天触发');
ok(wl[0].reasons[0].indexOf('总流程已进行241天') > -1, 'B5 预警①文案含天数');
/* 边界：恰好 240 天不触发 */
w1.nodeDates[2] = shift(T, -240);
eq(warnList().length, 0, 'B6 预警①边界：240天不触发');
/* 回退：无初审日期用启动时间 */
const w2 = newTopic({ title: '无初审日期', author: 'a', startDate: shift(T, -250), node: 3 });
w2.nodeDates = { 3: shift(T, -10) };
state.topics = [w2];
wl = warnList();
eq(wl.length, 1, 'B7 预警①回退：缺失初审日期用启动时间');
/* 预警②：非编写节点停留 >60 天 */
const w3 = newTopic({ title: '二审滞留', author: 'a', startDate: shift(T, -100), node: 4 });
w3.nodeDates = { 2: shift(T, -80), 4: shift(T, -61) };
state.topics = [w3];
wl = warnList();
eq(wl.length, 1, 'B8 预警②：二审停留61天触发');
ok(wl[0].reasons.some(r => r.indexOf('二审已耗时61天') > -1), 'B9 预警②文案含节点名');
w3.nodeDates[4] = shift(T, -60);
eq(warnList().length, 0, 'B10 预警②边界：60天不触发');
/* 预警③：编写 >180 天 */
const w4 = newTopic({ title: '编写马拉松', author: 'a', startDate: shift(T, -200), node: 1 });
w4.nodeDates = { 1: shift(T, -181) };
state.topics = [w4];
eq(warnList().length, 1, 'B11 预警③：编写181天触发');
w4.nodeDates[1] = shift(T, -180);
eq(warnList().length, 0, 'B12 预警③边界：180天不触发');
/* 已出版不预警 */
const w5 = newTopic({ title: '已出版', author: 'a', startDate: shift(T, -500), node: 12 });
w5.nodeDates = { 2: shift(T, -400), 12: shift(T, -10) };
state.topics = [w5];
eq(warnList().length, 0, 'B13 已出版（营销）选题不预警');
/* 策划节点同 60 天口径 */
const w6 = newTopic({ title: '策划滞留', author: 'a', startDate: shift(T, -61), node: 0 });
w6.nodeDates = { 0: shift(T, -61) };
state.topics = [w6];
eq(warnList().length, 1, 'B14 策划节点停留61天触发');
/* 多原因合并 */
const w7 = newTopic({ title: '双重预警', author: 'a', startDate: shift(T, -300), node: 5 });
w7.nodeDates = { 2: shift(T, -250), 5: shift(T, -70) };
state.topics = [w7];
wl = warnList();
eq(wl[0].reasons.length, 2, 'B15 同一选题①②原因合并');

/* ==================== C. to-do 逻辑 ==================== */
group('C. to-do 逻辑');
state.todos = [];
const nt = newTodo({ detail: 'x' });
eq(nt.dueDate, T, 'C1 newTodo 默认截止=今天');
eq(nt.done, false, 'C2 newTodo 默认未完成');
eq(nt.node, null, 'C3 newTodo 默认无关联节点');

state.todos = [
  newTodo({ detail: '昨日未完成', dueDate: Y1 }),
  newTodo({ detail: '三日前的', dueDate: Y3 }),
  newTodo({ detail: '今日十点', dueDate: T, dueTime: '10:00', createdAt: '2026-01-01T00:00:00.000Z' }),
  newTodo({ detail: '今日无时间', dueDate: T, createdAt: '2026-01-02T00:00:00.000Z' }),
  newTodo({ detail: '今日已完成', dueDate: T, done: true, doneAt: '2026-10-12T08:00:00.000Z' }),
  newTodo({ detail: '未来任务', dueDate: F2 })
];
eq(overdueTodos().length, 2, 'C4 overdueTodos 全局口径');
const bt = dayBuckets(T);
eq(bt.overdue.length, 2, 'C5 日桶：历史逾期置顶');
eq(bt.pending.length, 2, 'C6 日桶：今日待办');
eq(bt.done.length, 1, 'C7 日桶：今日完成');
eq(bt.pending[0].detail, '今日十点', 'C8 排序：有时间优先');
eq(bt.pending[1].detail, '今日无时间', 'C9 排序：无时间按创建');
eq(bt.overdue[0].detail, '三日前的', 'C10 逾期桶按截止日升序');
const bp = dayBuckets(Y1);
eq(bp.overdue.length, 1, 'C11 过去日：当日未完成入逾期桶');
eq(bp.pending.length, 0, 'C12 过去日：无待办桶');
ok(bp.overdue.every(d => d.dueDate === Y1), 'C13 过去日不混入更早逾期');
eq(dayBuckets(F2).pending.length, 1, 'C14 未来日：仅当日任务');

const ws = weekDates(new Date());
eq(ws.length, 7, 'C15 周视图7天');
const dowT = (new Date().getDay() + 6) % 7;
eq(ws[0], shift(T, -dowT), 'C16 周一起始');
const mc2 = monthCells(new Date());
const expDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
eq(mc2.filter(c => c).length, expDays, 'C17 月格数=当月天数');
eq(mc2.filter(c => c && c.rel === 'today').length, 1, 'C18 今天标记唯一');

state.todoView = 'day'; state.todoNav = { day: 0, week: 0, month: 0 };
navTodo(-1);
eq(dateStrOf(todoAnchor()), Y1, 'C19 日翻页锚点');
eq(todoPeriodSet().length, 1, 'C20 日统计跟随锚点');
state.todoNav.day = 0;
state.todoView = 'week';
eq(todoPeriodSet().length, state.todos.filter(d => d.dueDate >= ws[0] && d.dueDate <= ws[6]).length, 'C21 周统计=本周任务');
state.todoView = 'month';
eq(todoPeriodSet().length, state.todos.filter(d => d.dueDate.slice(0, 7) === T.slice(0, 7)).length, 'C22 月统计=本月任务');
state.todoView = 'day';

gotoDay(F2);
eq(state.todoView, 'day', 'C23 gotoDay 切日视图');
eq(state.todoNav.day, 2, 'C24 gotoDay 偏移正确');
state.todoNav.day = 0;

const tgl = state.todos.find(d => d.detail === '今日十点');
toggleTodo(tgl.id);
eq(tgl.done, true, 'C25 toggleTodo 标记完成');
ok(!!tgl.doneAt, 'C26 完成时间已记录');
toggleTodo(tgl.id);
eq(tgl.done, false, 'C27 toggleTodo 取消完成');
eq(tgl.doneAt, null, 'C28 完成时间清空');

const tOpt = newTopic({ title: '选题', author: 'a', startDate: T, node: 5 });
eq(nodeOptionsFor(tOpt)[0], 5, 'C29 关联节点从当前节点起');
eq(nodeOptionsFor(tOpt).length, NODES.length - 5, 'C30 关联节点含之后全部节点');

/* ==================== D. 渲染结构 ==================== */
group('D. 渲染结构');
renderTodoPage();
const stH = __els['todoStats'].innerHTML;
eq(cnt(stH, /class="tstat"/g), 3, 'D1 统计卡3张普通卡');
ok(stH.indexOf('tstat-rate') > -1, 'D2 含完成率卡');
ok(stH.indexOf('width="44"') > -1, 'D3 圆环44px');
ok(stH.indexOf('to-do看板') === -1, 'D4 无看板标题');
const dH = __els['todoDetail'].innerHTML;
ok(dH.indexOf('td-sec red') > -1 && dH.indexOf('td-sec cyan') > -1 && dH.indexOf('td-sec green') > -1, 'D5 日视图三色分区');
ok(dH.indexOf('class="pnav"') > -1, 'D6 日视图卡片头含翻页组件');
eq(__els['todoPeriodLabel'].textContent, todoPeriodLabel(), 'D7 周期标签同步');

state.todoView = 'week';
renderTodoPage();
const wH = __els['todoDetail'].innerHTML;
eq(cnt(wH, /wk-col/g), 7, 'D8 周视图7栏');
eq(cnt(wH, /class="wk-st"/g), cnt(wH, /wk-todo/g), 'D9 每条任务有状态框');
eq(cnt(wH, /class="wk-txt"/g), cnt(wH, /wk-todo/g), 'D10 每条任务有省略号文本元素');

state.todoView = 'month';
renderTodoPage();
const mH = __els['todoDetail'].innerHTML;
ok(mH.indexOf('cal-cell blank') === -1, 'D11 月历无空白格');
ok(mH.indexOf('cal-dow-row') > -1, 'D12 周几表头独立行');
eq(cnt(mH, /class="cal-txt"/g), cnt(mH, /cal-todo/g), 'D13 月历每条任务有详情元素');
eq(cnt(mH, /class="wk-st"/g), cnt(mH, /cal-todo/g), 'D14 月历每条任务有状态框');
state.todoView = 'day';

/* ==================== E. 数据安全 ==================== */
group('E. 数据安全');
saveTodos();
ok(JSON.parse(localStorage.getItem(LS_TODO)).length === state.todos.length, 'E1 todos 持久化往返');
localStorage.setItem(LS_TODO, '{bad json');
loadAll();
eq(state.todos.length, 0, 'E2 损坏 JSON 回退空数组不崩');
localStorage.removeItem(LS_TODO);
state.todos = [];
renderTodoPage();
ok(true, 'E3 空数据渲染不崩');
const stE = __els['todoStats'].innerHTML;
ok(stE.indexOf('>-</div>') > -1 || stE.indexOf('>-<') > -1, 'E4 空数据完成率占位符');
state.todoView = 'month';
renderTodoPage();
ok(cnt(__els['todoDetail'].innerHTML, /cal-todo/g) === 0, 'E5 空数据月历无任务');
state.todoView = 'day';

/* ==================== F. 备份版本 / 翻页回今天 / 创建按钮 / 推进节点 / 关联弹窗 ==================== */
group('F. 本期新增功能');

/* --- F1~F4 备份 schema 版本号 --- */
state.topics = [newTopic({ title: '导出书', author: 'a', startDate: T })];
state.todos = [newTodo({ detail: '导出任务' })];
exportJSON();
const exported = JSON.parse(__lastBlobJson);
eq(exported.schemaVersion, SCHEMA_VERSION, 'F1 导出含 schemaVersion');
ok(exported.topics.length === 1 && exported.todos.length === 1, 'F2 导出含选题与to-do');
const mb = migrateBackup({ topics: [{ id: 't1', title: '旧书', author: 'a', startDate: T, node: 2, nodeDates: { 2: T } }] }, 1);
eq(mb.schemaVersion, SCHEMA_VERSION, 'F3a 迁移后版本号=当前');
eq(mb.topics[0].id, 't1', 'F3b 迁移保留原id');
ok(Array.isArray(mb.topics[0].reminders), 'F3c 迁移补齐reminders');
ok(Array.isArray(mb.topics[0].sales), 'F3d 迁移补齐sales');
const mb2 = migrateBackup({ topics: [], todos: [{ id: 'd1', detail: '旧任务', dueDate: T, done: false }] }, 1);
eq(mb2.todos[0].node, null, 'F4a 迁移补齐todo缺省字段');
ok(!!mb2.todos[0].createdAt, 'F4b 迁移补齐createdAt');
/* 高版本备份拒绝导入：state 不被覆盖 */
state.topics = [newTopic({ title: '保护现场', author: 'a', startDate: T })];
importJSON({ target: { files: [{}], value: '' } });
FileReader._last.result = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, topics: [] });
FileReader._last.onload();
eq(state.topics.length, 1, 'F5 高版本备份拒绝导入');
/* v1 旧备份可导入并迁移 */
FileReader._last.result = JSON.stringify({ topics: [{ id: 't9', title: '旧书', author: 'a', startDate: T, node: 1, nodeDates: { 1: T } }] });
FileReader._last.onload();
eq(state.topics.length, 1, 'F6a 旧备份导入成功');
ok(Array.isArray(state.topics[0].reminders), 'F6b 旧备份导入后字段已迁移');

/* --- F7~F10 「今天」按钮与周/月创建按钮 --- */
state.todoView = 'week'; state.todoNav = { day: 0, week: 3, month: 0 };
navTodoToday();
eq(state.todoNav.week, 0, 'F7 navTodoToday 偏移清零');
state.todoNav.day = 2; state.todoView = 'day';
ok(pnavHtml().indexOf('pnav-today') > -1, 'F8a 翻页组件含今天按钮');
ok(pnavHtml().indexOf('disabled') === -1, 'F8b 偏移非0时今天可用');
state.todoNav.day = 0;
ok(pnavHtml().indexOf('pnav-today" onclick="navTodoToday()" title="回到今天" disabled') > -1, 'F8c 偏移为0时今天置灰');
state.todoView = 'week';
renderTodoPage();
const wH2 = __els['todoDetail'].innerHTML;
eq(cnt(wH2, /class="wk-add"/g), 7, 'F9 周视图每栏有新建按钮');
ok(wH2.indexOf("openTodoModal(null,{dueDate:") > -1, 'F9b 新建按钮预填该栏日期');
state.todoView = 'month';
renderTodoPage();
const mH2 = __els['todoDetail'].innerHTML;
eq(cnt(mH2, /class="cal-add"/g), expDays, 'F10 月视图每格有新建按钮');
state.todoView = 'day';

/* --- F11~F15 推进节点 --- */
state.todos = [];
const adv = newTopic({ title: '推进会', author: 'a', startDate: T, node: 3 });
state.topics = [adv];
advanceNode(adv.id);
eq(adv.node, 4, 'F11 无未完成to-do直接推进');
eq(adv.nodeDates[4], T, 'F12 推进记录节点日期');
const advTodo = newTodo({ detail: '编加任务', topicId: adv.id, node: 4 });
state.todos = [advTodo];
advanceNode(adv.id);
eq(adv.node, 4, 'F13a 有未完成to-do不推进');
const advModal = __els['modalRoot'].innerHTML;
ok(advModal.indexOf('去查看') > -1 && advModal.indexOf('知道了') > -1, 'F13b 弹窗含两个按钮');
ok(advModal.indexOf('还有 <b') > -1 && advModal.indexOf('1</b> 条未完成 to-do') > -1, 'F13c 弹窗含条数提示');
doAdvanceNode(adv.id);
eq(adv.node, 5, 'F14 知道了之后正常推进');
const advLast = newTopic({ title: '已出版书', author: 'a', startDate: T, node: 12 });
state.topics = [advLast];
advanceNode(advLast.id);
eq(advLast.node, 12, 'F15 末节点推进无效');

/* --- F16 卡片：无整卡点击编辑，推进/编辑按钮同行 --- */
state.topics = [adv, advLast];
state.kanbanFilter = 'all';
renderTopicGrid();
const gH = __els['topicGrid'].innerHTML;
ok(gH.indexOf('topic-card" onclick') === -1, 'F16a 整卡无点击编辑');
ok(gH.indexOf('advanceNode') > -1, 'F16b 含推进节点按钮');
ok(gH.indexOf('编辑详情') > -1, 'F16c 含编辑详情按钮');
ok(/btn text" disabled>推进节点/.test(gH), 'F16d 末节点按钮置灰');

/* --- F17~F20 关联to-do弹窗 --- */
state.todos = [advTodo];
openTopicTodos(adv.id);
const relH = __els['modalRoot'].innerHTML;
ok(relH.indexOf('toggleTodoRel') > -1, 'F17a 每条前有勾选框');
ok(relH.indexOf('创建to-do') > -1, 'F17b 含创建按钮');
ok(relH.indexOf('type="checkbox"') > -1, 'F17c 勾选框为checkbox');
toggleTodoRel(advTodo.id, adv.id);
eq(findTodo(advTodo.id).done, true, 'F18a 弹窗内勾选标记完成');
ok(__els['modalRoot'].innerHTML.indexOf('关联to-do') > -1, 'F18b 勾选后弹窗重绘');
toggleTodoRel(advTodo.id, adv.id);
eq(findTodo(advTodo.id).done, false, 'F18c 再次勾选取消完成');
openTodoModalFromRel(null, adv.id);
eq(state._todoReturn, adv.id, 'F19a 记录回跳来源');
ok(__els['modalRoot'].innerHTML.indexOf('value="' + adv.id + '" selected') > -1, 'F19b 创建默认关联该选题');
/* 保存后返回关联弹窗（经 stub getElementById 自动创建表单元素） */
document.getElementById('td_detail').value = '回跳任务';
document.getElementById('td_dueDate').value = T;
document.getElementById('td_remark').value = '';
document.getElementById('td_dueTime').value = '';
document.getElementById('td_topic').value = adv.id;
document.getElementById('td_tag').value = '';
document.getElementById('td_node').value = '';
const beforeCnt = state.todos.length;
saveTodoForm('');
eq(state.todos.length, beforeCnt + 1, 'F20a 新to-do已保存');
ok(__els['modalRoot'].innerHTML.indexOf('关联to-do') > -1, 'F20b 保存后返回关联弹窗');
eq(state._todoReturn, null, 'F20c 回跳标记已清');

/* ==================== G. 弹窗精简 / 周视图两行 / 未保存提醒 ==================== */
group('G. 本期新增（弹窗与未保存提醒）');

/* G1 个人档案说明文案已删除 */
ok(html.indexOf('基本信息用于看板展示') === -1, 'G1 档案页说明文案已删');

/* G2 周视图 to-do 两行显示（.wk-txt 两行截断） */
ok(/\.wk-txt\{[^}]*-webkit-line-clamp:2/.test(html), 'G2 周视图文本两行省略');
ok(/\.wk-todo\{[^}]*align-items:flex-start/.test(html), 'G2b 周视图条目顶对齐');

/* G3 提醒记录弹窗：无右下角关闭按钮 */
const rg = newTopic({ title: '提醒书', author: 'a', startDate: T, node: 2 });
rg.reminders.push({ node: 2, text: '抓紧催稿', date: T });
state.topics = [rg];
openReminders(rg.id);
const remH = __els['modalRoot'].innerHTML;
ok(remH.indexOf('modal-actions') === -1, 'G3a 提醒记录无底部按钮栏');
ok(remH.indexOf('modal-close') > -1, 'G3b 提醒记录保留右上角×');

/* G4 关联to-do弹窗：无「关闭」按钮，保留「创建to-do」 */
state.todos = [newTodo({ detail: '关联任务', topicId: rg.id, node: 2 })];
openTopicTodos(rg.id);
const relH2 = __els['modalRoot'].innerHTML;
ok(relH2.indexOf('>关闭</button>') === -1, 'G4a 关联弹窗无关闭按钮');
ok(relH2.indexOf('创建to-do') > -1, 'G4b 关联弹窗保留创建按钮');

/* G5 选题弹窗：无「取消」，×走未保存守卫，打开即快照 */
openTopicModal(rg.id);
const tpH = __els['modalRoot'].innerHTML;
ok(tpH.indexOf('>取消</button>') === -1, 'G5a 选题弹窗无取消按钮');
ok(tpH.indexOf('closeTopicModal()') > -1, 'G5b 选题弹窗×走守卫');
eq(state._topicSnap, '', 'G5c 打开后已快照（stub下为空串）');

/* G6 未保存守卫逻辑：干净直关 / 有改动确认后才关 */
const origQsa = document.querySelectorAll;
document.querySelectorAll = function () { return [{ value: 'a' }]; };
state._topicSnap = 'a';
__els['modalRoot'].innerHTML = 'OPEN';
closeTopicModal();
eq(__els['modalRoot'].innerHTML, '', 'G6a 无改动直接关闭');
__els['modalRoot'].innerHTML = 'OPEN';
state._topicSnap = 'a';
document.querySelectorAll = function () { return [{ value: 'b' }]; };
__confirmRet = false;
closeTopicModal();
eq(__els['modalRoot'].innerHTML, 'OPEN', 'G6b 有改动且用户取消→保持打开');
__confirmRet = true;
closeTopicModal();
eq(__els['modalRoot'].innerHTML, '', 'G6c 有改动且用户确认→关闭');
eq(state._topicSnap, null, 'G6d 关闭后快照清空');
document.querySelectorAll = origQsa;

/* G7 to-do弹窗：×走守卫，打开即快照 */
openTodoModal(null, { dueDate: T });
const tdH = __els['modalRoot'].innerHTML;
ok(tdH.indexOf('closeTodoModal()') > -1, 'G7a to-do弹窗×走守卫');
eq(state._todoSnap, '', 'G7b 打开后已快照');
document.querySelectorAll = function () { return [{ value: 'dirty' }]; };
__els['modalRoot'].innerHTML = 'OPEN';
__confirmRet = false;
closeTodoModal();
eq(__els['modalRoot'].innerHTML, 'OPEN', 'G7c to-do未保存取消→保持打开');
__confirmRet = true;
closeTodoModal();
eq(__els['modalRoot'].innerHTML, '', 'G7d to-do未保存确认→关闭');
document.querySelectorAll = origQsa;

/* ==================== H. 选题标签（周/月视图）与看板表格视图 ==================== */
group('H. 选题标签与表格视图（2026-10-16）');

/* H1 trunc 截断函数 */
eq(trunc('一二三四五六七八九十', 10), '一二三四五六七八九十', 'H1a 恰好10字不截断');
eq(trunc('一二三四五六七八九十一', 10), '一二三四五六七八九十…', 'H1b 超10字截断补省略号');
eq(trunc('abc', 5), 'abc', 'H1c 不足不截');
eq(trunc(null, 5), '', 'H1d null 安全');

/* H2 topicTagHtml：有无关联 / 选题已删 */
const _topicsBackup = state.topics;
const ht = newTopic({
  title: '国际贸易实务教程（第三版）', author: '张三', startDate: T,
  topicNo: 'AB2026-00123', bookNo: '978-7-04-123456-7', school: '北京对外经济贸易大学'
});
ht.reminders = [{ date: T, text: '提醒：下周三前交二审修改稿，请跟进' }];
state.topics = [ht];
const tagTodo = newTodo({ detail: '整理引言', dueDate: T, topicId: ht.id });
const noTagTodo = newTodo({ detail: '无关联任务', dueDate: T });
ok(topicTagHtml(tagTodo).indexOf('国际贸易实务教') > -1, 'H2a 选题标签显示前6字');
ok(topicTagHtml(tagTodo).indexOf('title="国际贸易实务教程（第三版）"') > -1, 'H2b hover 显示全称');
eq(topicTagHtml(noTagTodo), '', 'H2c 无关联选题→无标签');
eq(topicTagHtml(newTodo({ detail: 'x', dueDate: T, topicId: 'ghost-id' })), '', 'H2d 关联选题已被删→无标签');

/* H3 周/月视图渲染含选题标签 */
const _todosBackup = state.todos;
state.todos = [tagTodo];
renderWeekView(__els['todoDetail']);
ok(__els['todoDetail'].innerHTML.indexOf('国际贸易实务教') > -1, 'H3a 周视图含选题标签');
renderMonthView(__els['todoDetail']);
ok(__els['todoDetail'].innerHTML.indexOf('国际贸易实务教') > -1, 'H3b 月视图含选题标签');
state.todos = [];

/* H4 视图切换 */
eq(state.kanbanView, 'card', 'H4a 默认卡片视图');
setKanbanView('table');
eq(state.kanbanView, 'table', 'H4b 切换到表格视图');
ok(__els['kanbanViewSeg'].innerHTML.indexOf('表格') > -1
  && __els['kanbanViewSeg'].innerHTML.indexOf('active') > -1, 'H4c 视图胶囊渲染且有选中态');

/* H5 表格视图：十列表头 */
state.kanbanFilter = 'all';
renderTopicGrid();
const thtml = __els['topicGrid'].innerHTML;
['序号','选题名','选题号','书号','作者','院校','当前节点','最新提醒','详情','其他'].forEach(function (h) {
  ok(thtml.indexOf('<th>' + h + '</th>') > -1, 'H5 表头-' + h);
});

/* H6 序号从1开始 + 固定占位折叠 */
ok(/<tr>\s*<td>1<\/td>/.test(thtml), 'H6a 序号从1开始');
ok(thtml.indexOf('国际贸易实务教程（第…') > -1, 'H6b 选题名10字折叠');
ok(thtml.indexOf('title="国际贸易实务教程（第三版）"') > -1, 'H6c 选题名 hover 全称');
ok(thtml.indexOf('AB2026-00…') > -1, 'H6d 选题号9字折叠');
ok(thtml.indexOf('978-7…') > -1, 'H6e 书号5字折叠');
ok(thtml.indexOf('北京对外经济…') > -1, 'H6f 院校6字折叠');
ok(thtml.indexOf('提醒：下周三前交二审…') > -1, 'H7a 最新提醒10字折叠');
ok(thtml.indexOf('tip-box') > -1 && thtml.indexOf('提醒：下周三前交二审修改稿，请跟进') > -1, 'H7b 最新提醒 hover 全貌');

/* H8 当前节点 to-do 提醒铃铛 */
ok(thtml.indexOf('note-badge') === -1, 'H8a 无未完成 to-do 时不显示铃铛');
state.todos = [newTodo({ detail: '催作者交稿', dueDate: T, topicId: ht.id, node: ht.node })];
renderTopicGrid();
const thtml2 = __els['topicGrid'].innerHTML;
ok(thtml2.indexOf('note-badge') > -1, 'H8b 当前节点有未完成 to-do 显示铃铛');
ok(thtml2.indexOf('note-tip') > -1 && thtml2.indexOf('催作者交稿') > -1, 'H8c 铃铛 hover 含 to-do 详情');
state.todos = [];

/* H9 详情列 + 其他列下拉 */
ok(thtml.indexOf('>编辑</button>') > -1 && thtml.indexOf('openTopicModal') > -1, 'H9a 详情列编辑按钮');
ok(thtml.indexOf('>关联to-do</button>') > -1, 'H9b 下拉含关联to-do');
ok(thtml.indexOf('>提醒记录</button>') > -1, 'H9c 下拉含提醒记录');
ok(thtml.indexOf('>删除选题</button>') > -1 && thtml.indexOf('deleteTopic') > -1, 'H9d 下拉含删除选题');
ok(thtml.indexOf('toggleCardMenu') > -1, 'H9e 其他列「...」触发下拉');

/* H10 切回卡片视图 + 还原现场 */
setKanbanView('card');
renderTopicGrid();
ok(__els['topicGrid'].innerHTML.indexOf('topic-card') > -1, 'H10a 切回卡片视图渲染正常');
ok(__els['topicGrid'].innerHTML.indexOf('国际贸易实务教程（第三版）') > -1, 'H10b 卡片视图选题名不折叠');
state.topics = _topicsBackup;
state.todos = _todosBackup;

/* ==================== 汇总 ==================== */
console.log('\n========================================');
console.log('结果：PASS ' + PASS + ' / FAIL ' + FAIL);
if (FAIL) { console.log('失败用例：'); failures.forEach(f => console.log('  - ' + f)); }
process.exit(FAIL ? 1 : 0);
