// 单文件 SPA 渲染：内嵌 JSON 数据 + 客户端日历筛选 + 滚动加载
// 导出 renderSPA(data) 返回完整 HTML 字符串，fetch.mjs 写入 dist/index.html

// 从 URL 推断平台标签
function platformTag(url) {
    if (url.startsWith('/')) return url.split('/')[1] || 'rsshub';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

// 平台主题色点（供 fetch.mjs 预计算注入 data.json）
export function platformColor(url) {
    const tag = platformTag(url);
    const map = {
        bilibili: '#fb7299', github: '#8b949e', 'github.com': '#8b949e',
        'github.blog': '#8b949e', zhihu: '#0084ff', juejin: '#1e80ff',
        solidot: '#6e7681', v2ex: '#333', 'v2ex.com': '#333',
        sspai: '#d33a31', 'sspai.com': '#d33a31', anthropic: '#cc785c',
        'blog.cloudflare.com': '#f38020', hackernews: '#ff6600',
        'hnrss.org': '#ff6600', openai: '#10a37f', 'openai.com': '#10a37f',
        deepmind: '#4285f4', 'deepmind.google': '#4285f4',
        huggingface: '#ffd21e', 'huggingface.co': '#ffd21e',
        cnbeta: '#c92127', '36kr': '#4285ca', '36kr.com': '#4285ca',
        'rss.arxiv.org': '#b31b1b', 'machinelearning.apple.com': '#86868b',
        'developer.nvidia.com': '#76b900', 'microsoft.com': '#0078d4',
        'ai.meta.com': '#0668e1', 'aws.amazon.com': '#ff9900',
        'bair.berkeley.edu': '#003262', 'simonwillison.net': '#58a6ff',
        'lilianweng.github.io': '#58a6ff', 'karpathy.github.io': '#58a6ff',
        'jiqizhixin.com': '#0066ff', 'ithome.com': '#c92127',
        'ifanr.com': '#ce1126', 'tmtpost.com': '#0094e8', 'huxiu.com': '#ff5b5b',
        'techcrunch.com': '#00c853', 'theverge.com': '#e91e63',
        'technologyreview.com': '#c8102e', 'linux.do': '#0066cc',
        'lobste.rs': '#ac2026', 'dev.to': '#0a0a0a', 'tldr.tech': '#000000',
        'react.dev': '#149eca', 'nextjs.org': '#ffffff', 'tailwindcss.com': '#38bdf8',
        'spring.io': '#6db33f', 'blog.rust-lang.org': '#dea584',
        'nodejs.org': '#5fa04e', 'tech.meituan.com': '#ffc300',
        'infoq.cn': '#1c6ad2', 'kubernetes.io': '#326ce5',
        'docker.com': '#2496ed', 'hashicorp.com': '#fff8d8',
        'databricks.com': '#ff3621', 'blog.google': '#4285f4',
    };
    return map[tag] || '#6e7681';
}

const RSS_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="18" r="2.4" fill="currentColor"/><path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 5.5A14 14 0 0 1 18.5 19.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

const CAT_ICONS = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8z"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/></svg>',
    academic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    tech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4H6a2 2 0 0 0-2 2v14"/><path d="M18 14H8M15 18H8M12 10H8M10 6H8"/></svg>',
    community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
};

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 生成单文件 SPA：data 内嵌为 JS 变量，客户端渲染日历 + 滚动加载
export function renderSPA(data) {
    const dataJson = JSON.stringify(data).replace(/<\/script>/g, '<\\/script>');
    const navItems = [{ id: 'all', title: '全部' }, ...data.categories]
        .map((c) => `<a class="nav-link" data-cat="${c.id}" href="#${c.id}">${esc(c.title)}</a>`).join('');
    const catIcons = JSON.stringify(CAT_ICONS);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSS 订阅</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(RSS_ICON.replace('currentColor', '%23f0883e'))}">
