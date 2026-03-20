## 1. 主进程与命令支持

- [x] 1.1 在主进程新增模型配置 IPC handler（读取/保存/校验）并调用 `openclaw config` 命令
- [x] 1.2 在 preload 暴露 `getModelConfig`/`saveModelConfig`/`startQwenAuth`
- [x] 1.3 更新命令白名单允许 `openclaw config get/set/unset/validate` 与 `openclaw models auth login --provider qwen-portal`
- [x] 1.4 为 commandAllowlist 增加对应单测覆盖

## 2. 设置页 UI 与交互

- [x] 2.1 在设置页新增模型 API 配置表单（provider 选择、自定义 id、API Key、Base URL、默认模型）
- [x] 2.2 实现配置回显与保存逻辑（含保存中/成功/失败状态）
- [x] 2.3 新增 Qwen 授权区域与交互（授权按钮、进度与错误提示）
- [x] 2.4 增补输入控件与提示文案的样式（与现有设置页一致）

## 3. 验证与手动检查

- [x] 3.1 运行单测与本地验证（保存配置后可通过 `openclaw config get` 读取）
- [x] 3.2 手动校验 Qwen OAuth 与默认模型写入路径
