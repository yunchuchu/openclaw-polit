## Context

当前应用在启动时会尝试启动 gateway 并拉取控制台 URL，但缺少对 token 是否已配置的明确判断。安装向导位于主页面，设置中心与安装/修复流程割裂。我们需要把“启动检查 + 基础配置”统一到设置中，减少失败路径分散。

约束：
- 继续沿用现有 IPC 与 OpenClaw CLI 能力，不引入新依赖。
- token 判定采用 dashboard URL 中 `#token=` 或 `token=` 作为依据（按当前规则保留 URL 强校验）。
- 当 URL 不含 token 时，按文档推荐使用 `openclaw doctor --generate-gateway-token` 生成 token 并重试获取 URL。
- 当 gateway.mode 未设置时，自动设置为 `local`，确保网关可启动。

## Goals / Non-Goals

**Goals:**
- 启动时明确判断安装与 token 状态，只有满足条件才进入控制台。
- 失败或 token 缺失时统一跳转“设置 > 基础配置”。
- 将安装/授权流程迁移到设置页，成为唯一入口。

**Non-Goals:**
- 不修改 OpenClaw CLI 的行为与输出格式。
- 不引入新的 OAuth/模型 provider 配置流程。

## Decisions

1. **token 判定基于 dashboard URL**
   - 方案：执行 `openclaw dashboard --no-open`，解析 URL 是否包含 `#token=` 或 `token=`。
   - 备选：解析本地配置文件或调用额外 CLI 查询命令。
   - 决策原因：现有流程已依赖 dashboard URL，改动范围小、实现成本低。

2. **启动失败统一跳转设置-基础配置**
   - 方案：任何无法带 token 进入控制台的情况，直接切换到基础配置页签。
   - 备选：先显示 home-error，再手动跳转设置。
   - 决策原因：减少分支路径，让用户始终在同一入口修复问题。

3. **安装向导迁移到设置页**
   - 方案：在设置新增“基础配置”页签，复用现有 InstallPanel 组件。
   - 备选：保留主界面安装页并在设置仅放入口。
   - 决策原因：统一入口、减少重复逻辑与状态机分支。

4. **安装完成后自动补齐 token**
   - 方案：安装完成后先拉取 dashboard URL；若不含 token，执行 `openclaw doctor --generate-gateway-token`，再重试获取 URL。
   - 备选：仅提示用户去模型配置或手动配置 token。
   - 决策原因：减少用户手动步骤，并匹配文档推荐的生成方式。

5. **“Qwen自动授权/API手动配置”按钮只负责跳转**
   - 方案：安装完成后的按钮只跳转到“模型API配置”，由用户选择 Qwen OAuth 或手动填写。
   - 备选：点击后自动触发 Qwen OAuth。
   - 决策原因：流程更清晰，避免自动触发造成干扰。

6. **安装后自动补齐 gateway.mode**
   - 方案：安装完成后读取 `gateway.mode`，未设置则自动写入 `local`。
   - 备选：仅提示用户手动配置。
   - 决策原因：避免网关启动被阻止，降低初次使用门槛。

## Risks / Trade-offs

- **[openclaw dashboard 不可用导致误判]** → 若命令失败视为 token 缺失并引导设置，同时在基础配置页展示错误提示。
- **[token 存在但已失效]** → 启动 gateway 可能失败，再次回落到基础配置并提示重新授权。
- **[设置页承载更多功能导致信息密度高]** → 通过新增“基础配置”页签隔离，避免影响其它设置项。
- **[doctor 生成 token 失败]** → 记录错误提示并停留在基础配置页，引导用户前往模型API配置手动修复。
- **[gateway.mode 自动设置失败]** → 提示用户手动执行 `openclaw config set gateway.mode local` 并回退基础配置。

## Migration Plan

- 应用更新后自动生效；无数据迁移。
- 回滚仅需恢复旧版启动/设置逻辑。

## Open Questions

- 暂无。
