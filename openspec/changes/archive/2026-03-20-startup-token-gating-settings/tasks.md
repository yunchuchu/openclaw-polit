## 1. 启动检查与 token 判定（主进程）

- [x] 1.1 在 openclaw 管理模块新增 dashboard URL token 判定函数，并补充单测
- [x] 1.2 扩展 startupBootstrap 返回结构（含 tokenReady 与错误码）并更新 IPC 类型
- [x] 1.3 调整启动流程：先做 token 检查，失败直接返回；gateway 启动失败时抛出错误供前端回退

## 2. 启动状态机与路由（渲染进程）

- [x] 2.1 更新 App 启动状态机：根据 startupBootstrap 结果决定进入控制台或跳设置基础配置
- [x] 2.2 启动失败/缺 token 时统一切到“设置 > 基础配置”并传递错误提示

## 3. 设置中心基础配置页

- [x] 3.1 SettingsPanel 新增“基础配置”页签并支持外部控制选中态
- [x] 3.2 迁移 InstallPanel 到基础配置页并完成事件与状态透传
- [x] 3.3 适配相关样式与文案（确保与现有设置布局一致）

## 4. 验收与回归

- [ ] 4.1 验证未安装/缺 token/正常安装三条启动路径
- [ ] 4.2 验证 gateway 启动失败回退到基础配置

## 5. 新增需求补充

- [x] 5.1 安装完成后自动执行 token 生成与重试逻辑（调用 openclaw doctor --generate-gateway-token）
- [x] 5.2 更新基础配置页安装完成按钮文案与跳转行为（仅跳转模型API配置）
- [x] 5.3 调整启动校验：仍以 URL token 为硬性条件，并在 token 生成失败时回退基础配置
- [x] 5.4 安装完成后自动检测 gateway.mode，未设置则写入 local
