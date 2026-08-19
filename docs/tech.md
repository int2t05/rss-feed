# TECH · RSS 订阅仪表盘技术架构

## 1. 架构总览

```mermaid
flowchart LR
    A[config.txt<br/>名称|URL] --> B[GitHub Actions 每30min]
    B --> C{URL 类型}
    C -->|直链 http| D[fetch + rss-parser]
    C -->|RSSHub /路由| E[实例池轮换 fetch + rss-parser]
    D --> F[state.json 去重]
    E --> F
    F --> G[render.mjs 生成 index.html]
    G --> H[git push 回仓库]
    H --> I[GitHub Pages 展示]
```

**纯拉取架构**：消费端只做拉取-解析-去重-渲染，零服务。不部署 RSSHub，不内置反爬逻辑。

## 2. 核心组件

### 2.1 config.txt — 订阅配置
行式 `名称 | URL`，URL 自动识别直链（`http`）/RSSHub 路由（`/`）。

### 2.2 instances.txt — RSSHub 实例池
公共实例列表，按成功率排序，RSSHub 路由源失败时轮换。

### 2.3 scripts/fetch.mjs — 同步核心
- 解析 `名称 | URL`
- 二路分发：
  - `/` 开头 → 实例池轮换 fetch + rss-parser
  - `http` 开头 → 直接 fetch + rss-parser
- 去重 key = URL，新 ID 置前合并保留 100 条
- 失败源保留旧 state，记录错误
- 调 `render.mjs` 生成 HTML + 写 state.json

### 2.4 scripts/render.mjs — 前端渲染
紧凑文字列表，极简暗色。导出 `relTime`/`esc`/`renderHTML`。

### 2.5 state.json — 去重状态
`{ url: [条目ID...] }`，仓库内提交持久化。

### 2.6 .github/workflows/sync.yml — 定时任务
`actions/checkout@v5` → `setup-node@v5` → `npm ci` → `node scripts/fetch.mjs` → git commit/push。concurrency 防并发。

## 3. 通用 RSS 解析

用 `rss-parser`（RSSHub 同款 `rss-parser@3.13.0`），支持：
- RSS 2.0 / Atom / RDF 三种格式
- gzip / deflate / brotli 压缩
- Dublin Core `dc:date`
- CDATA 与实体转义

解析字段：`{ title, link, id(=guid 或 link), pubDate, author }`。

**为何不用自写正则**：已踩坑（CDATA vs 实体转义、dc:date、压缩），RSSHub 自身也用此库，对齐其实现更稳。

## 4. 数据流

```
config.txt ──→ fetch.mjs
                 │
                 ├─ 直链源 ──→ fetch → rss-parser ──→ items[]
                 ├─ RSSHub源 ─→ 实例池轮换 → rss-parser ──→ items[]
                 │
                 ├─ state.json 去重 ──→ fresh[] + items[]
                 │
                 ├─ render.mjs ──→ index.html
                 └─ state.json 写回
```

## 5. 去重设计

- key：源 URL（通用唯一）
- value：条目 ID 数组（`guid` 优先，fallback `link` 末段）
- 新条目 ID 置前，`[...new Set([...fresh, ...old])].slice(0, 100)`
- 源失败：`newState[key] = state[key] || []`（保留旧）

## 6. 前端设计

紧凑文字列表，极简暗色：
- 每源区块：源名 + 平台小标（URL 推断）+ 新条数 badge
- 每条一行 `<a>`：相对时间（灰小字）+ 标题
- 新条目左侧色条
- `#0d1117` 底 / `#c9d1d9` 字，小字号松行高，`@media(prefers-color-scheme:light)` 浅色自适应
- 纯文字，零图片

## 7. 部署

- 公开仓库 `int2t05/rss-feed`
- GitHub Pages：main / root
- Actions：`cron: "*/30 * * * *"` + `workflow_dispatch`
- git 作者：`int2t05 <2103859514@qq.com>`
- 重建 git 历史（单干净初始 commit）

## 8. 依赖

- `rss-parser@^3.13.0`（唯一运行时依赖）
- Node 22+（fetch、`import.meta.dirname`、`AbortSignal.timeout`）

## 9. 文件结构

```
rss-feed/
├── config.txt              # 订阅列表 名称|URL
├── instances.txt           # RSSHub 实例池
├── package.json            # rss-parser 依赖
├── state.json              # 去重状态（自动维护）
├── index.html              # 仪表盘（自动生成）
├── .gitignore
├── LICENSE                 # AGPL-3.0（沿用，无 RSSHub 代码提取后可换 MIT，待定）
├── README.md
├── docs/
│   ├── prd.md              # 本 PRD
│   ├── tech.md             # 本 TECH
│   └── research/           # 源码级调研报告
└── scripts/
    ├── fetch.mjs           # 同步核心
    └── render.mjs          # 前端渲染
```

## 10. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| RSSHub 公共实例限流/挂 | 实例池轮换 + 失败保留旧 state |
| 抖音强反爬不稳 | 接受偶发失败，下次重试 |
| Actions cron 延迟 | 架构硬约束，向用户明示近实时 |
| B站等非 RSS 源依赖实例 | 实例池多源轮换降低单点风险 |
