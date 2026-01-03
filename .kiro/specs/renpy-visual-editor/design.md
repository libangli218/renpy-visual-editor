# Design Document: Ren'Py Visual Editor

## Overview

Ren'Py Visual Editor 是一个桌面应用程序，用于将 Ren'Py (.rpy) 脚本文件解析并以交互式流程图形式展示。该工具帮助视觉小说开发者快速理解剧情结构、分支逻辑和跳转关系。

MVP 版本专注于只读可视化功能，采用 Electron + React 技术栈，使用 TypeScript 开发。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ File System │  │   IPC       │  │  Window Management  │  │
│  │   Access    │  │   Bridge    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer Process                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    React Application                 │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │    │
│  │  │  Parser   │  │  Graph    │  │   React Flow  │   │    │
│  │  │  Module   │──▶│  Builder  │──▶│   Renderer   │   │    │
│  │  └───────────┘  └───────────┘  └───────────────┘   │    │
│  │        │                              │             │    │
│  │        ▼                              ▼             │    │
│  │  ┌───────────┐                 ┌───────────────┐   │    │
│  │  │   AST     │                 │  Detail Panel │   │    │
│  │  │  Types    │                 │               │   │    │
│  │  └───────────┘                 └───────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Parser Module

负责将 .rpy 文件解析为 AST（抽象语法树）。

```typescript
// AST Node Types
interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

interface BaseNode {
  type: string;
  location: SourceLocation;
}

interface LabelNode extends BaseNode {
  type: 'label';
  name: string;
  parameters?: string[];
  isLocal: boolean;
  parentLabel?: string;
  body: StatementNode[];
}

interface JumpNode extends BaseNode {
  type: 'jump';
  target: string;
  isExpression: boolean;
}

interface CallNode extends BaseNode {
  type: 'call';
  target: string;
  arguments?: string[];
  isExpression: boolean;
}

interface MenuNode extends BaseNode {
  type: 'menu';
  label?: string;
  prompt?: DialogueNode;
  choices: MenuChoice[];
}

interface MenuChoice {
  text: string;
  condition?: string;
  body: StatementNode[];
}

interface DialogueNode extends BaseNode {
  type: 'dialogue';
  speaker?: string;
  text: string;
}

interface SceneNode extends BaseNode {
  type: 'scene';
  image: string;
  transition?: string;
}

interface ShowNode extends BaseNode {
  type: 'show';
  image: string;
  attributes: string[];
  transition?: string;
}

interface PythonNode extends BaseNode {
  type: 'python';
  code: string;
  isBlock: boolean;
}

interface IfNode extends BaseNode {
  type: 'if';
  condition: string;
  thenBody: StatementNode[];
  elseBody?: StatementNode[];
}

interface ReturnNode extends BaseNode {
  type: 'return';
  expression?: string;
}

type StatementNode = 
  | LabelNode 
  | JumpNode 
  | CallNode 
  | MenuNode 
  | DialogueNode 
  | SceneNode 
  | ShowNode 
  | PythonNode 
  | IfNode 
  | ReturnNode;

interface RenpyScript {
  filename: string;
  statements: StatementNode[];
  errors: ParseError[];
}

interface ParseError {
  message: string;
  location: SourceLocation;
}
```

### 2. Parser Implementation

```typescript
interface Parser {
  parse(content: string, filename: string): RenpyScript;
  parseFile(filepath: string): Promise<RenpyScript>;
  parseProject(projectPath: string): Promise<RenpyScript[]>;
}

// Tokenizer
interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

enum TokenType {
  KEYWORD,      // label, jump, call, menu, if, etc.
  IDENTIFIER,   // names
  STRING,       // "text" or 'text'
  NUMBER,
  OPERATOR,     // :, =, etc.
  INDENT,
  DEDENT,
  NEWLINE,
  EOF
}
```

### 3. Graph Builder

将 AST 转换为流程图数据结构。

```typescript
interface FlowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  files: string[];
}

interface GraphNode {
  id: string;
  type: 'label' | 'menu' | 'dialogue' | 'end';
  label: string;
  file: string;
  line: number;
  data: NodeData;
}

interface NodeData {
  // For label nodes
  labelName?: string;
  dialogues?: DialogueSummary[];
  
  // For menu nodes
  choices?: ChoiceSummary[];
  
  // For dialogue nodes (when shown separately)
  speaker?: string;
  text?: string;
}

interface DialogueSummary {
  speaker?: string;
  text: string;
  line: number;
}

interface ChoiceSummary {
  text: string;
  condition?: string;
  targetNodeId?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'jump' | 'call' | 'choice' | 'fallthrough';
  label?: string;
  condition?: string;
}

interface GraphBuilder {
  build(scripts: RenpyScript[]): FlowGraph;
}
```

### 4. React Flow Renderer

使用 React Flow 库渲染交互式流程图。

```typescript
interface FlowRendererProps {
  graph: FlowGraph;
  onNodeClick: (node: GraphNode) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  searchQuery?: string;
  highlightedNodes?: string[];
}

// Custom Node Components
interface LabelNodeProps {
  data: {
    label: string;
    dialogueCount: number;
    file: string;
    isHighlighted: boolean;
  };
}

interface MenuNodeProps {
  data: {
    choices: ChoiceSummary[];
    isHighlighted: boolean;
  };
}
```

### 5. Detail Panel

显示节点详细信息的侧边栏。

```typescript
interface DetailPanelProps {
  selectedNode: GraphNode | null;
  onOpenSource: (file: string, line: number) => void;
}
```

### 6. File Manager

管理项目文件的加载和监视。

