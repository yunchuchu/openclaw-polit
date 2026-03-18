# OpenClaw Installer (Electron + Vue)

这是一个基于 Electron + Vue 3 的桌面安装器，用来在用户本机检测并安装运行 OpenClaw 所需环境，启动网关并嵌入仪表盘。主进程负责环境检测、依赖安装与 OpenClaw 生命周期管理；渲染进程展示进度、日志与仪表盘视图，二者通过 IPC 通信。

## 运行前提

- Node.js LTS（建议 22+）
- Git（用于开发与依赖获取）
- 安装过程中可能需要管理员权限（Windows/macOS）

## 启动运行（开发）

1. 安装依赖
   - `npm install`
2. 启动开发模式
   - `npm run dev`

## 其他常用命令

- 运行测试：`npm test`
- 构建应用：`npm run build`

## 关键资源说明

- Windows 便携 Git 包在 `resources/portable-git/windows`，打包时必须保留。
- 打包资源配置位于 `package.json` 的 `build` 段，以及 `electron.vite.config.ts`。

## 常见问题与排查

- 提示权限不足：请允许管理员授权后重试。
- 安装失败：点击 “Copy Logs” 复制日志用于排查。
- Windows PATH 未生效：重启终端或应用后再尝试。
