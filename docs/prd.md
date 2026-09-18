# PRD · RSS 订阅仪表盘

## 1. 背景与目标

订阅分散在多平台的更新源（B站 UP 主、YouTube、arXiv 论文、技术博客、GitHub Releases、新闻站等），统一聚合到一个静态网页，主动查看最新更新。

**目标**：零服务器、零运维成本，GitHub 托管的通用 RSS 订阅仪表盘。

**非目标**：
- 不做账号体系、多用户
- 不做被动推送通知（仅主动查看网页）
- 不部署 RSSHub 等中间服务（用公共实例）
- 不做视频内嵌播放、缩略图展示（纯链接列表）

## 2. 用户场景

1. 在 `config.txt` 添加一行 `名称 | URL`（直链或 RSSHub 路由）
2. GitHub Actions 每 30 分钟自动拉取、去重、更新网页
3. 浏览器打开 Pages URL，侧边栏切分类、时间筛选，卡片列表浏览条目，点击直达原文

## 3. 功能需求

### 3.1 订阅配置
- 分类头 `[id|标题|主题色]`，源行 `名称 | URL`
- URL 两种：
  - 完整直链（`https://...rss.xml` / `.atom`）
  - RSSHub 路由（`/开头`，如 `/bilibili/user/video/UID`）
- 支持空行、`#` 注释
- 类别与源完全由 config 驱动，新增/删除类别只需改 config

### 3.2 分类体系（7 类，139 源）

| 分类 ID | 标题 | 源数 | 说明 |
|---|---|---|---|
| `video` | 视频 | 21 | B站学术/官方 UP + YouTube 科技频道 + FluxSift（cpolar 隧道） |
| `ai` | AI 动态 | 24 | Anthropic/OpenAI/DeepMind 等 AI 实验室 + 研究者博客 |
| `arxiv` | arXiv 论文 | 30 | 全 CS 分类 + 统计/物理/数学/生物交叉 |
| `papers` | 会议/期刊 | 10 | ACL Anthology/JMLR/Nature/Science/MIT/Stanford 等 |
| `tech` | 技术博客 | 25 | Netflix/Spotify/Meta + Uber/Stripe/Discord/Go/Python 官方 |
| `news` | 资讯媒体 | 12 | Solidot/机器之心/量子位/Ars Technica/MIT Tech Review 等 |
| `community` | 开发者社区 | 17 | HN/V2EX/Reddit + auto-trend 日报 RSS |

### 3.3 数据拉取
- B站路由（`/bilibili/user/video/:uid`）：直连 B站 API（WBI 签名 + 匿名 buvid + dm_img 指纹），避开公共 RSSHub 实例对 B站的风控
- 直链：直接 fetch + 通用 RSS 解析
- 其他 RSSHub 路由：拼公共实例池 URL，失败自动轮换
- 单源超时 15s，失败标记错误（不中断其他源）
- 通用解析支持 RSS 2.0 / Atom / RDF，含 gzip 压缩、Dublin Core 日期

### 3.4 去重
- 每源维护已见条目 ID 集合（`state.json`）
- 仅新条目标记，旧条目正常展示
- 每源保留最近 100 条 ID，避免无限增长
- 源失败时保留旧状态，不丢失历史

### 3.5 展示
- 左侧侧边栏：搜索框 + 分类列表（源色点 + 标题 + 条目数徽章 + 失败源⚠徽章）+ 失败源折叠区（源名 + 错误摘要）+ 时间筛选（全部/24h/7天/30天）
- 主区域：头部（当前筛选 + 条目数 + 更新时间 + 视图切换）+ 卡片列表 / 日历视图
- 卡片式条目：源色点 + 源名 + 标题（2 行截断）+ 摘要预览 + 相对时间 + 分类标签 + 未读蓝点
- 24h 内条目 `.fresh` 高亮（左侧色条 + 标题橙色）；新条目 `.unread` 浅蓝背景
- 列表视图：无限滚动替代分页（IntersectionObserver，每批 50 条，400px 预加载）
- 日历视图：月历网格（今日高亮、选中日蓝框、日期格显示条目数 + 分类色点）+ 点日期下半区显示该日条目；月份导航 ‹/›/今天 + 方向键切月
- 已读状态：localStorage 持久化，点击卡片标记已读，新条目（freshIds）显示未读蓝点
- 搜索防抖（180ms），匹配标题与源名
- 键盘可达：分类/日期均为 `<button>`，`/` 聚焦搜索，Esc 关闭侧边栏
- 暗色/浅色自适应（浅色 `--accent` 满足 WCAG AA 对比度）
- 移动端侧边栏抽屉式（汉堡菜单 + 左滑关闭）
- 纯文字，无图片

### 3.6 auto-trend 接入
- auto-trend 项目每日生成 GitHub Trending + RSS 热点的 LLM 分析日报
- 新增 RSS 2.0 输出（`docs/feed.xml`），供 rss-feed 作为普通直链源拉取
- config.txt 中 community 分类下配置：`auto-trend 日报 | https://int2t05.github.io/auto-trend/feed.xml`

### 3.7 FluxSift 接入
- FluxSift 的 RSS feed 在 `http://<host>:8765/feed/<FEED_TOKEN>.xml`（内网 + token 鉴权）
- 经 cpolar 公网隧道暴露，config.txt 中 video 分类下以 `${FLUXSIFT_FEED_URL}` 环境变量引用
- fetch.mjs readLines 展开 `${VAR}`，sync.yml 注入 `FLUXSIFT_FEED_URL` Secret，避免 token 入库

## 4. 部署

- 公开仓库（Actions 免费不占额度）
- GitHub Pages 静态托管（main / root）
- Actions 每 30 分钟 cron + 手动触发
- 零外部服务

## 5. 约束

- 实时性：GitHub Actions cron 最短 5 分钟且不保证准时，实际延迟 5–35 分钟，非真实时
- B站 API 需配 `BILIBILI_COOKIE`（详见 README）
- 合规：底层依赖非公开 API（B站等），个人自用，勿商业化

## 6. 验收标准

1. `config.txt` 任添一行 `名称 | URL`，push 后下次 sync 自动出现
2. 直链源（如 Cloudflare Blog）拉取成功并展示
3. RSSHub 路由源（如 B站 UP 主）拉取成功并展示
4. 同一条目不重复出现（去重生效）
5. 源失败时侧边栏分类项显示⚠徽章 + 失败源折叠区，不影响其他源
6. 侧边栏展示 7 类 + 源色点 + 条目数徽章
7. 卡片式条目布局，源色点 + 源名 + 标题 + 摘要 + 时间 + 分类标签
8. 无限滚动替代分页，滚动加载流畅；切换分类后滚动位置恢复
9. 日历视图月历网格正常，点日期显示该日条目，方向键切月
10. 新条目显示未读蓝点，点击后消失（localStorage 持久化）
11. 暗色/浅色主题正常，浅色对比度满足 WCAG AA
12. 移动端侧边栏抽屉式切换正常，左滑关闭
13. auto-trend feed 拉取成功，条目出现在 community 分类
14. FluxSift feed 经 cpolar 隧道拉取成功，条目出现在 video 分类
15. Pages 访问正常，每 30 分钟自动更新
