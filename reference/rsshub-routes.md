# RSSHub 路由速查表

> 本项目订阅源的参考手册。RSSHub 把"非 RSS 站点"转成 RSS feed，支持 1600+ 平台。

## 1. 路由格式

config.txt 每行 `名称 | URL | 显示条数(可选)`：

- **直链**：完整 RSS/Atom URL，如 `https://blog.cloudflare.com/rss/`
- **RSSHub 路由**：`/` 开头，如 `/bilibili/user/video/2267573`，自动拼实例池 URL

RSSHub 路由完整 URL = `实例地址 + 路由`，如 `https://rsshub.rssforever.com/zhihu/daily`。

## 2. 已验证可用路由

以公共实例实测，返回 XML + 有数据：

| 路由 | 条数 | 说明 |
| --- | --- | --- |
| `/zhihu/daily` | 30 | 知乎日报 |
| `/juejin/trending/ai/weekly` | 20 | 掘金 AI 周榜 |
| `/solidot` | 20 | Solidot 科技新闻 |
| `/v2ex/topics/hot` | 8 | V2EX 热门话题 |
| `/github/trending/daily/python` | 1 | GitHub Trending（可换语言） |
| `/sspai/matrix` | 2 | 少数派 Matrix |
| `/anthropic/news` | 1 | Anthropic 新闻 |

**B站路由**：公共实例对 B站普遍风控，本项目走 B站 API 直连，不依赖实例。

## 3. 常用平台路由速查

### B站（API 直连，不走实例）
- `/bilibili/user/video/:uid` — UP 主投稿，uid 在 `space.bilibili.com/:uid`
- `/bilibili/favlists/:uid` — 收藏夹

> B站路由需配 `BILIBILI_COOKIE`（详见 README）。

### 知乎
- `/zhihu/daily` — 知乎日报
- `/zhihu/hotlist` — 热榜
- `/zhihu/people/answers/:uid` — 用户回答

### 掘金
- `/juejin/trending/:category/:type` — 趋势，type: day/week/month
- `/juejin/posts/:uid` — 用户文章

### GitHub
- `/github/trending/daily/:language` — Trending
- `/github/release/:user/:repo` — Releases
- `/github/issue/:user/:repo` — Issues

### 微博 / 微信
- `/weibo/user/:uid` — 用户微博（实例支持有限）
- `/wechat/ggboy` — 公众号（多数需专用实例）

### 科技媒体
- `/solidot` — Solidot
- `/sspai/matrix` — 少数派
- `/huxiu/article` — 虎嗅
- `/36kr/newsflashes` — 36氪快讯
- `/ithome/ranking` — IT之家

### 海外
- `/anthropic/news` `/anthropic/engineering` — Anthropic
- `/openai/blog` — OpenAI
- `/deepmind/blog` — Google DeepMind
- `/twitter/user/:id` — X/Twitter（多数实例已禁）

## 4. 实例池

`instances.txt` 列公共实例，按成功率排序，失败自动轮换。可添加：
- `https://rsshub.rssforever.com`
- `https://hub.slarker.me`
- `https://rsshub.pseudoyu.com`
- `https://rsshub.app`（官方，限流）

实例可用性动态变化，路由 503 时换实例或等下次同步重试。

## 5. 添加新源

1. 查 [RSSHub 文档](https://docs.rsshub.app/routes) 找路由
2. 用 `curl https://rsshub.rssforever.com<路由>` 验证返回 XML + 有 item
3. 加到 `config.txt`：`名称 | /路由`
4. push，下次 sync 自动拉取

直链源（博客/Atom）直接加完整 URL，无需实例。**优先用直链**：OpenAI/DeepMind/HuggingFace/arXiv/Hacker News/V2EX/少数派/36氪/机器之心/IT之家 等均有原生 RSS，直链比 RSSHub 路由更稳。

B站源需配 `BILIBILI_COOKIE` Secret（见上节），否则热门 UP 易风控。
