## ADDED Requirements

### Requirement: 启动前必须完成安装与 token 检查
系统 MUST 在进入控制台前执行启动检查，检查 OpenClaw 是否已安装，以及 dashboard URL 是否包含 token。
当未安装或 token 缺失时，系统 MUST 阻止进入控制台并切换到“设置 > 基础配置”。

#### Scenario: token 缺失时回退基础配置
- **WHEN** 启动检查返回已安装但 dashboard URL 不含 token
- **THEN** 系统不进入控制台，切换到“设置 > 基础配置”并提示需要授权

### Requirement: 检查通过后自动进入控制台
当安装与 token 均满足时，系统 SHALL 自动启动 gateway 并加载控制台 URL。

#### Scenario: 启动检查通过
- **WHEN** 启动检查返回已安装且 dashboard URL 含 token
- **THEN** 系统自动启动 gateway 并进入控制台

### Requirement: 启动失败统一回退基础配置
当 gateway 启动失败或无法带 token 获取控制台 URL 时，系统 MUST 回退到“设置 > 基础配置”。

#### Scenario: gateway 启动失败
- **WHEN** gateway 启动或获取控制台 URL 失败
- **THEN** 系统切换到“设置 > 基础配置”并显示错误提示

### Requirement: 安装完成后自动尝试补齐 token
当安装流程结束且已完成模型授权后，系统 MUST 自动尝试获取 dashboard URL；
若 URL 不含 token，系统 MUST 触发 token 生成流程并重试获取带 token 的 URL。
若仍未获得带 token 的 URL，系统 MUST 回退到“设置 > 基础配置”并提示用户继续配置。

#### Scenario: 安装完成但 URL 无 token
- **WHEN** 安装完成后首次获取 dashboard URL 不含 token
- **THEN** 系统执行 token 生成流程并重试获取带 token 的 URL

#### Scenario: token 生成失败
- **WHEN** token 生成流程执行失败或重试后仍未获取到带 token 的 URL
- **THEN** 系统回退到“设置 > 基础配置”并提示用户前往模型API配置继续处理

### Requirement: 自动补齐 gateway.mode
当检测到 gateway.mode 未配置时，系统 MUST 自动设置为 `local`，以确保网关可启动。

#### Scenario: gateway.mode 未设置
- **WHEN** 安装完成或启动控制台前检测到 gateway.mode 未配置
- **THEN** 系统自动写入 gateway.mode=local 并继续启动流程
