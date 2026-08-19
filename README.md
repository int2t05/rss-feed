# RSS 订阅仪表盘

通用 RSS 源订阅：B站 UP 主、技术博客、GitHub Releases、新闻站等任意 RSS feed，统一聚合到一个静态网页。GitHub Actions 每 30 分钟拉取，GitHub Pages 托管。零服务器。

## 架构

```mermaid
flowchart LR
    A[config.txt 名称|URL] --> B[GitHub Actions 每30min]
    B --> C{URL 类型}
    C -->|直链 http| D[fetch + rss-parser]
    C -->|RSSHub /路由| E[实例池轮换 + rss-parser]
    D --> F[state.json 去重]
    E --> F
    F --> G[render.mjs 生成 index.html]
    G --> H[git push 回仓库]
    H --> I[GitHub Pages 展示]
```

纯拉取架构，零服务。直链源直接 fetch；B站等非 RSS 源走 RSSHub 公共实例池轮换。通用解析用 `rss-parser`（RSSHub 同款），支持 RSS 2.0/Atom/RDF + gzip 压缩 + Dublin Core。

## 部署

1. **Fork 仓库**（公开仓库 Actions 免费不占额度）
2. **编辑 `config.txt`**，添加订阅：
   ```
   名称 | URL
   DIYgod | /bilibili/user/video/2267573
   Cloudflare Blog | https://blog.cloudflare.com/rss/
   ```
   - 直链：完整 RSS/Atom URL
   - RSSHub 路由：`/` 开头（如 `/bilibili/user/video/UID`），自动拼实例池
3. **开启 GitHub Pages**：Settings → Pages → Source 选 `Deploy from a branch`，分支 `main` / `/root`
4. **手动触发首次同步**：Actions → `sync` → Run workflow
5. 约 1 分钟后访问 Pages URL

## 文件

| 文件 | 作用 |
| --- | --- |
| `config.txt` | 订阅列表，行式 `名称\|URL`，`#` 注释 |
| `instances.txt` | RSSHub 公共实例池（路由源用） |
| `scripts/fetch.mjs` | 同步核心：拉取 → 解析 → 去重 → 生成 |
| `scripts/render.mjs` | 紧凑文字列表渲染 |
| `state.json` | 去重状态，自动维护 |
| `index.html` | 仪表盘，自动生成 |
| `.github/workflows/sync.yml` | Actions 定时任务 |
| `docs/prd.md` `docs/tech.md` | 需求规格与技术架构 |

## 本地运行

```bash
npm install
node scripts/fetch.mjs
```

需 Node 22+。

## 约束

- 实时性：GitHub Actions cron 不保证准时，实际延迟 5–35 分钟，非真实时
- 抖音等强反爬源不稳定（依赖 RSSHub 实例的 Playwright 支持）
- B站等非 RSS 源依赖公共 RSSHub 实例可用性
- 合规：底层依赖非公开 API（B站等），个人自用，勿商业化

## 许可

MIT
