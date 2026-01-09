# Ren'Py Visual Editor

> 让视觉小说创作变得简单直观

一款专为 [Ren'Py](https://www.renpy.org/) 视觉小说引擎设计的可视化编辑器。无需编写代码，通过直观的图形界面创作你的故事。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28.x-47848F.svg)

## ✨ 特性

### 🎭 故事模式 (Story Mode)
以线性时间轴的方式编辑你的剧本，所见即所得。

### 🧩 积木模式 (Block Mode)
类似 Scratch 的积木式编程，拖拽组合即可创建复杂的游戏逻辑。

### 🔀 流程图模式 (Flow Mode)
可视化展示故事分支和跳转关系，轻松管理复杂的剧情结构。

### 📦 资源管理
- 角色立绘管理与预览
- 背景图片分类浏览
- 音频资源快速导入
- 缩略图自动生成

### 🎮 实时预览
内置预览引擎，边编辑边查看效果。一键启动 Ren'Py 测试游戏。

### 💾 无缝兼容
- 完整解析 Ren'Py 脚本语法
- 双向同步：可视化编辑 ↔ 代码
- 打开现有项目，立即开始编辑

## 🚀 快速开始

### 系统要求
- Windows 10+ / macOS 10.15+ / Linux
- [Ren'Py SDK](https://www.renpy.org/latest.html) (用于测试游戏)

### 安装

从 [Releases](https://github.com/your-repo/renpy-visual-editor/releases) 下载适合你系统的安装包：

- **Windows**: `Ren'Py Visual Editor Setup.exe`
- **macOS**: `Ren'Py Visual Editor.dmg`
- **Linux**: `Ren'Py Visual Editor.AppImage`

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-repo/renpy-visual-editor.git
cd renpy-visual-editor

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建发布版本
npm run build
```

## 📖 使用指南

### 创建新项目
1. 启动编辑器
2. 点击 "新建项目"
3. 选择项目位置和模板
4. 开始创作！

### 打开现有项目
1. 点击 "打开项目"
2. 选择包含 `game` 文件夹的 Ren'Py 项目目录
3. 编辑器会自动解析所有 `.rpy` 脚本文件

### 编辑模式切换
使用顶部工具栏在不同编辑模式间切换：
- **故事模式**: 适合线性剧情编辑
- **积木模式**: 适合逻辑和流程控制
- **流程图模式**: 适合查看整体结构

### 资源导入
1. 在左侧面板选择 "资源" 标签
2. 点击对应分类的 "+" 按钮
3. 选择要导入的图片或音频文件
4. 文件会自动复制到项目的 `game` 目录

## 🛠️ 开发

### 技术栈
- **框架**: Electron + React 18
- **语言**: TypeScript
- **状态管理**: Zustand
- **代码编辑器**: Monaco Editor
- **流程图**: React Flow
- **构建工具**: Vite

### 项目结构
```
renpy-visual-editor/
├── electron/           # Electron 主进程
│   ├── main/          # 主进程入口
│   └── preload/       # 预加载脚本
├── src/               # React 渲染进程
│   ├── components/    # UI 组件
│   ├── parser/        # Ren'Py 脚本解析器
│   ├── generator/     # 代码生成器
│   ├── store/         # 状态管理
│   └── types/         # TypeScript 类型定义
└── templates/         # 项目模板
```

### 常用命令
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run test         # 运行测试
npm run lint         # 代码检查
npm run typecheck    # 类型检查
```

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详情。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Ren'Py](https://www.renpy.org/) - 强大的视觉小说引擎
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React Flow](https://reactflow.dev/) - 流程图组件库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code 的代码编辑器

---

<p align="center">
  用 ❤️ 为视觉小说创作者打造
</p>
