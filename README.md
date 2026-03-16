# claw-sources Monorepo

这是一个 monorepo 工作空间，用于整合一方代码和外部参考代码。

## 目录结构

```
claw-sources/
├── claw-family/           # 主仓库代码 (upstream: slashhuang/claw-family)
├── futu-openD/            # 一方代码 (upstream: slashhuang/futu-openD)
└── external-refs/         # 外部依赖目录（仅供阅读/参考）
    └── openclaw/          # 外部参考代码 (upstream: openclaw/openclaw)
```

## 设计理念

- **Monorepo 作为"壳"**：提供完整的代码上下文，方便 AI 辅助开发
- **各目录保持独立**：每个子目录可以独立拆分、独立运行
- **外部依赖隔离**：`external-refs/` 目录下的代码不参与构建，仅供参考

## Git Subtree 同步

### 使用同步脚本（推荐）

```bash
# 查看所有 subtree 状态
./scripts/subtree-sync.sh status

# 从上游拉取所有 subtree 更新
./scripts/subtree-sync.sh pull

# 推送所有 subtree 到上游
./scripts/subtree-sync.sh push

# 同步单个 subtree
./scripts/subtree-sync.sh sync claw-family
./scripts/subtree-sync.sh sync claw-family push
```

### 手动命令

**从上游拉取更新**

```bash
# 同步 claw-family
git subtree pull --prefix claw-family claw-family-upstream main --squash

# 同步 futu-openD
git subtree pull --prefix futu-openD futu-openD-upstream main --squash

# 同步 openclaw（外部参考）
git subtree pull --prefix external-refs/openclaw openclaw-upstream main --squash
```

### 推送更改到上游

```bash
# 推送到 claw-family
git subtree push --prefix claw-family claw-family-upstream main

# 推送到 futu-openD
git subtree push --prefix futu-openD futu-openD-upstream main
```

| Remote 名称 | URL | 用途 |
|------------|-----|------|
| origin | git@github.com:slashhuang/claw-sources | **本 monorepo** |
| claw-family-upstream | git@github.com:slashhuang/claw-family | 主仓库 |
| futu-openD-upstream | git@github.com:slashhuang/futu-openD | 一方代码 |
| openclaw-upstream | git@github.com:openclaw/openclaw | 外部参考 |

## Subtree 配置说明

每个 subtree 目录都配置了独立的 upstream remote，可以独立同步：

| 目录 | Upstream Remote | 分支 |
|------|----------------|------|
| claw-family | claw-family-upstream | main |
| futu-openD | futu-openD-upstream | main |
| external-refs/openclaw | openclaw-upstream | main |

## 拆分出独立仓库

如果需要将某个目录拆分成独立的仓库：

```bash
# 从当前历史中过滤出 claw-family 目录
git filter-repo --subdirectory-filter claw-family
```

或者使用 git subtree split：

```bash
git subtree split --prefix claw-family -b claw-family-standalone
```

## 注意事项

1. `external-refs/` 目录已在 `.gitignore` 中配置，但当前为了版本控制已纳入管理
2. 推送代码时请注意不要将敏感信息推送到公共仓库
3. 各子目录的 `.git` 已移除，统一由 monorepo 管理版本
