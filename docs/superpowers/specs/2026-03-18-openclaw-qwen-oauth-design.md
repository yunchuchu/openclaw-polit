# OpenClaw Qwen OAuth 配置流程设计

Date: 2026-03-18

## 背景
当前安装流程可以完成 OpenClaw 安装并直接进入控制台，但在进入控制台前需要先完成模型 API（阿里/Qwen）的授权配置。本设计在不改变现有安装能力的前提下，新增“配置 Model API（Qwen OAuth）”步骤，并将“启动控制台”改为用户手动触发。

## 目标
1. 安装完成后不立即启动 Gateway，而是进入“配置 Model API”。
2. 仅提供 Qwen OAuth 授权（后续可扩展为多 provider）。
3. 授权完成后，用户手动点击“启动控制台”再进入 Dashboard。
4. 授权流程完全使用 OpenClaw CLI 自带的 OAuth 能力，应用只负责触发与展示。

## 非目标
1. 其他模型供应商的授权与配置。
2. 应用内自行实现 OAuth 或手动写入授权文件。
3. 后台自动启动 Gateway（必须用户手动触发）。

## 用户流程（三步）
1. **安装 OpenClaw**
   - 执行现有依赖检测与安装。
   - OpenClaw 安装完成后停止，不启动 Gateway。
2. **配置 Model API（Qwen OAuth）**
   - 用户点击“开始授权”。
   - 主进程启动 OpenClaw 的 Qwen OAuth CLI 流程，并解析输出中的授权 URL 与 user code。
   - 渲染进程展示内嵌 WebView 加载授权页面，同时展示 user code。
   - 授权完成后显示“授权成功，可继续”。
3. **启动控制台**
   - 用户点击“启动控制台”。
   - 主进程启动 Gateway 并获取 Dashboard URL。
   - 渲染进程切换至内嵌控制台 WebView。

## 架构与模块改动
### 主进程
- **新增 AuthFlow**
  - 负责执行 OpenClaw Qwen OAuth 流程（CLI）。
  - 解析 stdout/stderr，提取授权 URL 与 user code。
  - 监听命令结束并返回完成状态。
- **新增 AuthOutputParser**
  - 解析授权输出中：
    - `authorize` URL
    - `user_code`
  - 允许噪声行与多行输出，解析具备鲁棒性（跨行、尾随标点、文本兜底）。

### 渲染进程（UI）
- **新增/调整页面状态**
  - 安装完成页：提示“下一步配置模型 API”。
  - 配置页：仅提供 Qwen 授权按钮；授权开始后显示 WebView + user code。
  - 授权完成页：显示“启动控制台”按钮（手动触发）。

## IPC 事件设计
- `installer:done`
  - 安装完成但未启动 Gateway。
- `auth:start`
  - 用户点击“开始授权”。
- `auth:progress`
  - 输出授权日志、授权 URL 与 user code。
- `auth:done`
  - 授权成功完成。
- `auth:error`
  - 授权失败（含错误信息）。
- `gateway:start`
  - 用户点击“启动控制台”。

## 关键解析规则
授权输出中包含如下结构时：
- `Open https://.../authorize?...` → 取为授权 URL
- `If prompted, enter the code XXXXX.` → 提取 user code

解析器需容忍行首标记（例如 `◇`, `│`, `◑`）与多余空白，并具备以下鲁棒性：
1. **URL 跨行**：若 `authorize` URL 被换行拆分，只在下一行继续片段看起来像查询参数（以 `?` / `&` 开头或包含 `=`）时才拼接。
2. **尾随标点**：去除 URL 末尾可能出现的标点或包裹符（如 `.`、`,``?`、`)`、`]`、`}` 等），避免无效 URL。
3. **URL 选择**：优先匹配包含 `authorize` 的 URL；若未找到，则回退匹配任意 URL（仅用于兜底）。
4. **user_code 兜底**：优先从 URL query 中读取 `user_code`；若不存在，则从文本行中匹配 `code is` / `code:` / `enter the code` 等自然语言表述。
5. **缺失字段**：URL 或 user_code 任一缺失时，返回错误（例如 `MISSING_FIELDS`），并提示“未获取到授权链接，请重试”。

## 状态机
1. `installing` → `installed`
2. `installed` → `auth_idle`
3. `auth_idle` → `auth_running`
4. `auth_running` → `auth_done` / `auth_failed`
5. `auth_done` → `gateway_idle`
6. `gateway_idle` → `gateway_running` → `dashboard_ready`

## 错误处理
- **授权 URL 解析失败**：提示“未获取到授权链接”，允许重试。
- **授权流程失败**：展示错误与日志，提供“重试授权”。
- **用户关闭授权 WebView**：保留在授权页，允许继续授权或重试。

## 安全与权限
- 内嵌 WebView 仅加载 OAuth 授权 URL，不暴露本地敏感权限。
- 授权文件由 OpenClaw CLI 写入，应用不直接操作授权文件。

## 测试建议
- `AuthOutputParser` 单元测试：
  - 正常格式 → 正确提取 URL 与 code。
  - 噪声行 → 仍能提取。
  - URL 跨行 → 能正确拼接。
  - URL 尾随标点 → 能正确裁剪。
  - URL 不含 user_code → 能从文本行兜底提取。
  - 缺失字段 → 返回错误。
- 手动测试：
  - 授权成功后可点击“启动控制台”。
  - 授权失败/取消时可重试。

## 待确认
1. OpenClaw CLI 触发 Qwen OAuth 的最终命令（以文档与实际 CLI 输出为准）。
2. 授权完成后是否需要检测授权文件存在（可选增强）。
