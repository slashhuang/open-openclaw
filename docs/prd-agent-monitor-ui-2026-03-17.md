# PRD：OpenClaw Agent Monitor UI（Agent 监控仪表盘）

**文档状态：** 待评审  
**创建日期：** 2026-03-17  
**提出人：** 晓刚（爸爸）  
**撰写人：** 阿布  
**优先级：** P0（高）  
**预计工期：** 10-15 天（MVP 5 天 + 增强 5-10 天）

---

## 1. 背景与目标

### 1.1 背景痛点

当前 OpenClaw 用户面临以下监控盲区：

| 痛点 | 现状 | 影响 |
|------|------|------|
| **任务等待焦虑** | 提交任务后不知道执行状态 | 用户反复检查日志、无法安心 |
| **健康状态不明** | Gateway 挂了才知道 | 服务中断时间长 |
| **执行进度黑盒** | 无法查看任务执行到哪一步 | 无法判断是否卡住 |
| **性能不可观测** | 无端到端延迟、工具耗时数据 | 无法优化慢的环节 |
| **多 Agent 管理困难** | 未来 10+ Agent 无统一入口 | 管理成本高 |

### 1.2 竞品调研（GitHub OpenClaw 生态）

**已调研 3 个成熟项目：**

| 项目 | 技术栈 | 核心优势 | 我们的差异化 |
|------|--------|---------|-------------|
| **Jarvis-dashboard** | FastAPI + Vue | 模型用量看板、API Key 管理 | Hook 生命周期 Metrics（更细粒度） |
| **OpenClawWatchdog** | Node.js + TS | 自动恢复、会话规则匹配 | Session Key 深度分析 + 并发控制可视化 |
| **ClawPanel** | Go + React | 单二进制、拓扑图、插件市场 | NestJS 企业级架构 + OpenClaw 原生集成 |

### 1.3 产品定位

**Open Web UI for Agents** —— OpenClaw 的统一监控、管理、调试界面

- **不是**漂亮的 ToC 产品
- **是**信息密度高、实用的 ToB 监控工具
- **类比**：tmux（多会话管理）+ Wordpress /wp-admin（一站式管理）
- **学习借鉴**：Jarvis-dashboard（模型用量）、Watchdog（自动恢复）、ClawPanel（拓扑图）

### 1.4 目标用户

| 用户 | 使用场景 | 核心需求 |
|------|---------|---------|
| **开发者**（爸爸） | 调试技能、监控任务、查看性能 | 实时日志、Metrics、会话回溯 |
| **运维人员** | 监控 Gateway 健康、API 配额 | 健康检查、告警、资源统计 |
| **高级用户**（妈妈） | 查看任务进度、管理配置 | 简单仪表盘、快速操作 |

### 1.5 成功指标

- [ ] 任务状态可实时查看（延迟 < 1s）
- [ ] Gateway 健康状态一目了然
- [ ] 端到端延迟 P95 < 5s（正常任务）
- [ ] 支持 10+ 并发会话监控
- [ ] 用户无需查看 PM2 日志即可定位问题

---

## 2. 功能需求

### 2.1 功能范围（一期 MVP）

| 模块 | 功能 | 优先级 | 工期 |
|------|------|--------|------|
| **健康检查** | Gateway 状态、技能列表、API 配额 | P0 | 1 天 |
| **会话管理** | 会话列表、历史回溯、上下文查看 | P0 | 2 天 |
| **实时日志** | 日志流、按会话/技能过滤 | P0 | 1 天 |
| **Metrics** | Hook 耗时、P50/P95、工具调用统计 | P1 | 2 天 |
| **快速操作** | 重启 Gateway、启用/禁用技能 | P1 | 1 天 |
| **用户认证** | 爸爸/妈妈不同权限 | P2 | 1 天 |

### 2.2 详细功能说明

#### 2.2.1 健康检查（`/admin/health`）

**功能描述：** 展示 Gateway 运行状态、技能列表、API 配额

**页面元素：**
- Gateway 状态卡片（运行中/已停止、内存、CPU、运行时长）
- 技能列表（名称、启用状态、最后调用时间）
- API 配额卡片（今日调用次数、剩余额度、消耗速率）
- 最后心跳时间（超过 5 分钟告警）

