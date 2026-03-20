## Why

当前启动流程在未正确配置 token 或未完成安装时仍会尝试启动控制台，导致启动失败体验分散且难以定位问题；同时安装流程与设置中心割裂，用户难以在统一入口完成修复。我们需要把“启动检查 + 基础配置”收拢为一致流程，降低失败成本。

## What Changes

- 启动页仅负责引导与检测：检查本地 OpenClaw 是否安装、dashboard URL 是否含 token。
- 只有“已安装且 token 正常”才自动启动 gateway 并进入控制台。
- 若检测失败或无法带 token 启动控制台，直接跳转到设置中的“基础配置”选项卡，展示安装/授权流程。
- 将现有安装向导迁移到设置的“基础配置”中作为唯一入口。
- 安装完成后若 dashboard URL 未包含 token，自动触发 token 生成流程并重试获取带 token 的控制台地址。
- 安装完成后的按钮文案改为“Qwen自动授权/API手动配置”，点击仅跳转到“模型API配置”页面。
- 安装完成后自动检测 gateway.mode，未设置时自动设为 local 以保证控制台可启动。

## Capabilities

### New Capabilities
- `startup-token-gating`: 启动时校验安装与 token，仅在满足条件时进入控制台，失败统一跳转设置基础配置。
- `settings-basic-config`: 设置中心提供“基础配置”页签，承载安装/授权流程。

### Modified Capabilities
- （无）

## Impact

- 主进程启动自检与 dashboard URL token 判断逻辑。
- IPC 启动结果返回结构（新增 token 状态与错误码）。
- 渲染进程启动状态机与设置面板结构调整。
- 设置页面新增“基础配置”页签并复用安装向导组件。
- 安装完成后的 token 自动生成与重试逻辑（依赖 OpenClaw CLI doctor 能力）。
- 基础配置与模型 API 配置页面之间的按钮与跳转流程调整。
- 网关启动前自动补齐 gateway.mode 配置（默认 local）。
