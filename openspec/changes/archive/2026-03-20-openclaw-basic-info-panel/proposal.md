## Why

当前“基础配置”默认直接展示安装向导，用户进入设置时缺少 OpenClaw 的基础信息与运行控制入口；同时“关闭重启”占位条目不再需要。为了让设置页更聚焦与易用，需要提供简洁的基础信息卡片与安装/启动控制，并移除无效入口。

## What Changes

- 设置页左侧菜单移除“关闭重启”条目及其内容面板。
- “基础配置”默认显示 OpenClaw 基础信息卡片（版本号、安装状态、运行状态）与操作按钮。
- 安装向导不再默认出现，改为点击“安装”按钮进入隐藏的安装向导子页。
- 基础配置新增“启动/关闭/重启”按钮，仅控制本应用启动的 Gateway 进程。
- 新增 IPC/预加载桥接方法以支持查询状态与启动/停止/重启操作。

## Capabilities

### New Capabilities
- `openclaw-basic-info-panel`: 在设置页提供 OpenClaw 基础信息卡片与安装/启动控制，并支持进入安装向导子页。

### Modified Capabilities
- `settings-basic-config`: 基础配置不再默认展示安装向导，而是展示基础信息并提供进入安装向导的入口。
- `settings-left-action-list`: 设置左侧菜单条目与默认选中逻辑调整，移除“关闭重启”。
- `settings-secondary-nav-glass`: 设置左侧菜单条目与顺序更新，去除“关闭重启”。

## Impact

- 渲染进程设置页 UI 结构与状态控制逻辑调整（SettingsPanel、App）。
- 预加载层新增/调整 IPC 桥接方法。
- 主进程新增 Gateway 状态管理与 stop/restart/info IPC。
- 样式新增基础信息栅格/行布局样式，保持简洁干净风格。