**数据来源：**
- PM2 API（进程状态）
- OpenClaw sessions API（技能列表）
- 环境变量（API 配额）

**验收标准：**
- [ ] 页面加载时间 < 2s
- [ ] 状态实时更新（每 10s 轮询或 WebSocket 推送）
- [ ] Gateway 停止时显示红色告警

---

#### 2.2.2 会话管理（`/admin/sessions`）

**功能描述：** 查看活跃会话、历史会话、会话详情

**OpenClaw 核心概念：**
- **Session Key**：每个会话的唯一标识（如 `calm-lagoon`、`tidal-bloom`）
- **Session ID**：底层会话 ID（用于 `sessions_history` 等 API）
- **会话状态**：active（活跃）、idle（空闲）、completed（已完成）、failed（失败）
- **并发控制**：Max Concurrent Sessions（最大并发会话数）

**页面元素：**
- 会话列表（Session Key、Session ID、用户、状态、最后活跃时间、耗时）
- 并发状态卡片（当前并发数 / 最大并发数、排队任务数）
- 搜索框（按 Session Key、用户、关键词搜索）
- 会话详情（对话记录、工具调用、子 Agent 状态、资源消耗）
- 导出按钮（导出会话为 JSON/Markdown）
- 终止按钮（终止卡住的会话）

**数据来源：**
- OpenClaw sessions API（`sessions_list`、`sessions_history`、`session_status`）
- PM2 API（资源消耗）

**验收标准：**
- [ ] 支持按时间范围筛选
- [ ] 支持关键词搜索（记忆内容、工具调用）
- [ ] 会话详情支持展开/折叠
- [ ] 导出功能正常
- [ ] **显示 Session Key 和 Session ID 的映射关系**
- [ ] **显示当前并发数和最大并发数**
- [ ] **支持按状态筛选（active/idle/completed/failed）**

---

#### 2.2.3 实时日志（`/admin/logs`）

**功能描述：** 实时查看 Gateway 日志、按会话/技能过滤

**页面元素：**
- 日志流（时间戳、级别、内容）
- 过滤条件（会话 ID、技能名称、日志级别）
- 暂停/继续按钮
- 下载按钮（下载日志文件）

**数据来源：**
- PM2 日志文件（`~/.pm2/logs/`）
- OpenClaw 日志（`workspace/logs/`）

**验收标准：**
- [ ] 日志延迟 < 1s
- [ ] 支持关键词高亮
- [ ] 支持暂停查看（不影响日志采集）
- [ ] 自动滚动到底部（未暂停时）

---

#### 2.2.4 Metrics 监控（`/admin/metrics`）

**功能描述：** 基于 Hook 生命周期的性能指标 + OpenClaw 特有指标

**Hook 埋点：**

| Hook | 采集指标 | 说明 |
|------|---------|------|
| `message:received` | 时间戳 | 用户消息接收时间 |
| `memory:search` | 耗时 | 记忆检索耗时 |
| `tool:call` | 耗时、成功率 | 按工具类型分组（web_search、feishu、exec...） |
| `subagent:spawn` | 耗时、成功率 | 子 Agent 启动耗时 |
| `subagent:complete` | 耗时 | 子 Agent 执行耗时 |
| `message:reply` | 耗时 | 回复生成耗时 |
| **端到端** | 总耗时 | 用户输入 → 回复发送 |

**OpenClaw 特有指标：**
- **Session Key 分布**：各 Session Key 的请求量、耗时分布
- **并发利用率**：当前并发数 / Max Concurrent、排队任务数
- **Agent 处理队列**：等待处理的任务数、平均等待时间
- **子 Agent 并发**：同时运行的 subagents 数量、失败率
- **会话生命周期**：会话创建 → 活跃 → 空闲 → 完成/失败的转化率

**页面元素：**
- 延迟仪表盘（P50、P95、P99）
- 工具调用成功率（饼图）
- **并发利用率（仪表盘：当前并发 / Max Concurrent）**
- **Session Key TOP 10（表格：Session Key、请求量、平均耗时）**
- 子 Agent 失败率（折线图）
- API 配额消耗速率（柱状图）
- 热点技能 TOP 10（表格）
- **会话状态分布（饼图：active/idle/completed/failed）**
- **健康状态分类**（参考 Watchdog）：HEALTHY ✅、DEGRADED ⚠️、UNHEALTHY 🔴、CRITICAL 🚨
- **会话规则匹配统计**（按 `default`、`agent:main:*`、`agent:sub:*` 分组）

