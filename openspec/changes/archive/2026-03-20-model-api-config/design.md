## Context

- 当前设置中心“模型 API 配置”仅为占位提示，缺少可用表单与授权流程。
- OpenClaw CLI 已提供 `openclaw config` 读写与 `openclaw models auth login` 的 OAuth 流程，可复用以保证配置格式与兼容性。
- 主进程命令执行受白名单限制，需要显式放行新命令。

## Goals / Non-Goals

**Goals:**
- 在设置中心实现模型 API 配置表单（API Key/Base URL/默认模型）并保存到 OpenClaw 配置。
- 提供 Qwen OAuth 授权入口，并允许将 Qwen 模型设为默认模型。
- 支持内置 provider 列表与自定义 provider id。

**Non-Goals:**
- 不引入 SecretRef 或环境变量密钥管理方案。
- 不实现完整配置重置与其他设置模块（保持占位）。
- 不改动 OpenClaw CLI 内部 schema 或 provider 行为。

## Decisions

- **配置读写走 `openclaw config` 命令**：避免直接操作 `openclaw.json`，减少格式漂移与未来兼容风险。
- **provider 选择采用“内置列表 + 自定义 id”**：覆盖已知 provider，同时允许未知/新 provider 通过自定义方式接入。
- **默认模型写入 `agents.defaults.model.primary`**：统一入口，避免重复写 `models.providers.<id>.models`。
- **Qwen 授权使用 CLI OAuth 流程**：调用 `openclaw models auth login --provider qwen-portal`，保持与官方流程一致。
- **API Key 明文保存**：当前版本以易用性为先，避免增加额外密钥管理与 UI 复杂度。

## Risks / Trade-offs

- **[明文存储密钥] → Mitigation**：在 UI 中提示风险，后续可扩展 SecretRef 方案。
- **[provider id/模型名填写错误导致不可用] → Mitigation**：提供内置列表与占位示例，并在保存前用 `openclaw config validate` 校验。
- **[命令白名单遗漏导致功能失败] → Mitigation**：为新增命令补齐 allowlist 与单测覆盖。

## Migration Plan

- 无需数据迁移。
- 保存配置时若文件不存在，`openclaw config set` 会自动创建并写入。
- 回滚：删除新增 IPC/界面逻辑即可，不影响已有配置文件。

## Open Questions

- 是否在 UI 中展示可用模型枚举（需依赖 provider API 或维护列表），当前默认使用自由输入。
