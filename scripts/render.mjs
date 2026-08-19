// 仪表盘 HTML 渲染：每源 details 折叠 + 紧凑文字列表 + GitHub 暗色增强 + 内联 SVG 图标

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

// 平台主题色点：B站粉、GitHub黑、知乎蓝、知名平台配色，其余中性灰
function platformColor(url) {
    const tag = platformTag(url);
    const map = {
        bilibili: '#fb7299', github: '#8b949e', 'github.com': '#8b949e',
        zhihu: '#0084ff', juejin: '#1e80ff', solidot: '#6e7681',
        v2ex: '#333', sspai: '#d33a31', anthropic: '#cc785c',
        'blog.cloudflare.com': '#f38020',
    };
    return map[tag] || '#6e7681';
}

// RSS 广播图标 SVG（favicon + header logo 复用）
const RSS_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="18" r="2.4" fill="currentColor"/><path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 5.5A14 14 0 0 1 18.5 19.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

// 生成仪表盘 HTML：每源 details 原生折叠，默认展开，显示最近 limit 条
export function renderHTML(results, updated) {
    // 统计概览
    const totalSources = results.length;
    const okSources = results.filter((s) => !s.error).length;
    const totalFresh = results.reduce((s, c) => s + (c.fresh?.length || 0), 0);

    const sections = results
        .map((s) => {
            const limit = s.limit || 10;
            if (s.error) {
                return `<details class="src error"><summary><span class="dot" style="background:#f85149"></span><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span><span class="count">源失败</span></summary><p class="err">⚠ ${esc(s.error)}（下次重试）</p></details>`;
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
    <summary><span class="dot" style="background:${platformColor(s.url)}"></span><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span>${freshBadge}${moreHint}</summary>
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
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(RSS_ICON.replace('currentColor', '%23f0883e'))}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.7;font-size:14px}
.wrap{max-width:720px;margin:0 auto;padding:32px 20px 96px}
header{margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #21262d}
header .brand{display:flex;align-items:center;gap:10px}
header .logo{width:22px;height:22px;color:#f0883e;flex-shrink:0}
header h1{font-size:1.15rem;font-weight:600;color:#e6edf3}
header .stats{display:flex;gap:16px;margin-top:10px;font-size:.75rem;color:#7d8590}
header .stats b{color:#e6edf3;font-weight:600}
header .stats .fresh b{color:#f0883e}
header .meta{color:#6e7681;font-size:.72rem;margin-top:8px}
/* details 原生折叠：summary 为源标题栏，点击切换 */
details.src{margin-bottom:10px;background:#161b22;border:1px solid #21262d;border-radius:8px;overflow:hidden;transition:border-color .15s}
details.src[open]{border-color:#30363d}
details.src>summary{display:flex;align-items:center;gap:9px;padding:11px 14px;cursor:pointer;list-style:none;user-select:none;transition:background .12s}
details.src>summary::-webkit-details-marker{display:none}
details.src>summary:hover{background:#1c2128}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.src-name{font-size:.92rem;font-weight:600;color:#e6edf3}
.tag{font-size:.65rem;padding:1px 6px;background:#21262d;border-radius:3px;color:#7d8590}
.badge{font-size:.65rem;padding:1px 6px;background:#1f6feb;border-radius:3px;color:#fff}
.count{font-size:.7rem;color:#6e7681;margin-left:auto}
.list{display:flex;flex-direction:column;padding:2px 0}
.item{display:flex;gap:12px;padding:7px 14px;border-left:2px solid transparent;text-decoration:none;color:inherit;transition:background .12s,border-color .12s}
.item:hover{background:#0d1117;border-left-color:#30363d}
.item.new{border-left-color:#f0883e}
.time{color:#6e7681;font-size:.7rem;flex-shrink:0;width:64px;padding-top:2px}
.title{color:#c9d1d9;font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .12s}
.item:hover .title{color:#58a6ff}
.err{color:#f85149;font-size:.78rem;padding:8px 14px}
@media(prefers-color-scheme:light){body{background:#fff;color:#1f2328}header{border-color:#d0d7de}header h1{color:#1f2328}header .stats b{color:#1f2328}details.src{background:#f6f8fa;border-color:#eaeef2}details.src[open]{border-color:#d0d7de}details.src>summary:hover{background:#eef1f4}.src-name{color:#1f2328}.tag{background:#eaeef2;color:#57606a}.item:hover{background:#fff;border-left-color:#d0d7de}.time{color:#57606a}.title{color:#1f2328}.item:hover .title{color:#0969da}.count{color:#57606a}}
</style>
</head>
<body>
<div class="wrap">
<header>
<div class="brand"><span class="logo">${RSS_ICON}</span><h1>RSS 订阅</h1></div>
<div class="stats"><span><b>${totalSources}</b> 个源</span><span><b>${okSources}</b> 在线</span><span class="fresh"><b>${totalFresh}</b> 条新更新</span></div>
<div class="meta">${esc(updated)}</div>
</header>
${sections}
</div>
</body>
</html>`;
}