**数据来源：**
- SQLite 数据库（存储 Hook 埋点数据）
- OpenClaw sessions API（`sessions_list` 获取并发状态）
- 聚合查询（计算 P50/P95/P99）

**验收标准：**
- [ ] 数据延迟 < 1 分钟
- [ ] 支持按时间范围筛选（最近 1 小时/24 小时/7 天）
- [ ] 图表支持缩放、导出
- [ ] **显示 Max Concurrent 配置值和当前利用率**
- [ ] **支持按 Session Key 筛选和分组**

---

#### 2.2.5 快速操作（`/admin/actions`）

**功能描述：** 常用操作快捷入口 + 自动恢复（参考 OpenClawWatchdog）

**功能列表：**
- 重启 Gateway（调用 `pm2 restart`）
- 启用/禁用技能（修改配置文件）
- 终止卡住的任务（调用 `sessions_kill`）
- 查看/修改配置（bot.json、skills 配置）
- 清理日志（释放磁盘空间）
- **自动恢复策略配置**（参考 Watchdog）：
  - Gateway 故障自动重启（最大尝试次数、冷却时间）
  - 模型故障自动切换（备用模型优先顺序）
  - 会话规则匹配（`default`、`agent:main:*`、`agent:sub:*`）

**验收标准：**
- [ ] 操作前需二次确认
- [ ] 操作后显示执行结果
- [ ] 敏感操作需管理员权限
- [ ] **自动恢复策略可配置**
- [ ] **支持会话规则匹配（按 Session Key 前缀）**

---

#### 2.2.6 用户认证（`/admin/login`）

**功能描述：** 爸爸/妈妈不同权限

**权限设计：**

| 权限 | 爸爸（admin） | 妈妈（viewer） |
|------|-------------|--------------|
| 查看健康状态 | ✅ | ✅ |
| 查看会话 | ✅ | ✅（仅自己的会话） |
| 查看 Metrics | ✅ | ✅ |
| 重启 Gateway | ✅ | ❌ |
| 修改配置 | ✅ | ❌ |
| 终止任务 | ✅ | ❌ |

**验收标准：**
- [ ] 支持飞书登录（SSO）或账号密码
- [ ] 权限控制生效
- [ ] 未登录用户重定向到登录页

---

## 3. 技术方案

### 3.1 系统架构

```
┌─────────────────────────────────────────────────┐
│                 OpenClaw Gateway                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   PM2       │  │   Hooks     │  │Sessions │ │
│  │  (进程管理)  │  │ (生命周期)  │ │  API    │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Agent Monitor UI (NestJS + TypeScript)  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  Modules    │  │  Gateway    │  │ Metrics │ │
│  │  (模块化)    │  │ (WebSocket)  │ │采集器   │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Health    │  │  Sessions   │  │  Logs   │ │
│  │   Module    │  │   Module    │ │ Module  │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Frontend (React + Tailwind)        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  Dashboard  │  │  Sessions   │  │ Metrics │ │
│  │  (健康检查)  │  │  (会话管理)  │ │ (指标)  │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                  SQLite (Metrics)               │
│  存储 Hook 埋点数据、聚合查询结果                  │
└─────────────────────────────────────────────────┘
```

### 3.2 技术选型

| 组件 | 方案 | 理由 |
|------|------|------|
| **Web 框架** | **NestJS** | **TypeScript、模块化、依赖注入、装饰器、企业级** |
| 前端框架 | React + Tailwind | 快速开发、组件丰富、响应式 |
| 实时通信 | Socket.IO (@nestjs/websockets) | NestJS 原生集成、自动重连、房间管理 |
| Metrics 存储 | SQLite (better-sqlite3) | 轻量、无需额外部署、单文件、同步 API |
| 进程管理 | PM2 API | 直接复用现有能力 |
| 部署方式 | 独立 PM2 进程 | 与 Gateway 分离、独立端口、互不影响 |

### 3.3 Hook 埋点设计

