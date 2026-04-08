# better-sqlite3 Electron Builder

这个仓库专门用于构建可放入 Electron 应用中的 `better_sqlite3.node` 二进制产物。

默认目标矩阵：

- `darwin-arm64`
- `darwin-x64`
- `linux-x64`
- `win32-ia32`
- `win32-x64`

锁定版本：

- `better-sqlite3@12.6.0`
- `electron@35.2.1`
- `@electron/rebuild@3.7.2`

## 平台支持基线

- Windows: 10 及以上
- macOS: 11 (Big Sur) 及以上
- Linux: Ubuntu Desktop 22.04 及以上

## Linux 构建说明

- `linux-x64` 目标在 Docker 内构建，当前基线镜像为 `node:22-bookworm`
- 该镜像对应较新的 glibc（约 2.36），与 Ubuntu 22.04+ 支持范围一致
- CI 会在构建后输出 `better_sqlite3.node` 的 `GLIBC_*` 符号，便于兼容性排查
