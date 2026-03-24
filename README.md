# better-sqlite3 Electron Builder

这个仓库专门用于构建可放入 Electron 应用中的 `better_sqlite3.node` 二进制产物。

默认目标矩阵：

- `darwin-arm64`
- `darwin-x64`
- `linux-x64`
- `win32-ia32`
- `win32-x64`

默认锁定版本：

- `better-sqlite3@12.6.0`
- `electron@35.2.1`
- `@electron/rebuild@3.7.2`

## 结论

这个仓库的 v1 设计不是“在一台 macOS 上稳定构建所有平台”。

- `macOS arm64/x64`：本机可构建
- `Linux x64`：通过 Docker 构建
- `Windows ia32/x64`：通过 Windows runner 构建

## 目录约定

每次构建后会生成：

```text
dist/
  darwin-arm64/better_sqlite3.node
  darwin-x64/better_sqlite3.node
  linux-x64/better_sqlite3.node
  win32-ia32/better_sqlite3.node
  win32-x64/better_sqlite3.node
  manifest.json
```

`.work/` 是每个平台独立的临时工作目录，避免不同平台的 `node_modules` 互相污染。

## 使用方式

先确认本机具备：

- Node.js 22+
- Python 3
- C/C++ 构建工具链
- macOS 需要 Xcode Command Line Tools
- Linux 构建需要 Docker

常用命令：

```bash
npm run build:mac:arm64
npm run build:mac:x64
npm run build:linux:x64
npm run build:all-local
```

Windows 构建命令主要给 Windows 环境或 CI 使用：

```bash
npm run build:win:ia32
npm run build:win:x64
```

## 构建策略

- 每个目标平台都会创建一个最小临时工程，只安装 `electron`、`@electron/rebuild` 和 `better-sqlite3`。
- 版本默认精确锁定在 `better-sqlite3@12.6.0`、`electron@35.2.1`、`@electron/rebuild@3.7.2`，不使用 `^` 范围，也不接受环境变量覆盖。
- 安装分两步：
  - 正常安装 `electron` 和 `@electron/rebuild`
  - 单独以 `--ignore-scripts` 安装 `better-sqlite3`
- 随后使用 `@electron/rebuild` 按 Electron 版本强制源码重编。
- 构建完成后会运行 Electron smoke test：
  - 加载 `better-sqlite3`
  - 执行 `SELECT 1`
- 通过后再把 `better_sqlite3.node` 复制到 `dist/<target>/`

## CI

仓库包含 GitHub Actions 工作流：

- macOS job：构建 `darwin-arm64` 和 `darwin-x64`
- Linux job：构建 `linux-x64`
- Windows job：构建 `win32-ia32` 和 `win32-x64`

## 注意事项

- `build:linux:x64` 在 macOS 上会通过 Docker 执行。
- Linux Docker 镜像会额外安装 Electron 运行时依赖库，用来完成容器内 smoke test。
- `build:win:*` 不支持在 macOS 上直接稳定构建，脚本会明确报错。
- 如果你的 Electron 应用最终需要别名文件名，例如继续叫 `node_sqlite3.node`，建议在消费方仓库做复制或重命名，而不是在这个构建仓库里混入应用兼容逻辑。