**埋点数据结构：**

```json
{
  "id": "uuid",
  "timestamp": 1710676800000,
  "hook": "tool:call",
  "session_id": "session_123",
  "tool_name": "web_search",
  "duration_ms": 1234,
  "success": true,
  "error": null,
  "metadata": {
    "query": "Open Web UI features",
    "count": 5
  }
}
```

**SQLite 表结构：**

```sql
-- Hook 埋点数据
CREATE TABLE hook_metrics (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  hook TEXT NOT NULL,
  session_key TEXT,           -- OpenClaw Session Key（如 calm-lagoon）
  session_id TEXT,            -- 底层 Session ID
  tool_name TEXT,
  duration_ms INTEGER,
  success BOOLEAN,
  error TEXT,
  metadata TEXT               -- JSON 字符串
);

-- 并发状态快照（每分钟记录一次）
CREATE TABLE concurrency_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  current_concurrent INTEGER NOT NULL,
  max_concurrent INTEGER NOT NULL,
  queue_length INTEGER NOT NULL,
  active_sessions INTEGER NOT NULL
);

-- Session Key 统计（每小时聚合）
CREATE TABLE session_key_stats (
  hour INTEGER NOT NULL,
  session_key TEXT NOT NULL,
  request_count INTEGER NOT NULL,
  avg_duration_ms INTEGER NOT NULL,
  p95_duration_ms INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  PRIMARY KEY (hour, session_key)
);

CREATE INDEX idx_timestamp ON hook_metrics(timestamp);
CREATE INDEX idx_hook ON hook_metrics(hook);
CREATE INDEX idx_session_key ON hook_metrics(session_key);
CREATE INDEX idx_session_id ON hook_metrics(session_id);
CREATE INDEX idx_concurrency_timestamp ON concurrency_snapshots(timestamp);
```

### 3.4 API 设计（NestJS REST + WebSocket）

**REST API：**

| 接口 | 方法 | Module | 说明 |
|------|------|--------|------|
| `/api/health` | GET | HealthModule | Gateway 健康状态 |
| `/api/sessions` | GET | SessionsModule | 会话列表（含 Session Key、状态、并发数） |
| `/api/sessions/:id` | GET | SessionsModule | 会话详情（含对话记录、工具调用） |
| `/api/sessions/:id/status` | GET | SessionsModule | 会话状态（active/idle/completed/failed） |
| `/api/metrics/latency` | GET | MetricsModule | 延迟指标（P50/P95/P99） |
| `/api/metrics/tools` | GET | MetricsModule | 工具调用统计 |
| `/api/metrics/subagents` | GET | MetricsModule | 子 Agent 统计 |
| `/api/metrics/concurrency` | GET | MetricsModule | **并发指标（当前并发/Max Concurrent、排队数）** |
| `/api/metrics/session-keys` | GET | MetricsModule | **Session Key 分布（请求量、耗时）** |
| `/api/actions/restart` | POST | ActionsModule | 重启 Gateway |
| `/api/actions/kill-session/:id` | POST | ActionsModule | 终止会话 |
| `/api/actions/update-concurrency` | POST | ActionsModule | **更新 Max Concurrent 配置** |

**WebSocket Gateway：**

| 事件 | 方向 | 说明 |
|------|------|------|
| `logs:subscribe` | Client → Server | 订阅日志流 |
| `logs:unsubscribe` | Client → Server | 取消订阅 |
| `logs:new` | Server → Client | 新日志推送 |
| `metrics:update` | Server → Client | Metrics 数据更新 |
| `health:change` | Server → Client | 健康状态变化 |

---

## 4. 实施计划

### 4.1 阶段划分

| 阶段 | 内容 | 工期 | 交付物 |
|------|------|------|--------|
| **阶段一** | 调研与设计 | 1-2 天 | PRD、线框图、技术设计 |
| **阶段二** | MVP 开发 | 3-5 天 | 健康检查、会话管理、实时日志 |
| **阶段三** | Metrics 开发 | 3-5 天 | Hook 埋点、指标展示 |
| **阶段四** | 增强功能 | 3-5 天 | 快速操作、用户认证、告警 |
| **阶段五** | 测试与优化 | 2-3 天 | Bug 修复、性能优化 |

