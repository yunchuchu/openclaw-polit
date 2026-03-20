## 1. 主进程与 IPC 能力

- [x] 1.1 在主进程维护 Gateway 进程引用与运行状态，监听退出以回落状态
- [x] 1.2 新增 IPC：`gateway:status`、`gateway:stop`、`gateway:restart`、`openclaw:info`
- [x] 1.3 将新 IPC 接入 `/src/main/ipc.ts` 与 `/src/main/index.ts` 的 handler 注册

## 2. 预加载桥接与类型

- [x] 2.1 在 `/src/preload/index.ts` 暴露新方法：`getGatewayStatus`、`stopGateway`、`restartGateway`、`getOpenclawInfo`
- [x] 2.2 在渲染进程补齐调用与返回类型（本地类型/状态结构）

## 3. 设置页 UI 与交互

- [x] 3.1 更新设置左侧菜单：移除“关闭重启”，保持“基础配置”默认选中
- [x] 3.2 新增隐藏子页 `install-wizard` 并接入安装向导组件
- [x] 3.3 在“基础配置”渲染基础信息卡片（版本/安装/运行）与按钮逻辑
- [x] 3.4 接入启动/关闭/重启操作与状态刷新（仅控制本应用启动的 Gateway）

## 4. 样式与可视化

- [x] 4.1 添加基础信息卡片的行/栅格样式，保持简洁干净
- [x] 4.2 补齐按钮/状态信息的对齐与响应式细节

## 5. 回归验证

- [x] 5.1 验证未安装场景：显示安装入口并能进入安装向导子页
- [x] 5.2 验证已安装未运行：显示启动按钮并可启动成功
- [x] 5.3 验证运行中：显示关闭/重启且状态可正确更新
