## Why

当前设置中心的“模型 API 配置”仍是占位状态，用户只能在终端里手动配置或仅能走 Qwen 授权流程，缺少统一、可视化的模型配置入口。需要在桌面端补齐授权与配置能力，以降低使用门槛并减少配置错误。

## What Changes

- 在设置中心实现“模型 API 配置”完整 UI，包括 Qwen 授权与其他 provider 的 API Key/Base URL/默认模型配置表单。
- 通过 `openclaw config get/set/unset/validate` 读写配置，落盘到 `openclaw.json`。
- 新增主进程 IPC 与 preload 暴露的接口，用于读取/保存配置与触发 Qwen OAuth。
- 更新命令白名单与测试，允许新的 `openclaw config` 相关命令与 Qwen provider 命令。

## Capabilities

### New Capabilities
- `model-api-config`: 在设置中心完成模型提供商配置（API Key/Base URL/默认模型）与 Qwen OAuth 授权，并持久化到 OpenClaw 配置文件。

### Modified Capabilities
- （无）

## Impact

- 渲染进程设置页 UI 与样式（SettingsPanel、app.css）。
- 主进程 IPC 处理逻辑与命令白名单。
- Preload 暴露的渲染进程 API。
- 相关测试用例（commandAllowlist）。
