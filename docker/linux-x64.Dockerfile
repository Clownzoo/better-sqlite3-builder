ARG BASE_IMAGE=ubuntu:22.04
FROM node:22.17.0-bullseye AS node
FROM ${BASE_IMAGE}

COPY --from=node /usr/local/ /usr/local/

ENV DEBIAN_FRONTEND=noninteractive \
    CC=clang-22 \
    CXX=clang++-22

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    python3 \
    make \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Electron 43 的 V8 头文件需要支持 std::source_location 的编译器。
# 使用 LLVM 为 Jammy 构建的软件包，保留 Ubuntu 22.04 的运行库基线。
RUN curl --fail --show-error --silent --location \
      https://apt.llvm.org/llvm-snapshot.gpg.key \
      --output /usr/share/keyrings/llvm.asc \
  && echo 'deb [signed-by=/usr/share/keyrings/llvm.asc] https://apt.llvm.org/jammy/ llvm-toolchain-jammy-22 main' > /etc/apt/sources.list.d/llvm.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends clang-22 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
