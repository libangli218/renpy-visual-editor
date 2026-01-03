# Implementation Plan: Ren'Py Visual Editor

## Overview

本实现计划将 Ren'Py Visual Editor 分解为可增量执行的任务。从项目初始化开始，逐步实现解析器、图构建器、UI 渲染和搜索功能。

## Tasks

- [ ] 1. 项目初始化和基础架构
  - [ ] 1.1 初始化 Electron + React + TypeScript 项目
    - 使用 electron-vite 或 electron-forge 创建项目
    - 配置 TypeScript、ESLint、Prettier
    - 设置 React Flow 依赖
    - _Requirements: 3.1_
  - [ ] 1.2 创建 AST 类型定义
    - 定义所有 AST 节点接口 (LabelNode, JumpNode, CallNode, MenuNode, DialogueNode 等)
    - 定义 SourceLocation、ParseError 等辅助类型
    - _Requirements: 1.1_
  - [ ] 1.3 创建 Graph 类型定义
    - 定义 FlowGraph、GraphNode、GraphEdge 接口
    - 定义 NodeData、DialogueSummary、ChoiceSummary 等类型
    - _Requirements: 2.1_

- [ ] 2. 实现 Ren'Py 解析器
  - [ ] 2.1 实现 Tokenizer
    - 实现词法分析器，识别关键字、标识符、字符串、缩进等
    - 处理注释和多行字符串
    - _Requirements: 1.1, 1.3_
  - [ ] 2.2 编写 Tokenizer 属性测试
    - **Property 2: Parser Statement Recognition**
    - **Validates: Requirements 1.3, 1.4, 1.5**
  - [ ] 2.3 实现 Parser 核心逻辑
    - 解析 label 语句（包括全局和局部标签）
    - 解析 jump 和 call 语句
    - 解析 menu 语句和选项
    - 解析对话语句
    - 解析 Python 块和内联表达式
    - _Requirements: 1.1, 1.3, 1.4_
  - [ ] 2.4 编写 Parser 属性测试
    - **Property 3: Parser Error Reporting**
    - **Validates: Requirements 1.2**
  - [ ] 2.5 实现 Pretty Printer
    - 将 AST 转换回 .rpy 格式
    - 保持正确的缩进和格式
    - _Requirements: 1.6_
  - [ ] 2.6 编写 Round-Trip 属性测试
    - **Property 1: Parser Round-Trip Consistency**
    - **Validates: Requirements 1.6**

- [ ] 3. Checkpoint - 解析器完成
  - 确保所有解析器测试通过，如有问题请询问用户

- [ ] 4. 实现 Graph Builder
  - [ ] 4.1 实现 AST 到 Graph 的转换
    - 为每个 label 创建 GraphNode
    - 为每个 menu 创建 GraphNode
    - 为 jump/call 创建 GraphEdge
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ] 4.2 编写 Graph 节点完整性属性测试
    - **Property 4: Graph Node Completeness**
    - **Validates: Requirements 2.2, 2.4**
  - [ ] 4.3 编写 Graph 边完整性属性测试
    - **Property 5: Graph Edge Completeness**
    - **Validates: Requirements 2.3**
  - [ ] 4.4 实现隐式 Fallthrough 边
    - 检测没有显式跳转的 label
    - 创建到下一个 label 的隐式边
    - _Requirements: 2.5_
  - [ ] 4.5 编写 Fallthrough 边属性测试
    - **Property 6: Implicit Fallthrough Edges**
    - **Validates: Requirements 2.5**

- [ ] 5. 实现多文件支持
  - [ ] 5.1 实现 File Manager
    - 扫描项目目录中的 .rpy 文件
    - 读取文件内容
    - _Requirements: 5.1_
  - [ ] 5.2 实现多文件 Graph 合并
    - 解析所有 .rpy 文件
    - 合并为统一的 FlowGraph
    - 处理跨文件的 label 引用
    - _Requirements: 5.2, 5.3_
  - [ ] 5.3 编写多文件合并属性测试
    - **Property 7: Multi-File Graph Merge**
    - **Validates: Requirements 5.2, 5.3**

- [ ] 6. Checkpoint - 核心逻辑完成
  - 确保所有核心逻辑测试通过，如有问题请询问用户

- [ ] 7. 实现 UI 渲染
  - [ ] 7.1 创建 React Flow 基础布局
    - 设置 React Flow 容器
    - 配置缩放和平移控制
    - _Requirements: 3.1, 3.6_
  - [ ] 7.2 实现自定义节点组件
    - LabelNode 组件（矩形，显示标签名）
    - MenuNode 组件（菱形，显示选项）
    - _Requirements: 3.2, 3.3_
  - [ ] 7.3 实现自定义边组件
    - 不同类型边的样式（jump、call、choice、fallthrough）
    - _Requirements: 3.4_
  - [ ] 7.4 实现节点点击交互
    - 点击高亮连接的边
    - 更新选中状态
    - _Requirements: 3.5_

- [ ] 8. 实现 Detail Panel
  - [ ] 8.1 创建 Detail Panel 组件
    - 显示选中节点的详细信息
    - 显示 label 内的对话列表
    - 显示 menu 的选项和目标
    - _Requirements: 4.1, 4.2_
  - [ ] 8.2 实现源码行号显示和跳转
    - 显示每个元素的源文件和行号
    - 双击打开外部编辑器
    - _Requirements: 4.3, 4.4_
  - [ ] 8.3 编写节点详情数据一致性测试
    - **Property 9: Node Detail Data Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 9. 实现搜索功能
  - [ ] 9.1 实现搜索逻辑
    - 按 label 名称搜索
    - 按角色名称搜索
    - 按对话文本搜索
    - _Requirements: 6.1, 6.2_
  - [ ] 9.2 编写搜索准确性属性测试
    - **Property 8: Search Result Accuracy**
    - **Validates: Requirements 6.1, 6.2**
  - [ ] 9.3 实现搜索 UI
    - 搜索输入框
    - 结果列表
    - 高亮匹配节点
    - 点击结果定位到节点
    - _Requirements: 6.3, 6.4_

- [ ] 10. 实现 Electron 主进程
  - [ ] 10.1 实现文件系统 IPC
    - 打开文件/文件夹对话框
    - 读取文件内容
    - 监视文件变化
    - _Requirements: 5.1_
  - [ ] 10.2 实现外部编辑器集成
    - 调用系统默认编辑器打开文件
    - 跳转到指定行号
    - _Requirements: 4.4_

- [ ] 11. Final Checkpoint - 功能完成
  - 确保所有测试通过
  - 使用 the_question 示例项目进行集成测试
  - 如有问题请询问用户

## Notes

- 所有任务（包括测试任务）都必须执行以确保代码质量
- 每个任务都引用了具体的需求以便追溯
- Checkpoint 任务用于阶段性验证
- 属性测试验证核心正确性属性
