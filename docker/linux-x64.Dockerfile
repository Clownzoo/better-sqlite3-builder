ARG BASE_IMAGE=ubuntu:22.04
FROM node:22.17.0-bullseye AS node
FROM ${BASE_IMAGE}

COPY --from=node /usr/local/ /usr/local/

ENV DEBIAN_FRONTEND=noninteractive \
    CC=clang-14 \
    CXX=clang++-14

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    clang-14 \
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

WORKDIR /workspace
