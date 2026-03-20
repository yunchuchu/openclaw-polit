## ADDED Requirements

### Requirement: 基础配置展示 OpenClaw 基础信息卡片
设置页的“基础配置”页签 MUST 展示 OpenClaw 基础信息卡片，包含版本号、安装状态、运行状态三项信息。

#### Scenario: 进入基础配置
- **WHEN** 用户进入设置页并查看“基础配置”
- **THEN** 页面显示包含版本号、安装状态、运行状态的基础信息卡片

### Requirement: 未安装时提供安装入口
当检测到 OpenClaw 未安装时，基础信息卡片 MUST 显示“安装”按钮，并在点击后进入安装向导子页。

#### Scenario: 点击安装入口
- **WHEN** 基础信息卡片显示“安装”按钮且用户点击
- **THEN** 系统切换到隐藏的安装向导子页并展示安装向导内容

### Requirement: 运行控制按钮按状态显示
当 OpenClaw 已安装时，基础信息卡片 MUST 根据运行状态显示控制按钮：运行中显示“关闭”“重启”，未运行显示“启动”。

#### Scenario: 运行中显示关闭与重启
- **WHEN** OpenClaw 已安装且运行状态为运行中
- **THEN** 页面显示“关闭”“重启”按钮且不显示“启动”按钮

#### Scenario: 未运行显示启动
- **WHEN** OpenClaw 已安装且运行状态为未运行
- **THEN** 页面显示“启动”按钮且不显示“关闭”“重启”按钮

### Requirement: 运行状态以本应用启动的 Gateway 为准
运行状态 MUST 仅以本应用启动的 OpenClaw Gateway 进程为依据，不检测系统中的其他 OpenClaw 进程。

#### Scenario: 仅跟踪本应用进程
- **WHEN** 系统中存在非本应用启动的 OpenClaw 进程
- **THEN** 页面运行状态不因其变化而更新

### Requirement: 启动/关闭/重启按钮触发对应操作
点击“启动”“关闭”“重启”按钮 MUST 触发对应操作，并在操作完成后刷新基础信息卡片状态。

#### Scenario: 点击启动
- **WHEN** 用户点击“启动”按钮
- **THEN** 系统启动 Gateway 并刷新运行状态为运行中

#### Scenario: 点击关闭
- **WHEN** 用户点击“关闭”按钮
- **THEN** 系统停止 Gateway 并刷新运行状态为未运行

#### Scenario: 点击重启
- **WHEN** 用户点击“重启”按钮
- **THEN** 系统停止并重新启动 Gateway，刷新运行状态为运行中
