## ADDED Requirements

### Requirement: 设置页展示模型配置表单
系统 SHALL 在设置中心提供模型配置界面，包含 provider 选择（内置列表 + 自定义 provider id）以及 API Key、Base URL、默认模型输入。

#### Scenario: 打开模型配置页
- **WHEN** 用户进入设置中心并切换到“模型 API 配置”
- **THEN** 系统展示 provider 选择与 API Key/Base URL/默认模型输入控件

### Requirement: 保存模型配置到 OpenClaw 配置
系统 SHALL 将用户填写的 provider 配置写入 `models.providers.<id>`，并将默认模型写入 `agents.defaults.model.primary`。

#### Scenario: 保存非 Qwen provider 配置
- **WHEN** 用户填写 provider、API Key、默认模型并点击保存
- **THEN** 系统写入 `models.providers.<id>.apiKey` 与 `agents.defaults.model.primary=<id>/<model>`，并在 Base URL 有值时写入 `models.providers.<id>.baseUrl`

### Requirement: 读取并回显已有配置
系统 SHALL 读取现有 OpenClaw 配置并回显到表单中，便于用户更新或确认当前设置。

#### Scenario: 进入页面自动回显
- **WHEN** 用户打开模型配置页
- **THEN** 系统读取 `models.providers` 与 `agents.defaults.model.primary` 并在表单中回显

### Requirement: Qwen OAuth 授权流程
系统 SHALL 支持通过 Qwen OAuth 完成授权，并允许设置 Qwen 为默认模型。

#### Scenario: 触发 Qwen 授权
- **WHEN** 用户在 Qwen 区域点击“开始授权”
- **THEN** 系统调用 Qwen OAuth 流程并展示授权进度或错误提示

### Requirement: 配置校验与错误反馈
系统 MUST 在保存配置后触发配置校验，并在失败时向用户显示错误信息。

#### Scenario: 校验失败
- **WHEN** 保存配置后校验返回失败
- **THEN** 系统提示失败原因并保持表单内容不丢失
