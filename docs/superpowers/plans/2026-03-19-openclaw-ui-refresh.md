# OpenClaw UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以中性极简 + 冷灰蓝主色的玻璃卡片风格重设计安装器 UI，保持三步分页与流程简单。

**Architecture:** 仅调整渲染层的布局与样式（Vue 组件与全局 CSS），不改动主进程或业务流程。统一单主卡结构与视觉令牌，减少信息层级。

**Tech Stack:** Vue 3、Electron Renderer、CSS（不引入新状态管理）。

---

## 文件结构（本次变更范围）
**修改**
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/StepList.vue`（如清理无用组件）

---

### Task 1: 全局视觉令牌与玻璃卡片样式

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css`

- [ ] **Step 1: 引入字体与新的色板变量（参考 spec）**

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap');

:root {
  --bg: #f6f7fa;
  --bg-deep: #eef1f6;
  --card: rgba(255, 255, 255, 0.65);
  --ink: #101828;
  --muted: #6b7280;
  --stroke: rgba(255, 255, 255, 0.35);
  --accent: #607dff;
  --accent-ink: #3e4fa8;
  --error: #c54b4b;
  --shadow: 0 24px 60px rgba(30, 40, 60, 0.18);
  --shadow-soft: 0 10px 30px rgba(30, 40, 60, 0.12);
  --font-display: 'Space Grotesk', 'Manrope', 'Segoe UI', system-ui, sans-serif;
  --font-body: 'Manrope', 'Inter', 'Segoe UI', system-ui, sans-serif;
}
```

- [ ] **Step 2: 备注离线字体降级策略（仅注释）**

```css
/* 在线字体不可用时将回退到 system-ui / Segoe UI */
```

- [ ] **Step 2.1: 字体策略说明（不打包，仅在线 + 回退）**

说明：本次不打包本地字体，在线可加载则使用 Space Grotesk/Manrope，离线则稳定回退 system-ui。

- [ ] **Step 3: 更新背景与主卡样式为雾面玻璃**

```css
body {
  background: radial-gradient(circle at top, #ffffff 0%, var(--bg) 55%, var(--bg-deep) 100%);
}

body::before {
  content: none;
}

.install-card {
  background: var(--card);
  backdrop-filter: blur(18px);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow);
  border-radius: 28px;
}
```

- [ ] **Step 4: 更新按钮、状态胶囊、日志区与错误区样式**

```css
button.primary {
  background: var(--accent);
  color: white;
}

.status-pill {
  background: rgba(96, 125, 255, 0.1);
  border: 1px solid rgba(96, 125, 255, 0.25);
  color: var(--accent);
}

.log-summary {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(16, 24, 40, 0.06);
  max-height: calc(1.5em * 6 + 16px);
  overflow: auto;
  color: var(--muted);
  scroll-behavior: smooth;
}

.auth-code {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(96, 125, 255, 0.12);
  border: 1px solid rgba(96, 125, 255, 0.35);
  color: #2b3aa6;
  font-weight: 600;
}

.ghost {
  background: transparent;
  border: 1px solid var(--stroke);
  color: var(--ink);
}

.glass-frame {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 18px;
}

.auth-error {
  color: var(--error);
}

button:disabled {
  opacity: 0.6;
  box-shadow: none;
  cursor: not-allowed;
}

.log-summary {
  min-height: 96px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--accent);
  color: white;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 600;
}

/* status-pill 作为唯一阶段显示 */

.actions,
.error-actions {
  display: flex;
  gap: 16px;
}

.error-detail {
  font-size: 12px;
  color: var(--muted);
}
```

- [ ] **Step 5: 添加轻量动效（卡片进入、按钮文案切换）**

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.install-card {
  animation: fadeUp 0.4s ease;
}

button {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* 日志更新不做逐行动画，避免闪烁 */

.btn-label {
  transition: opacity 0.2s ease;
}
```

- [ ] **Step 5.1: 按钮文案切换淡入淡出（最小实现）**

```css
.primary {
  transition: opacity 0.2s ease;
}

```vue
<button class="primary" :disabled="started">
  <span class="btn-label" :class="{ 'is-hidden': started }">{{ started ? '安装中…' : '开始安装' }}</span>
</button>
```

```css
.btn-label.is-hidden { opacity: 0.7; }
```
```

- [ ] **Step 6: 添加排版基准（标题/正文/按钮）**

```css
body { font-family: var(--font-body); }
h1 { font-family: var(--font-display); }
button { font-family: var(--font-body); }
h1 { font-size: 26px; line-height: 1.2; }
p, .log-summary { font-size: 13px; line-height: 1.5; }
button { font-size: 14px; }
```

- [ ] **Step 7: 运行本地样式检查（仅确认无语法错误）**

Run: `npm run dev`  
Expected: 启动正常，无样式错误（仅保证未引入语法错误）

- [ ] **Step 7.1: 手动对比度检查（主按钮/错误文案）**

Checklist:
- 主按钮文字与背景对比清晰，肉眼可读（≥4.5）
- 错误文案与背景对比清晰（≥4.5）