<style>
:root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2128;--border:#21262d;--border2:#30363d;--text:#e6edf3;--text2:#c9d1d9;--muted:#7d8590;--muted2:#6e7681;--accent:#f0883e;--blue:#58a6ff;--green:#3fb950;--red:#f85149}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text2);line-height:1.6;font-size:14px;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:16px 20px;display:flex;flex-direction:column;height:100vh}
header{display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0}
header .logo{width:22px;height:22px;color:var(--accent);flex-shrink:0}
header h1{font-size:1.05rem;font-weight:600;color:var(--text)}
header .nav{display:flex;gap:4px;flex-wrap:wrap}
.nav-link{padding:4px 10px;border-radius:6px;text-decoration:none;color:var(--muted);font-size:.8rem;cursor:pointer;transition:background .12s,color .12s}
.nav-link:hover{background:var(--surface2);color:var(--text)}
.nav-link.active{background:var(--surface2);color:var(--text);font-weight:600}
#search{margin-left:auto;padding:5px 10px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:.8rem;width:180px}
#search:focus{outline:none;border-color:var(--blue)}
.meta{color:var(--muted2);font-size:.72rem;margin-bottom:8px;flex-shrink:0}
.layout{display:flex;gap:20px;flex:1;min-height:0}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.sidebar{width:260px;flex-shrink:0;overflow-y:auto}
@media(max-width:860px){.sidebar{display:none}.layout{flex-direction:column}}
.head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-shrink:0}
.head h2{font-size:1rem;font-weight:600;color:var(--text)}
.head .back{color:var(--blue);font-size:.8rem;cursor:pointer;text-decoration:none}
.head .count{color:var(--muted);font-size:.75rem;margin-left:auto}
.list{display:flex;flex-direction:column;flex:1;overflow-y:auto;min-height:0}
.item{display:flex;gap:12px;padding:7px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:background .1s}
.item:hover{background:var(--surface)}
.item .time{color:var(--muted2);font-size:.7rem;flex-shrink:0;width:110px;padding-top:2px;font-variant-numeric:tabular-nums}
.item .src{font-size:.7rem;color:var(--muted);flex-shrink:0;width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:2px}
.item .src::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;background:var(--src-color,#6e7681);vertical-align:middle}
.item .title{color:var(--text2);font-size:.84rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item:hover .title{color:var(--blue)}
.item.fresh .title{color:var(--accent)}
.day-group{margin-top:12px}
.day-group:first-child{margin-top:0}
.day-group .day-label{font-size:.72rem;color:var(--muted);padding:6px 0 4px;border-bottom:1px solid var(--border);margin-bottom:4px;font-weight:600}
.pager{display:flex;gap:6px;justify-content:center;align-items:center;padding:8px 0;flex-shrink:0;border-top:1px solid var(--border)}
.pager button{background:var(--surface);border:1px solid var(--border2);color:var(--text2);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.78rem}
.pager button:hover{background:var(--surface2);border-color:var(--blue)}
.pager button:disabled{opacity:.4;cursor:default}
.pager .pg-info{color:var(--muted);font-size:.72rem;margin:0 8px}
.empty{padding:40px;text-align:center;color:var(--muted2);font-size:.85rem}
/* 日历 */
.cal-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
.cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cal-head .ym{font-size:.85rem;font-weight:600;color:var(--text)}
.cal-head button{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:1rem}
.cal-head button:hover{background:var(--surface2);color:var(--text)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.cal-grid .dow{font-size:.65rem;color:var(--muted2);padding:3px 0}
.cal-day{font-size:.75rem;padding:5px 0;border-radius:4px;cursor:pointer;color:var(--text2);position:relative}
.cal-day:hover{background:var(--surface2)}
.cal-day.has{color:var(--accent);font-weight:600}
.cal-day.has::after{content:"";position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--accent)}
.cal-day.selected{background:var(--blue);color:#fff}
.cal-day.other{color:var(--muted2);opacity:.4}
.cal-day.today{border:1px solid var(--border2)}
.cal-info{margin-top:10px;font-size:.7rem;color:var(--muted2);text-align:center}
@media(prefers-color-scheme:light){:root{--bg:#fff;--surface:#f6f8fa;--surface2:#eef1f4;--border:#eaeef2;--border2:#d0d7de;--text:#1f2328;--text2:#1f2328;--muted:#57606a;--muted2:#57606a;--blue:#0969da}.item:hover{background:var(--surface)}.nav-link:hover{background:var(--surface2)}}
</style>
</head>
<body>
<div class="wrap">
<header>
<span class="logo">${RSS_ICON}</span>
<h1>RSS 订阅</h1>
<nav class="nav" id="nav">${navItems}</nav>
<input id="search" placeholder="搜索标题" type="search">
</header>
<div class="meta" id="meta"></div>
<div class="layout">
<main class="main">
<div class="head" id="head"></div>
<div class="list" id="list"></div>
<div class="pager" id="pager"></div>
</main>
<aside class="sidebar">
<div class="cal-box" id="cal"></div>
</aside>
</div>
</div>
<script>
const DATA = ${dataJson};
const CAT_ICONS = ${catIcons};
const PER_PAGE = 50;
let state = { cat: 'all', date: null, search: '', page: 1, month: new Date() };

const $ = (id) => document.getElementById(id);
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// 统一时间处理：用本地时区解析，具体时间戳格式 MM-DD HH:MM
function pad(n) { return n < 10 ? '0' + n : n; }
function fmtTime(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return pad(dt.getMonth()+1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
}
// 日期 key（本地时区 YYYY-MM-DD），用于分组与日历
function dayKey(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate());
}
function dayLabel(key) {
  const dt = new Date(key + 'T00:00:00');
  const today = dayKey(new Date());
  const yest = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return '今天';
  if (key === yest) return '昨天';
  return dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function filtered() {
  let items = DATA.items;
  if (state.cat !== 'all') items = items.filter(it => it.category === state.cat);
  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(it => it.title.toLowerCase().includes(q));
  }
  if (state.date) {
    const key = dayKey(state.date);
    items = items.filter(it => dayKey(it.pubDate) === key);
  }
  return items;
}

function renderHead(items) {
  let title = '全部', icon = '';
  if (state.cat !== 'all') {
    const c = DATA.categories.find(c => c.id === state.cat);
    if (c) { title = c.title; icon = CAT_ICONS[c.icon] || CAT_ICONS.default; }
  }
  const parts = [];
  if (state.date) {
    parts.push('<a class="back" id="back-link" style="cursor:pointer">← 返回全部</a>');
    parts.push('<span class="count">' + new Date(state.date).toLocaleDateString('zh-CN') + ' · ' + items.length + ' 条</span>');
  } else {
    parts.push('<span class="count">' + items.length + ' 条</span>');
  }
  $('head').innerHTML = (icon ? '<span style="color:var(--accent);width:18px;height:18px;display:inline-flex">' + icon + '</span>' : '') + '<h2>' + esc(title) + '</h2>' + parts.join('');
  const back = $('back-link');
  if (back) back.addEventListener('click', () => { state.date = null; state.page = 1; render(); });
}

function renderList() {
  const items = filtered();
  renderHead(items);
  if (items.length === 0) { $('list').innerHTML = '<div class="empty">无匹配条目</div>'; $('pager').innerHTML = ''; return; }
  const totalPages = Math.ceil(items.length / PER_PAGE);
  if (state.page > totalPages) state.page = 1;
  const start = (state.page - 1) * PER_PAGE;
  const pageItems = items.slice(start, start + PER_PAGE);
  const now = Date.now();
  // 按日期分组渲染（每组闭合 </div>）
  let html = '';
  let curDay = '';
  for (const it of pageItems) {
    const k = dayKey(it.pubDate);
    if (k !== curDay) {
      if (curDay) html += '</div>'; // 闭合上一个 day-group
      html += '<div class="day-group"><div class="day-label">' + dayLabel(k) + '</div>';
      curDay = k;
    }
    const isFresh = (now - new Date(it.pubDate).getTime()) < 86400000;
    html += '<a class="item' + (isFresh ? ' fresh' : '') + '" href="' + esc(it.link) + '" target="_blank" rel="noopener" style="--src-color:' + (it.sourceColor || '#6e7681') + '">' +
      '<span class="time">' + fmtTime(it.pubDate) + '</span>' +
      '<span class="src" title="' + esc(it.source) + '">' + esc(it.source) + '</span>' +
      '<span class="title">' + esc(it.title) + '</span></a>';
  }
  if (curDay) html += '</div>'; // 闭合最后一个 day-group
  $('list').innerHTML = html;
  $('list').scrollTop = 0; // 翻页时列表回到顶部
  renderPager(totalPages);
}

function renderPager(totalPages) {
  if (totalPages <= 1) { $('pager').innerHTML = ''; return; }
  const p = state.page;
  let html = '';
  html += '<button data-pg="1"' + (p === 1 ? ' disabled' : '') + '>«</button>';
  html += '<button data-pg="' + (p - 1) + '"' + (p === 1 ? ' disabled' : '') + '>‹</button>';
  const from = Math.max(1, p - 2), to = Math.min(totalPages, p + 2);
  for (let i = from; i <= to; i++) {
    html += '<button data-pg="' + i + '"' + (i === p ? ' class="active"' : '') + '>' + i + '</button>';
  }
  html += '<button data-pg="' + (p + 1) + '"' + (p === totalPages ? ' disabled' : '') + '>›</button>';
  html += '<button data-pg="' + totalPages + '"' + (p === totalPages ? ' disabled' : '') + '>»</button>';
  html += '<span class="pg-info">' + p + ' / ' + totalPages + '</span>';
  $('pager').innerHTML = html;
  $('pager').querySelectorAll('button[data-pg]').forEach(b => {
    b.addEventListener('click', () => { state.page = parseInt(b.dataset.pg); render(); });
  });
}

function renderCal() {
  const m = state.month;
  const y = m.getFullYear(), mo = m.getMonth();
  const days = new Date(y, mo + 1, 0).getDate();
  const startDow = new Date(y, mo, 1).getDay();
  const todayKey = dayKey(new Date());
  let items = DATA.items;
  if (state.cat !== 'all') items = items.filter(it => it.category === state.cat);
  const dateMap = {};
  items.forEach(it => {
    const k = dayKey(it.pubDate);
    if (k.startsWith(y + '-' + pad(mo + 1))) {
      const d = parseInt(k.slice(8));
      dateMap[d] = (dateMap[d] || 0) + 1;
    }
  });
  const dows = ['日', '一', '二', '三', '四', '五', '六'];
  let html = '<div class="cal-head"><button id="prev-m">‹</button><span class="ym">' + y + '年' + (mo + 1) + '月</span><button id="next-m">›</button></div>';
  html += '<div class="cal-grid">';
  dows.forEach(d => html += '<div class="dow">' + d + '</div>');
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day other"></div>';
  for (let d = 1; d <= days; d++) {
    const dKey = y + '-' + pad(mo + 1) + '-' + pad(d);
    const has = dateMap[d];
    const isFuture = dKey > todayKey;
    const isToday = dKey === todayKey;
    const isSel = state.date && dayKey(state.date) === dKey;
    let cls = 'cal-day';
    if (has) cls += ' has';
    if (isToday) cls += ' today';
    if (isSel) cls += ' selected';
    if (isFuture) cls += ' other';
    html += '<div class="' + cls + '"' + (has && !isFuture ? ' data-date="' + dKey + '"' : '') + '>' + d + '</div>';
  }
  html += '</div>';
  const total = Object.values(dateMap).reduce((a, b) => a + b, 0);
  html += '<div class="cal-info">本月 ' + total + ' 条</div>';
  $('cal').innerHTML = html;
  $('prev-m').addEventListener('click', () => { state.month = new Date(y, mo - 1, 1); renderCal(); });
  $('next-m').addEventListener('click', () => { state.month = new Date(y, mo + 1, 1); renderCal(); });
  $('cal').querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      state.date = el.dataset.date + 'T00:00:00';
      state.page = 1;
      render();
    });
  });
}

function setCat(cat) {
  state.cat = cat;
  state.date = null;
  state.page = 1;
  render();
  location.hash = cat;
}

function render() {
  const items = filtered();
  $('meta').textContent = DATA.categories.length + ' 类 · ' + DATA.items.length + ' 条 · ' + DATA.updated;
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.cat === state.cat));
  renderList();
  renderCal();
}

document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', () => setCat(a.dataset.cat)));
$('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; renderList(); });

const hashCat = location.hash.slice(1);
if (hashCat && DATA.categories.some(c => c.id === hashCat)) state.cat = hashCat;
render();
</script>
</body>
</html>`;
}
