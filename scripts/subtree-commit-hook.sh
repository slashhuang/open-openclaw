#!/bin/bash
# .git-hooks/post-commit (需要复制到 .git/hooks/)
# 自动记录 subtree 同步状态

# 记录每次提交涉及的 subtree 目录
git diff --name-only HEAD^ HEAD 2>/dev/null | while read file; do
    dir=$(echo "$file" | cut -d'/' -f1)
    if [[ -d "$dir" && "$dir" != ".git" ]]; then
        echo "[$dir] 变更：$file" >> .git/subtree-changes.log
    fi
done