- [ ] **Step 7.2: 字体加载可用性检查（在线/回退）**

Checklist:
- 在线环境下字体能正常加载（标题为 Space Grotesk 风格）
- 若无法加载，回退字体仍可读且不破版

- [ ] **Step 8: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css
git commit -m "style: apply glass ui tokens"
```

---

### Task 2: 安装页布局简化（方案 A 单主卡）

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue`

- [ ] **Step 1: 统一品牌区结构（Logo/名称/子标题）**

```vue
<div class="brand">
  <div class="brand-mark">OC</div>
  <div>
    <h1>OpenClaw</h1>
    <p>Gateway installer</p>
  </div>
</div>
```

- [ ] **Step 2: 保留状态胶囊并改为“当前步骤”（移除 status-row 方案）**

```vue
<div class="status-pill">{{ current || '准备就绪' }}</div>
```

- [ ] **Step 3: 收敛 props（不再传 steps）**

```ts
defineProps<{
  current: string
  logSummary: string[]
  error: { code: string; message: string } | null
  started: boolean
}>()
```

- [ ] **Step 4: 更新 App.vue 中 InstallView 调用**

```vue
<InstallView
  v-if="stage === 'install'"
  :current="currentStep"
  :log-summary="logSummary"
  :error="error"
  :started="started"
  @start="start"
  @retry="retry"
  @copy-logs="copyLogs"
/>
```

- [ ] **Step 4.1: 为 AuthView/LaunchView 传入 stageLabel（基于 stage 常量）**

```vue
<AuthView
  v-else-if="stage === 'auth'"
  :stage-label="'Model API 配置'"
  ...
/>
<LaunchView
  v-else-if="stage === 'launch'"
  :stage-label="'准备启动控制台'"
  ...
/>
```

- [ ] **Step 5: 错误态替换主操作区域（保留日志区）**

```vue
<div v-if="error" class="error">
  <p class="error-title">安装失败</p>
  <p>安装失败，请检查网络或权限后重试。</p>
  <p class="error-detail">{{ error.message }}</p>
  <div class="error-actions">
    <button class="primary" @click="emit('retry')">重试</button>
    <button class="ghost" @click="emit('copyLogs')">复制日志</button>
  </div>
</div>
<div v-else class="actions">
  <button class="primary" @click="emit('start')" :disabled="started">
    <span class="btn-label">{{ started ? '安装中…' : '开始安装' }}</span>
  </button>
</div>
```

- [ ] **Step 6: 清理 steps/StepList 相关死代码**

```ts
// 移除 steps 相关 props/变量/导入
```

- [ ] **Step 6.1: 搜索 StepList 引用，确认未使用后再删除**

```bash
rg -n "StepList" /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src
```

- [ ] **Step 6.2: 删除 StepList 组件及其样式（若不再使用）**

```bash
rm /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/StepList.vue
```

```css
/* 删除 .step-list / .step-item 等相关样式 */
```

- [ ] **Step 7: App.vue 中日志使用全量列表（不裁剪）**

```ts
const logSummary = computed(() => logs.value)
```

- [ ] **Step 8: 日志显示完整列表并自动滚动到底部**

```vue
<div ref="logRef" class="log-summary">
  <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
</div>
```

```ts
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  current: string
  logSummary: string[]
  error: { code: string; message: string } | null
  started: boolean
}>()
const logRef = ref<HTMLElement | null>(null)
watch(
  () => props.logSummary,
  async () => {
    await nextTick()
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  },
  { deep: true }
)
```

- [ ] **Step 9: 说明“默认仅露出 6 行”的实现方式**

```css
/* 通过 log-summary max-height + overflow 形成默认 6 行高度 */
```

- [ ] **Step 10: 本地验证（渲染无报错即可）**

Run: `npm run dev`  
Expected: 安装页可正常渲染，且不再出现步骤列表

- [ ] **Step 11: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue
git commit -m "feat: simplify install layout"
```

---

### Task 3: 授权页玻璃卡内嵌 WebView

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue`

- [ ] **Step 1: 统一品牌区结构（Logo/名称/子标题）**

```vue
<div class="brand">
  <div class="brand-mark">OC</div>
  <div>
    <h1>OpenClaw</h1>
    <p>Model API 配置</p>
  </div>
</div>
```

- [ ] **Step 2: 确保授权页外层仍使用 install-card**

```vue
<section class="install-card">
  <!-- brand + status + body -->
</section>
```

- [ ] **Step 3: 统一结构与样式类名**

```vue
<div class="auth-frame glass-frame">
  <webview ... />
</div>
```

- [ ] **Step 4: 强化授权码展示（单独区域）**

```vue
<div v-if="userCode" class="auth-code">
  授权码：<strong>{{ userCode }}</strong>
</div>
```

- [ ] **Step 5: 错误时仅展示重试主按钮（替换主操作区域）**

```vue
<button class="primary" @click="emit('retry-auth')">重试授权</button>
```

- [ ] **Step 6: 日志区规则已在 app.css 中统一（无需在组件内重复）**

- [ ] **Step 7: WebView 容器边界与高度约束**

