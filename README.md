# better-sqlite3 Electron Builder

这个仓库专门用于构建可放入 Electron 应用中的 `better_sqlite3.node` 二进制产物。

默认目标矩阵：

- `darwin-arm64`
- `darwin-x64`
- `linux-x64`
- `win32-ia32`
- `win32-x64`

锁定版本：

- `better-sqlite3@12.11.1`
- `electron@43.8.6`
- `@electron/rebuild@3.7.2`

## 平台支持基线

- Windows: 10 及以上
- macOS: 12 (Monterey) 及以上
- Linux: Ubuntu Desktop 22.04 及以上

## Linux 构建说明

- `linux-x64` 目标在 `ubuntu:22.04` Docker 镜像内构建并运行 Electron 验证，glibc 基线为 `2.35`
- 构建使用官方 Node.js 22.17.0 镜像中的 Node/npm，以及 Ubuntu 自带的 Clang 14 工具链
- CI 会在构建后校验 `better_sqlite3.node` 的 `GLIBC_*` 符号上限，超出基线时直接失败

## 构建验证

- 每个目标都在指定版本和架构的 Electron 中验证原生模块加载、WAL、事务提交与回滚、BLOB，以及关闭后重新打开的数据持久化
- macOS ARM 使用 `macos-15` 构建机，Intel 使用 `macos-15-intel`；构建机版本不代表已在最低支持版本的系统上完成验收