### 4.2 详细任务列表

#### 阶段一：调研与设计（1-2 天）
- [x] 调研 Open Web UI 功能特点
- [ ] 梳理 OpenClaw 现有 Hook 列表
- [ ] 画线框图（确定 UI 布局）
- [ ] 设计数据库表结构
- [ ] 评审 PRD

#### 阶段二：MVP 开发（3-5 天）
- [ ] 搭建 NestJS Web 服务器
- [ ] 实现 `/api/health` 接口（健康状态分类：HEALTHY/DEGRADED/UNHEALTHY/CRITICAL）
- [ ] 实现 `/api/sessions` 接口（含 Session Key、会话规则匹配）
- [ ] 实现 `/api/logs` WebSocket
- [ ] 前端 Dashboard 页面
- [ ] 前端 Sessions 页面
- [ ] 前端 Logs 页面
- [ ] 集成 PM2 状态监控
- [ ] **实现会话规则匹配**（按 Session Key 前缀：default、agent:main:*、agent:sub:*）

#### 阶段三：Metrics 开发（3-5 天）
- [ ] 设计 Hook 埋点规范
- [ ] 实现 Metrics 采集器（SQLite）
- [ ] 实现 `/api/metrics/*` 接口
- [ ] 前端 Metrics 页面（图表）
- [ ] 聚合查询优化

#### 阶段四：增强功能（3-5 天）
- [ ] 实现快速操作接口
- [ ] 实现用户认证（飞书 SSO）
- [ ] 实现权限控制
- [ ] 实现告警功能（Gateway 停止、API 配额不足）
- [ ] 前端 Actions 页面

#### 阶段五：测试与优化（2-3 天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试（并发 10+ 会话）
- [ ] Bug 修复
- [ ] 文档编写

---

## 5. 风险与依赖

### 5.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| Hook 埋点影响性能 | 延迟增加 | 异步采集、批量写入 |
| WebSocket 连接不稳定 | 日志丢失 | 自动重连、降级轮询 |
| SQLite 并发写入 | 性能瓶颈 | WAL 模式、连接池 |
| PM2 API 兼容性问题 | 功能不可用 | 降级方案（直接读日志文件） |

### 5.2 依赖项

| 依赖 | 状态 | 负责人 |
|------|------|--------|
| OpenClaw sessions API | 已有 | OpenClaw 团队 |
| PM2 API | 已有 | PM2 团队 |
| 飞书 SSO | 需申请 | 爸爸 |
| 前端组件库 | 开源 | 社区 |

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 所有 P0 功能正常
- [ ] 所有 P1 功能正常
- [ ] 用户认证和权限控制生效
- [ ] 实时日志延迟 < 1s
- [ ] Metrics 数据延迟 < 1 分钟

### 6.2 性能验收

- [ ] 页面加载时间 < 2s
- [ ] 支持 10+ 并发会话监控
- [ ] SQLite 写入不影响主流程
- [ ] 内存占用 < 200MB

### 6.3 用户体验验收

- [ ] 界面简洁、信息密度高
- [ ] 支持移动端查看
- [ ] 错误提示清晰
- [ ] 操作有二次确认

---

## 7. 后续迭代（二期）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **告警通知** | Gateway 停止、API 配额不足时推送飞书 | P1 |
| **插件生态** | 支持第三方监控插件 | P2 |
| **多实例监控** | 监控多个 OpenClaw 实例 | P2 |
| **Prometheus 集成** | 导出 Metrics 到 Prometheus | P2 |
| **自动化运维** | 自动重启、自动扩容 | P3 |

---

## 8. 附录

### 8.1 参考资料

- Open Web UI: https://github.com/open-webui/open-webui
- OpenWebUI-Monitor: https://github.com/VariantConst/OpenWebUI-Monitor
- PM2 API: https://pm2.keymetrics.io/docs/usage/quick-start/
- Socket.IO: https://socket.io/

### 8.2 相关文件

- 灵感文档：`inspiration/agent-monitor-ui-2026-03-17.md`
- 技术设计：`docs/tech-design-agent-monitor-ui.md`（待创建）

---

**PRD 状态：** 待评审  
**下一步：** 爸爸评审 PRD → 确认后进入阶段二（MVP 开发）