```css
.auth-frame {
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 18px;
  overflow: hidden;
  min-height: 360px;
}
```

- [ ] **Step 8: 统一错误文案（按 spec）**

```vue
<p v-if="error" class="auth-error">授权失败，请重试或检查网络。</p>
<p v-if="error" class="error-detail">{{ error.message }}</p>
```

- [ ] **Step 9: 日志显示完整列表并自动滚动到底部**

```vue
<div ref="logRef" class="log-summary">
  <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
</div>
```

```ts
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  running: boolean
  url: string | null
  userCode: string | null
  logSummary: string[]
  error: { code: string; message: string } | null
  done: boolean
  stageLabel: string
}>()
const logRef = ref<HTMLElement | null>(null)
watch(
  () => props.logSummary,
  async () => {
    await nextTick()
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  },
  { deep: true }
)
```

- [ ] **Step 10: 状态胶囊显示当前阶段（由父层传入）**

```vue
<div class="status-pill">{{ stageLabel }}</div>
```

- [ ] **Step 10.1: 将 stageLabel 合并进现有 defineProps（仅调用一次）**

- [ ] **Step 11: 核对主按钮文案与运行态**

```vue
<button class="primary" :disabled="running">
  <span class="btn-label" :class="{ 'is-hidden': running }">{{ running ? '正在授权…' : '开始授权' }}</span>
</button>
```

- [ ] **Step 12: 手动预览**

Run: `npm run dev`  
Expected: 授权页结构保持单主卡，WebView 内嵌不卡边

- [ ] **Step 13: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue
git commit -m "feat: refresh auth layout"
```

---

### Task 4: 启动页视觉统一（保持范围内）

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue`

- [ ] **Step 1: 统一品牌区结构（Logo/名称/子标题）**

```vue
<div class="brand">
  <div class="brand-mark">OC</div>
  <div>
    <h1>OpenClaw</h1>
    <p>准备启动控制台</p>
  </div>
</div>
```

- [ ] **Step 2: 启动页使用统一主卡结构**

```vue
<section class="install-card">
  <!-- brand header + action + error -->
</section>
```

- [ ] **Step 3: 状态胶囊显示当前阶段（由父层传入）**

```vue
<div class="status-pill">{{ stageLabel }}</div>
```

- [ ] **Step 3.1: 将 stageLabel 合并进现有 defineProps（仅调用一次）**

```ts
defineProps<{
  starting: boolean
  error: { code: string; message: string } | null
  stageLabel: string
}>()
```

- [ ] **Step 4: 错误态替换主操作区域（仅保留重试按钮）**

```vue
<div v-if="error" class="error">
  <p class="error-title">启动失败</p>
  <p>启动失败，请稍后重试。</p>
  <p class="error-detail">{{ error.message }}</p>
  <button class="primary" @click="emit('start-gateway')">重试</button>
</div>
<div v-else class="actions">
  <button class="primary" :disabled="starting" @click="emit('start-gateway')">
    <span class="btn-label">{{ starting ? '启动中…' : '启动控制台' }}</span>
  </button>
</div>
```

- [ ] **Step 5: 统一错误文案（按 spec）**

- [ ] **Step 6: 核对主按钮文案与运行态**

```vue
<button class="primary" :disabled="starting">
  <span class="btn-label" :class="{ 'is-hidden': starting }">{{ starting ? '启动中…' : '启动控制台' }}</span>
</button>
```

- [ ] **Step 7: 手动预览**

Run: `npm run dev`  
Expected: 启动页与 Dashboard 视觉一致、不突兀

- [ ] **Step 8: 若未来添加日志区，需保持可滚动与自动滚动到底部**

```vue
<div ref="logRef" class="log-summary">
  <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
</div>
```

- [ ] **Step 9: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue
git commit -m "feat: unify launch and dashboard styles"
```

---

### Task 5: 布局与响应约束落地

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css`

- [ ] **Step 1: 固定主卡宽度与内边距**

```css
.install-card {
  width: min(960px, 92vw);
  padding: 32px 36px;
}
```

- [ ] **Step 2: 统一模块间距与按钮高度**

```css
.actions, .error-actions { gap: 16px; }
button { height: 46px; }
```

- [ ] **Step 3: 最小宽度适配（760px 以下堆叠按钮）**

```css
@media (max-width: 760px) {
  .actions, .error-actions { flex-direction: column; }
}
```

- [ ] **Step 4: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css
git commit -m "style: enforce layout constraints"
```

---

### Task 6: 终验与清理

**Files:**
- None

- [ ] **Step 1: 手动 UI 快速验收**

Run: `npm run dev`  
Expected: 三步页面视觉一致、按钮/日志/错误区正常显示

- [ ] **Step 2: 退出并确认无残留改动**

- [ ] **Step 3: 提交（若无新增代码变更可跳过）**

```bash
git status --short
```

---

## 备注
- 实现阶段建议使用 `@ui-ux-pro-max` 技能细化视觉与排版细节。
.auth-code {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(96, 125, 255, 0.12);
  border: 1px solid rgba(96, 125, 255, 0.35);
  color: #2b3aa6;
  font-weight: 600;
}
