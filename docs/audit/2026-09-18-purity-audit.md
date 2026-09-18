# 纯净审计 · 2026-09-18

**范围**：全项目代码 + 配置 + 文档
**基准**：Purity Principle — 代码/文档读起来像第一次写的；修复根因不掩盖症状；无残留产物；文档与实现一致

## 审计前状态

FluxSift 经 ngrok 隧道接入（URL 已死），前端 UIUX 整改后提交。代码中残留多个死字段、文档与实现大面积脱节。

## 已修复

### 代码 · 死字段清除

| 文件 | 问题 | 根因 | 修复 |
|---|---|---|---|
| `fetch.mjs` | `icon` 字段 parseConfig 解析但 line 190 丢弃，render.mjs 从不引用 | 历史遗留：图标功能从未实现 | 删除 parseConfig 的 icon 解析，config 格式从 4 列改 3 列 |
| `fetch.mjs` | `author` 字段 fetchItems 返回但 allItems 不收集 | 解析后无消费方 | 删除 fetchItems 的 author 返回 |
| `fetch.mjs` | `limit`/`DEFAULT_LIMIT` 解析但从未用于截断条目 | 历史遗留：显示条数功能从未实现 | 删除 limit 解析与 DEFAULT_LIMIT |
| `bilibili.mjs` | `author` 字段返回但下游不收集 | 同 fetch.mjs author | 删除 author 返回 |
| `render.mjs` | `.view-pane` 声明 `transition:opacity .15s ease` 但用 `display:none` 切换，opacity 永不触发 | UIUX 整改 M5 预留但实际无效 | 删除死过渡声明 |
| `render.mjs` | `catNames`/`catColor` 每次 renderList/renderCalendar/renderDayList 重建 | 查表数据不变却重复构建 | 提升为模块级常量 `CAT_NAMES`/`CAT_COLOR` |

### 配置 · 格式简化

| 文件 | 问题 | 修复 |
|---|---|---|
| `config.txt` | 分类头 4 列 `[id\|标题\|图标\|主题色]`，图标列死字段 | 改 3 列 `[id\|标题\|主题色]`，7 个分类头同步 |
| `config.txt` | 注释声称「图标可选」 | 删除图标说明 |
| `config.txt` | FluxSift URL 指向已死的 ngrok 隧道 | 替换为 cpolar 隧道 `https://fluxsift.vip.cpolar.cn` |

### 文档 · 同步实现

| 文件 | 脱节点 | 修复 |
|---|---|---|
| `README.md` `prd.md` `tech.md` | 声称「8 分类」，实际 7 分类 | 改「7 类 139 源」 |
| `README.md` `prd.md` `tech.md` | FluxSift「以 # 注释形式存在」 | 改「经 cpolar 公网隧道接入」 |
| `prd.md` §3.1 | 分类头含图标、源行含显示条数 | 改 `[id\|标题\|主题色]` + `名称 \| URL` |
| `prd.md` §3.5 | 缺日历视图/失败源/未读/摘要/键盘/防抖；时间标签「今天/本周/本月」 | 全量补齐，标签改「24h/7天/30天」 |
| `prd.md` §6 | 验收标准缺日历/未读/FluxSift/滚动记忆 | 补齐至 15 条 |
| `tech.md` §2.3 | 直链源「1 次重试」 | 改「2 次重试；YouTube 3 次 + 2s 间隔」 |
| `tech.md` §2.4 | 缺日历视图/失败源/未读/摘要/键盘/滚动记忆 | 全量补齐 |
| `tech.md` §3 | 解析字段含 `author` | 改 `description(≤200字)` |
| `tech.md` §9 | render.mjs 描述缺日历 | 补「日历」 |

## 需评审

### FluxSift FEED_TOKEN 明文入库

**现象**：`config.txt` 第 31 行含 FluxSift 的 `FEED_TOKEN`（`https://fluxsift.vip.cpolar.cn/feed/<token>.xml`），已随提交进入公开仓库 git 历史。

**根因**：FluxSift 用路径 token 鉴权，config.txt 是 fetch.mjs 唯一配置源，token 必须出现在 URL 里。当前 fetch.mjs 不支持环境变量替换。

**风险**：仓库公开 → 任何人可读 FluxSift feed（个人视频分析文档，非敏感但属私有）。token 已在 git 历史，即使现在移除仍可从历史检出。

**建议修复**（未自动执行，需确认）：fetch.mjs 加 `${VAR}` 环境变量替换，config.txt 改 `FluxSift | ${FLUXSIFT_FEED_URL}`，sync.yml 注入 `FLUXSIFT_FEED_URL` Secret，仓库 Settings 新建对应 Secret。轮换 FluxSift 的 FEED_TOKEN 使历史泄露 token 失效。

**为何未自动修**：移除 config.txt 的 token 会让下次 sync 在用户配置 Secret 前失败；轮换 token 需登录远程 FluxSift 改 .env。属外向型、不可逆操作，需用户确认后执行。

## 验证

- 三个脚本 `node --check` 语法通过
- 用现有数据重渲染 `dist/index.html`：5972 条目，无 icon/author/limit 残留，CAT_NAMES/CAT_COLOR 提升生效
- FluxSift cpolar feed 公网拉取：200，48 条，错误 token 返 404
- 文档 grep 「8 类」「图标」「注释形式」「author」均清除
