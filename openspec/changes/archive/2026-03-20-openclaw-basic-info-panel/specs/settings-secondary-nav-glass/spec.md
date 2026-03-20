## MODIFIED Requirements

### Requirement: 左侧二级菜单为设置页主导航
设置页 MUST 在内容区最左侧显示二级菜单，并包含以下固定条目且保持顺序：
1. 基础配置
2. openclaw 卸载
3. 模型API配置
4. 重置配置文件

#### Scenario: 左侧菜单条目与顺序校验
- **WHEN** 设置页左侧菜单渲染完成
- **THEN** 菜单按顺序显示「基础配置」「openclaw 卸载」「模型API配置」「重置配置文件」
