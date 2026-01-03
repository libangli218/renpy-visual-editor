# Requirements Document

## Introduction

Ren'Py Visual Editor 是一个可视化工具，用于将 Ren'Py (.rpy) 脚本文件解析并以流程图形式展示。MVP 阶段专注于只读可视化，帮助开发者快速理解剧情结构和分支逻辑。

## Glossary

- **Parser**: 解析器，负责将 .rpy 文件转换为抽象语法树 (AST)
- **Flow_Graph**: 流程图，以节点和边的形式展示剧情结构
- **Label_Node**: 标签节点，代表 Ren'Py 中的 label 语句
- **Jump_Edge**: 跳转边，代表 jump/call 语句形成的连接
- **Menu_Node**: 菜单节点，代表 menu 选项分支
- **Dialogue_Node**: 对话节点，代表角色对话
- **Editor**: 可视化编辑器应用程序

## Requirements

### Requirement 1: 解析 Ren'Py 脚本文件

**User Story:** As a 视觉小说开发者, I want to 加载并解析 .rpy 文件, so that I can 在可视化界面中查看剧情结构。

#### Acceptance Criteria

1. WHEN a user selects a .rpy file, THE Parser SHALL parse it into an abstract syntax tree
2. WHEN the .rpy file contains syntax errors, THE Parser SHALL return descriptive error messages with line numbers
3. THE Parser SHALL recognize label, jump, call, menu, and dialogue statements
4. THE Parser SHALL handle Python blocks and inline Python expressions
5. THE Parser SHALL preserve source line information for each parsed element
6. FOR ALL valid .rpy files, THE Pretty_Printer SHALL format AST back into valid .rpy syntax (round-trip property)

### Requirement 2: 生成流程图数据结构

**User Story:** As a 视觉小说开发者, I want to 将解析结果转换为流程图, so that I can 直观地看到剧情的分支和跳转关系。

#### Acceptance Criteria

1. WHEN parsing completes successfully, THE Editor SHALL generate a Flow_Graph from the AST
2. THE Flow_Graph SHALL contain Label_Node for each label statement
3. THE Flow_Graph SHALL contain Jump_Edge for each jump and call statement
4. THE Flow_Graph SHALL contain Menu_Node for each menu with its options as child nodes
5. WHEN a label has no explicit jump, THE Flow_Graph SHALL create an implicit edge to the next label

### Requirement 3: 渲染可视化流程图

**User Story:** As a 视觉小说开发者, I want to 在图形界面中查看流程图, so that I can 快速理解整个剧情的结构。

#### Acceptance Criteria

1. WHEN a Flow_Graph is generated, THE Editor SHALL render it as an interactive node graph
2. THE Editor SHALL display Label_Node as rectangular nodes with the label name
3. THE Editor SHALL display Menu_Node as diamond-shaped nodes with options listed
4. THE Editor SHALL display Jump_Edge as directed arrows between nodes
5. WHEN a user clicks on a node, THE Editor SHALL highlight all connected edges
6. THE Editor SHALL support zoom and pan operations on the graph

### Requirement 4: 节点详情预览

**User Story:** As a 视觉小说开发者, I want to 点击节点查看详细内容, so that I can 了解每个场景的具体对话和逻辑。

#### Acceptance Criteria

1. WHEN a user clicks on a Label_Node, THE Editor SHALL display the dialogues within that label
2. WHEN a user clicks on a Menu_Node, THE Editor SHALL display all menu options and their targets
3. THE Editor SHALL display the source line number for each element
4. WHEN a user double-clicks on a node, THE Editor SHALL open the source file at the corresponding line

### Requirement 5: 项目文件管理

**User Story:** As a 视觉小说开发者, I want to 加载整个 Ren'Py 项目, so that I can 查看所有脚本文件的完整流程图。

#### Acceptance Criteria

1. WHEN a user opens a Ren'Py project folder, THE Editor SHALL scan and list all .rpy files
2. THE Editor SHALL parse all .rpy files and merge them into a unified Flow_Graph
3. WHEN multiple files contain cross-file jumps, THE Editor SHALL correctly link them
4. THE Editor SHALL display file boundaries in the Flow_Graph with visual distinction

### Requirement 6: 搜索和过滤

**User Story:** As a 视觉小说开发者, I want to 搜索特定的标签或对话, so that I can 快速定位到感兴趣的内容。

#### Acceptance Criteria

1. WHEN a user enters a search query, THE Editor SHALL filter nodes matching the query
2. THE Editor SHALL support searching by label name, character name, and dialogue text
3. WHEN search results are found, THE Editor SHALL highlight matching nodes in the graph
4. WHEN a user selects a search result, THE Editor SHALL center the view on that node
