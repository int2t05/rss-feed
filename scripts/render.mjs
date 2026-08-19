// 仪表盘 HTML 渲染：bento 首页 + 类别页（details 默认收住）+ GitHub 暗色

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

// 从 URL 推断平台标签
function platformTag(url) {
    if (url.startsWith('/')) return url.split('/')[1] || 'rsshub';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

// 平台主题色点
function platformColor(url) {
    const tag = platformTag(url);
    const map = {
        bilibili: '#fb7299', github: '#8b949e', 'github.com': '#8b949e',
        zhihu: '#0084ff', juejin: '#1e80ff', solidot: '#6e7681',
        v2ex: '#333', sspai: '#d33a31', anthropic: '#cc785c',
        'blog.cloudflare.com': '#f38020', hackernews: '#ff6600',
        openai: '#10a37f', deepmind: '#4285f4', huggingface: '#ffd21e',
        qbitai: '#d33a31', cnbeta: '#c92127', '36kr': '#4285ca',
    };
    return map[tag] || '#6e7681';
}

// RSS 广播图标（favicon）
const RSS_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="18" r="2.4" fill="currentColor"/><path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 5.5A14 14 0 0 1 18.5 19.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

// 类别图标（线性 SVG，统一风格）
const CAT_ICONS = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8z"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/></svg>',
    tech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4H6a2 2 0 0 0-2 2v14"/><path d="M18 14H8M15 18H8M12 10H8M10 6H8"/></svg>',
    community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

// 共享 head + 顶部导航
function head(title, active) {
    const nav = ['index', 'video', 'ai', 'tech', 'news', 'community'];
    const labels = { index: '首页', video: '视频', ai: 'AI', tech: '技术', news: '资讯', community: '社区' };
    const links = nav.map((id) => {
        const cls = id === active ? 'active' : '';
        const href = id === 'index' ? 'index.html' : `${id}.html`;
        return `<a class="nav-link ${cls}" href="${href}">${labels[id]}</a>`;
    }).join('');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · RSS 订阅</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(RSS_ICON.replace('currentColor', '%23f0883e'))}">
<style>
:root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2128;--border:#21262d;--border2:#30363d;--text:#e6edf3;--text2:#c9d1d9;--muted:#7d8590;--muted2:#6e7681;--accent:#f0883e;--blue:#58a6ff;--green:#3fb950;--red:#f85149}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text2);line-height:1.6;font-size:14px;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 96px}
header{display:flex;align-items:center;gap:12px;margin-bottom:28px;padding-bottom:18px;border-bottom:1px solid var(--border)}
header .logo{width:24px;height:24px;color:var(--accent);flex-shrink:0}
header h1{font-size:1.1rem;font-weight:600;color:var(--text)}
header .nav{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
.nav-link{padding:5px 12px;border-radius:6px;text-decoration:none;color:var(--muted);font-size:.82rem;transition:background .12s,color .12s}
.nav-link:hover{background:var(--surface2);color:var(--text)}
.nav-link.active{background:var(--surface2);color:var(--text);font-weight:600}
.meta{color:var(--muted2);font-size:.72rem;margin-bottom:20px}
/* bento 首页卡片网格 */
.bento{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.cat-card{display:block;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;text-decoration:none;color:inherit;transition:transform .15s,border-color .15s;position:relative;overflow:hidden}
.cat-card:hover{transform:translateY(-2px);border-color:var(--border2)}
.cat-card .top{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.cat-card .ic{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff}
.cat-card .ic svg{width:18px;height:18px}
.cat-card h2{font-size:1rem;font-weight:600;color:var(--text)}
.cat-card .stats{display:flex;gap:14px;font-size:.75rem;color:var(--muted)}
.cat-card .stats b{color:var(--text);font-weight:600}
.cat-card .stats .fresh b{color:var(--accent)}
.cat-card .latest{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:.78rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-card .latest .lt{color:var(--text2)}
.cat-card .arrow{position:absolute;top:18px;right:18px;color:var(--muted2);font-size:1.1rem;transition:transform .15s,color .15s}
.cat-card:hover .arrow{transform:translateX(3px);color:var(--accent)}
/* 类别页：源列表 details 默认收住 */
.cat-head{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.cat-head .ic{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff}
.cat-head .ic svg{width:20px;height:20px}
.cat-head h2{font-size:1.2rem;font-weight:600;color:var(--text)}
.cat-head .desc{color:var(--muted);font-size:.8rem;margin-left:auto}
details.src{margin-bottom:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;transition:border-color .15s}
details.src[open]{border-color:var(--border2)}
details.src>summary{display:flex;align-items:center;gap:9px;padding:11px 14px;cursor:pointer;list-style:none;user-select:none;transition:background .12s}
details.src>summary::-webkit-details-marker{display:none}
details.src>summary:hover{background:var(--surface2)}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.src-name{font-size:.9rem;font-weight:600;color:var(--text)}
.tag{font-size:.65rem;padding:1px 6px;background:var(--surface2);border-radius:3px;color:var(--muted)}
.badge{font-size:.65rem;padding:1px 6px;background:var(--blue);border-radius:3px;color:#fff}
.count{font-size:.7rem;color:var(--muted2);margin-left:auto}
.chev{color:var(--muted2);transition:transform .15s;font-size:.7rem}
details.src[open] .chev{transform:rotate(90deg)}
.list{display:flex;flex-direction:column;padding:2px 0}
.item{display:flex;gap:12px;padding:7px 14px;border-left:2px solid transparent;text-decoration:none;color:inherit;transition:background .12s,border-color .12s}
.item:hover{background:var(--bg);border-left-color:var(--border2)}
.item.new{border-left-color:var(--accent)}
.time{color:var(--muted2);font-size:.7rem;flex-shrink:0;width:64px;padding-top:2px}
.title{color:var(--text2);font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .12s}
.item:hover .title{color:var(--blue)}
.err{color:var(--red);font-size:.78rem;padding:8px 14px}
@media(prefers-color-scheme:light){:root{--bg:#fff;--surface:#f6f8fa;--surface2:#eef1f4;--border:#eaeef2;--border2:#d0d7de;--text:#1f2328;--text2:#1f2328;--muted:#57606a;--muted2:#57606a;--blue:#0969da}.cat-card:hover{border-color:var(--border2)}.nav-link:hover{background:var(--surface2)}.item:hover{background:#fff;border-left-color:var(--border2)}.title{color:#1f2328}.item:hover .title{color:var(--blue)}}
</style>
</head>
<body>
<div class="wrap">
<header><span class="logo">${RSS_ICON}</span><h1>RSS 订阅</h1><nav class="nav">${links}</nav></header>`;
}

const FOOTER = '</div></body></html>';

// 类别统计：源数 / 在线数 / 新条数 / 最新一条标题
function catStat(sources) {
    const total = sources.length;
    const online = sources.filter((s) => !s.error).length;
    const fresh = sources.reduce((s, c) => s + (c.fresh?.length || 0), 0);
    const okSrc = sources.find((s) => !s.error && s.items?.length);
    const latest = okSrc ? okSrc.items[0] : null;
    return { total, online, fresh, latest };
}

// bento 首页
export function renderIndex(categories, updated) {
    const cards = categories
        .map((cat) => {
            const st = catStat(cat.sources);
            const latestHtml = st.latest
                ? `<div class="latest"><span class="lt">${esc(st.latest.title)}</span> · ${relTime(st.latest.pubDate)}</div>`
                : `<div class="latest">暂无数据</div>`;
            return `<a class="cat-card" href="${cat.id}.html">
      <div class="top"><span class="ic" style="background:${cat.color}">${CAT_ICONS[cat.icon] || ''}</span><h2>${esc(cat.title)}</h2></div>
      <div class="stats"><span><b>${st.total}</b> 源</span><span><b>${st.online}</b> 在线</span><span class="fresh"><b>${st.fresh}</b> 新</span></div>
      ${latestHtml}
      <span class="arrow">→</span>
    </a>`;
        })
        .join('');
    const totalAll = categories.reduce((s, c) => s + c.sources.length, 0);
    const freshAll = categories.reduce((s, c) => s + catStat(c.sources).fresh, 0);
    return `${head('首页', 'index')}<div class="meta">${totalAll} 个源 · ${freshAll} 条新更新 · ${esc(updated)}</div><div class="bento">${cards}</div>${FOOTER}`;
}

// 类别页：所有源 details 默认收住（无 open 属性）
export function renderCategory(cat, categories, updated) {
    const st = catStat(cat.sources);
    const sections = cat.sources
        .map((s) => {
            const limit = s.limit || 10;
            if (s.error) {
                return `<details class="src error"><summary><span class="dot" style="background:var(--red)"></span><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span><span class="count">失败</span><span class="chev">▶</span></summary><p class="err">⚠ ${esc(s.error)}（下次重试）</p></details>`;
            }
            const freshIds = new Set(s.fresh.map((i) => i.id));
            const total = s.items.length;
            const shown = s.items.slice(0, limit);
            const items = shown
                .map((it) => `<a class="item${freshIds.has(it.id) ? ' new' : ''}" href="${esc(it.link)}" target="_blank" rel="noopener"><span class="time">${relTime(it.pubDate)}</span><span class="title">${esc(it.title)}</span></a>`)
                .join('');
            const freshBadge = s.fresh.length ? `<span class="badge">${s.fresh.length} 新</span>` : '';
            const moreHint = total > limit ? `<span class="count">${limit}/${total}</span>` : `<span class="count">${total} 条</span>`;
            return `<details class="src">
    <summary><span class="dot" style="background:${platformColor(s.url)}"></span><span class="src-name">${esc(s.name)}</span><span class="tag">${esc(platformTag(s.url))}</span>${freshBadge}${moreHint}<span class="chev">▶</span></summary>
    <div class="list">${items}</div>
  </details>`;
        })
        .join('\n');
    return `${head(cat.title, cat.id)}<div class="cat-head"><span class="ic" style="background:${cat.color}">${CAT_ICONS[cat.icon] || ''}</span><h2>${esc(cat.title)}</h2><span class="desc">${st.total} 源 · ${st.online} 在线 · ${st.fresh} 新</span></div><div class="meta">${esc(updated)}</div>${sections}${FOOTER}`;
}
