# 项目重要说明

## 项目概览
- 这是一个基于 Electron + Vite 的桌面应用（`electron-vite`），前端使用 Vue 3。
- 包名：`openclaw-installer`（见 `package.json`）。

## 常用命令
- 开发：`npm run dev`
- 构建：`npm run build`
- 预览：`npm run preview`
- 测试：`npm run test`
- 测试（监听）：`npm run test:watch`

## 目录结构
- `src/main`：Electron 主进程代码
- `src/preload`：Preload 脚本
- `src/renderer`：渲染进程（Vue）代码
- `resources`：构建打包需要的资源
- `out`：构建产物

## 构建与资源
- `build.asarUnpack`：会解包 `resources/portable-git/windows/*.7z` 与 `*.7z.exe`
- `build.extraResources`：会将 `resources/portable-git/windows` 与 `resources/images` 拷贝到打包资源目录

## 代码与配置约定
- 项目使用 ESM（`package.json` 中 `type: "module"`）。
- TypeScript 配置：`tsconfig.json`、`tsconfig.node.json`。
- 单元测试使用 `vitest`。

## 说明
- 请优先保持现有项目结构与脚本约定不变。
- 若新增依赖或修改构建配置，请同步更新本文件。

## OpenClaw 控制流程（维护要点）
- Gateway 控制由主进程统一管理，状态以“本应用启动的进程”为准。
- 启动顺序：先生成/获取 Dashboard URL（并解析 token），再启动 Gateway 并传入 `--token`，避免 token mismatch。
- 启动前会执行 `openclaw gateway stop` 以清理旧服务占用。
- 关闭流程：先执行 `openclaw gateway stop`，再尝试终止本应用启动的进程（含进程树）。
- 关键实现位置：
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/index.ts`（控制流程与 IPC handler）
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/openclawManager.ts`（Gateway 进程启动参数）
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/preload/index.ts`（渲染进程桥接）
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/SettingsPanel.vue`（基础信息页操作入口）

## OpenClaw 控制常见问题与排查
- token mismatch：确保启动顺序为“先生成 token 再启动 gateway”，并在启动前执行 `openclaw gateway stop` 清理旧服务。
- 关闭无效：先执行 `openclaw gateway stop`，再终止本应用启动的 gateway 进程（含进程树）。
- 仍可进入控制台：说明系统中还有其他 gateway 服务在运行，需先 `openclaw gateway stop` 再启动。
- 控制台无法授权：检查 `openclaw -v` 是否可用，确认 OpenClaw 已安装。
- 安装后进入向导状态异常：进入安装向导前需重置安装状态，避免残留“安装中”状态。

## OpenClaw 文档（参考）
- 文档入口：https://docs.openclaw.ai/zh-CN
- 功能与设置请优先参考文档导航中心/文档目录中的版块：快速开始、安装配置、文档目录、OpenClaw 助手、会话工具、渠道/路由、群组消息、Gateway 网关与运维、网络模型、平台、帮助与故障排除
