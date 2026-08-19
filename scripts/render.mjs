// 仪表盘 HTML 渲染：每源 details 折叠 + 紧凑文字列表 + 极简暗色

// 相对时间：X 分钟前 / 小时前 / 天前
export function relTime(dateStr) {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (isNaN(diff)) return '';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
}

export function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 从 URL 推断平台标签：/bilibili → bilibili，http → 域名
function platformTag(url) {
    if (url.startsWith('/')) return url.split('/')[1] || 'rsshub';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

// 生成仪表盘 HTML：每源 details 原生折叠，默认展开，显示最近 limit 条
export function renderHTML(results, updated) {
    const sections = results
        .map((s) => {
            const limit = s.limit || 10;
            if (s.error) {
                return `<details class="src error"><summary><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span><span class="count">源失败</span></summary><p class="err">⚠ ${esc(s.error)}（下次重试）</p></details>`;
            }
            const freshIds = new Set(s.fresh.map((i) => i.id));
            const total = s.items.length;
            const shown = s.items.slice(0, limit);
            const items = shown
                .map(
                    (it) => `<a class="item${freshIds.has(it.id) ? ' new' : ''}" href="${esc(it.link)}" target="_blank" rel="noopener">
      <span class="time">${relTime(it.pubDate)}</span><span class="title">${esc(it.title)}</span>
    </a>`
                )
                .join('');
            const freshBadge = s.fresh.length ? `<span class="badge">${s.fresh.length} 新</span>` : '';
            const moreHint = total > limit ? `<span class="count">显示 ${limit}/${total}</span>` : `<span class="count">${total} 条</span>`;
            return `<details class="src" open>
    <summary><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span>${freshBadge}${moreHint}</summary>
    <div class="list">${items}</div>
  </details>`;
        })
        .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSS 订阅</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.7;font-size:14px}
.wrap{max-width:720px;margin:0 auto;padding:32px 20px 96px}
header{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #21262d}
header h1{font-size:1.15rem;font-weight:600;color:#e6edf3}
header .meta{color:#7d8590;font-size:.75rem;margin-top:6px}
/* details 原生折叠：summary 为源标题栏，点击切换 */
details.src{margin-bottom:12px;background:#161b22;border:1px solid #21262d;border-radius:6px;overflow:hidden}
details.src[open]{border-color:#30363d}
details.src>summary{display:flex;align-items:center;gap:8px;padding:11px 14px;cursor:pointer;list-style:none;user-select:none}
details.src>summary::-webkit-details-marker{display:none}
details.src>summary:hover{background:#1c2128}
.src-name{font-size:.92rem;font-weight:600;color:#e6edf3}
.tag{font-size:.65rem;padding:1px 6px;background:#21262d;border-radius:3px;color:#7d8590}
.badge{font-size:.65rem;padding:1px 6px;background:#1f6feb;border-radius:3px;color:#fff}
.count{font-size:.7rem;color:#6e7681;margin-left:auto}
.list{display:flex;flex-direction:column;padding:2px 0}
.item{display:flex;gap:12px;padding:7px 14px;border-left:2px solid transparent;text-decoration:none;color:inherit;transition:background .12s}
.item:hover{background:#0d1117;border-left-color:#30363d}
.item.new{border-left-color:#f0883e}
.time{color:#6e7681;font-size:.7rem;flex-shrink:0;width:64px;padding-top:2px}
.title{color:#c9d1d9;font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item:hover .title{color:#58a6ff}
.err{color:#f85149;font-size:.78rem;padding:8px 14px}
@media(prefers-color-scheme:light){body{background:#fff;color:#1f2328}header{border-color:#d0d7de}header h1{color:#1f2328}details.src{background:#f6f8fa;border-color:#eaeef2}details.src[open]{border-color:#d0d7de}details.src>summary:hover{background:#eef1f4}.src-name{color:#1f2328}.tag{background:#eaeef2;color:#57606a}.item:hover{background:#fff;border-left-color:#d0d7de}.time{color:#57606a}.title{color:#1f2328}.item:hover .title{color:#0969da}.count{color:#57606a}}
</style>
</head>
<body>
<div class="wrap">
<header>
<h1>RSS 订阅</h1>
<div class="meta">${esc(updated)}</div>
</header>
${sections}
</div>
</body>
</html>`;
}
