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

## OpenClaw 文档（参考）
- 文档入口：https://docs.openclaw.ai/zh-CN
- 功能与设置请优先参考文档导航中心/文档目录中的版块：快速开始、安装配置、文档目录、OpenClaw 助手、会话工具、渠道/路由、群组消息、Gateway 网关与运维、网络模型、平台、帮助与故障排除