```typescript
interface FileManager {
  openProject(path: string): Promise<ProjectInfo>;
  openFile(path: string): Promise<string>;
  watchProject(path: string, callback: (event: FileEvent) => void): void;
  stopWatching(): void;
}

interface ProjectInfo {
  path: string;
  name: string;
  rpyFiles: string[];
}

interface FileEvent {
  type: 'add' | 'change' | 'delete';
  path: string;
}
```

## Data Models

### Project State

```typescript
interface ProjectState {
  isLoaded: boolean;
  projectPath: string | null;
  projectName: string | null;
  files: FileInfo[];
  scripts: RenpyScript[];
  graph: FlowGraph | null;
  parseErrors: ParseError[];
}

interface FileInfo {
  path: string;
  name: string;
  lastModified: Date;
}
```

### UI State

```typescript
interface UIState {
  selectedNodeId: string | null;
  searchQuery: string;
  searchResults: string[];
  zoomLevel: number;
  panPosition: { x: number; y: number };
  detailPanelOpen: boolean;
  fileListOpen: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



### Property 1: Parser Round-Trip Consistency

*For any* valid Ren'Py AST, printing it to .rpy format and then parsing the result should produce an equivalent AST structure.

**Validates: Requirements 1.6**

### Property 2: Parser Statement Recognition

*For any* .rpy content containing label, jump, call, menu, or dialogue statements, the Parser should correctly identify each statement type and preserve its source line information.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 3: Parser Error Reporting

*For any* .rpy content with syntax errors, the Parser should return error messages that include the correct line number where the error occurred.

**Validates: Requirements 1.2**

### Property 4: Graph Node Completeness

*For any* valid AST, the generated Flow_Graph should contain exactly one node for each label statement and one node for each menu statement in the AST.

**Validates: Requirements 2.2, 2.4**

### Property 5: Graph Edge Completeness

*For any* valid AST containing jump or call statements, the generated Flow_Graph should contain corresponding edges linking source and target nodes.

**Validates: Requirements 2.3**

### Property 6: Implicit Fallthrough Edges

*For any* label in the AST that does not end with a jump, call, or return statement, the Flow_Graph should contain an implicit edge to the next sequential label.

**Validates: Requirements 2.5**

### Property 7: Multi-File Graph Merge

*For any* set of .rpy scripts with cross-file label references, the merged Flow_Graph should correctly link jump/call edges across file boundaries.

**Validates: Requirements 5.2, 5.3**

### Property 8: Search Result Accuracy

*For any* search query and Flow_Graph, the search function should return all and only the nodes whose label name, character name, or dialogue text contains the query string.

**Validates: Requirements 6.1, 6.2**

### Property 9: Node Detail Data Consistency

*For any* node in the Flow_Graph, clicking on it should return detail data that matches the corresponding AST node's content (dialogues for labels, options for menus).

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Parse Errors

```typescript
interface ParseErrorHandler {
  // Collect errors during parsing without stopping
  collectError(error: ParseError): void;
  
  // Return all collected errors
  getErrors(): ParseError[];
  
  // Check if parsing can continue
  canContinue(): boolean;
}
```

错误处理策略：
1. **容错解析** - 遇到语法错误时，跳过当前语句，继续解析后续内容
2. **错误聚合** - 收集所有错误，一次性展示给用户
3. **部分渲染** - 即使有解析错误，也渲染已成功解析的部分

### File System Errors

```typescript
interface FileError {
  type: 'not_found' | 'permission_denied' | 'invalid_encoding' | 'unknown';
  path: string;
  message: string;
}
```

### Graph Building Errors

```typescript
interface GraphError {
  type: 'missing_label' | 'circular_reference' | 'invalid_target';
  source: string;
  target?: string;
  message: string;
}
```

## Testing Strategy

### Unit Tests

单元测试覆盖以下场景：
- Tokenizer 对各种 token 类型的识别
- Parser 对各种语句类型的解析
- Graph Builder 的节点和边生成
- Search 功能的匹配逻辑

### Property-Based Tests

使用 fast-check 库进行属性测试：

```typescript
import fc from 'fast-check';

// 配置：每个属性测试至少运行 100 次
const propertyConfig = { numRuns: 100 };
```

属性测试覆盖：
1. **Round-trip property** - 解析 → 打印 → 解析 应产生等价 AST
2. **Statement recognition** - 所有语句类型都被正确识别
3. **Graph completeness** - 图包含所有必要的节点和边
4. **Search accuracy** - 搜索返回正确的结果集

### Test Data Generators

```typescript
// 生成随机有效的 label 名称
const labelNameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')),
  { minLength: 1, maxLength: 20 }
);

// 生成随机对话文本
const dialogueTextArb = fc.string({ minLength: 1, maxLength: 200 });

// 生成随机 label 语句
const labelStatementArb = fc.record({
  name: labelNameArb,
  dialogues: fc.array(dialogueTextArb, { minLength: 0, maxLength: 5 })
});

// 生成随机 menu 语句
const menuStatementArb = fc.record({
  prompt: fc.option(dialogueTextArb),
  choices: fc.array(
    fc.record({
      text: dialogueTextArb,
      target: labelNameArb
    }),
    { minLength: 2, maxLength: 5 }
  )
});

// 生成随机有效的 .rpy 脚本
const rpyScriptArb = fc.record({
  labels: fc.array(labelStatementArb, { minLength: 1, maxLength: 10 }),
  menus: fc.array(menuStatementArb, { minLength: 0, maxLength: 5 })
});
```

### Integration Tests

集成测试使用真实的 Ren'Py 示例项目（如 the_question）验证：
- 完整项目的解析
- 多文件合并
- 跨文件跳转链接
