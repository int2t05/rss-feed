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
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text2);line-height:1.6;font-size:14px;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px 96px}
header{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border);flex-wrap:wrap}
header .logo{width:22px;height:22px;color:var(--accent);flex-shrink:0}
header h1{font-size:1.05rem;font-weight:600;color:var(--text)}
header .nav{display:flex;gap:4px;flex-wrap:wrap}
.nav-link{padding:4px 10px;border-radius:6px;text-decoration:none;color:var(--muted);font-size:.8rem;cursor:pointer;transition:background .12s,color .12s}
.nav-link:hover{background:var(--surface2);color:var(--text)}
.nav-link.active{background:var(--surface2);color:var(--text);font-weight:600}
#search{margin-left:auto;padding:5px 10px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:.8rem;width:180px}
#search:focus{outline:none;border-color:var(--blue)}
.meta{color:var(--muted2);font-size:.72rem;margin-bottom:16px}
.layout{display:flex;gap:20px}
.main{flex:1;min-width:0}
.sidebar{width:260px;flex-shrink:0}
@media(max-width:860px){.sidebar{display:none}.layout{flex-direction:column}}
.head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.head h2{font-size:1rem;font-weight:600;color:var(--text)}
.head .back{color:var(--blue);font-size:.8rem;cursor:pointer;text-decoration:none}
.head .count{color:var(--muted);font-size:.75rem;margin-left:auto}
.list{display:flex;flex-direction:column}
.item{display:flex;gap:12px;padding:7px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:background .1s}
.item:hover{background:var(--surface)}
.item .time{color:var(--muted2);font-size:.7rem;flex-shrink:0;width:72px;padding-top:2px}
.item .src{font-size:.7rem;color:var(--muted);flex-shrink:0;width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:2px}
.item .src::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;background:var(--src-color,#6e7681);vertical-align:middle}
.item .title{color:var(--text2);font-size:.84rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item:hover .title{color:var(--blue)}
.item.fresh .title{color:var(--accent)}
.load-more{padding:14px;text-align:center;color:var(--muted);font-size:.8rem;cursor:pointer;border:1px dashed var(--border2);border-radius:8px;margin-top:12px}
.load-more:hover{color:var(--text);border-color:var(--blue)}
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
</main>
<aside class="sidebar">
<div class="cal-box" id="cal"></div>
</aside>
</div>
</div>
<script>
const DATA = ${dataJson};
const CAT_ICONS = ${catIcons};
let state = { cat: 'all', date: null, search: '', shown: 50, month: new Date() };

const $ = (id) => document.getElementById(id);
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function relTime(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (isNaN(diff)) return '';
  if (diff < 3600) return Math.floor(diff/60) + '分前';
  if (diff < 86400) return Math.floor(diff/3600) + '时前';
  if (diff < 2592000) return Math.floor(diff/86400) + '天前';
  return new Date(d).toLocaleDateString('zh-CN', {month:'short',day:'numeric'});
}
function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

function filtered() {
  let items = DATA.items;
  if (state.cat !== 'all') items = items.filter(it => it.category === state.cat);
  if (state.date) items = items.filter(it => sameDay(it.pubDate, state.date));
  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(it => it.title.toLowerCase().includes(q));
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
    const d = new Date(state.date);
    parts.push('<a class="back" onclick="clearDate()">← 返回全部</a>');
    parts.push('<span class="count">' + d.toLocaleDateString('zh-CN') + ' · ' + items.length + ' 条</span>');
  } else {
    parts.push('<span class="count">' + items.length + ' 条</span>');
  }
  $('head').innerHTML = (icon ? '<span style="color:var(--accent);width:18px;height:18px">' + icon + '</span>' : '') + '<h2>' + esc(title) + '</h2>' + parts.join('');
}

function renderList() {
  const items = filtered();
  renderHead(items);
  if (items.length === 0) { $('list').innerHTML = '<div class="empty">无匹配条目</div>'; return; }
  const shown = items.slice(0, state.shown);
  const freshIds = new Set();
  // fresh 标记：最近 24h 内的条目
  const dayAgo = Date.now() - 86400000;
  let html = shown.map(it => {
    const isFresh = new Date(it.pubDate).getTime() > dayAgo;
    return '<a class="item' + (isFresh ? ' fresh' : '') + '" href="' + esc(it.link) + '" target="_blank" rel="noopener" style="--src-color:' + (it.sourceColor||'#6e7681') + '">' +
      '<span class="time">' + relTime(it.pubDate) + '</span>' +
      '<span class="src" title="' + esc(it.source) + '">' + esc(it.source) + '</span>' +
      '<span class="title">' + esc(it.title) + '</span></a>';
  }).join('');
  if (items.length > state.shown) {
    html += '<div class="load-more" onclick="loadMore()">显示更多 ▼ 共 ' + items.length + ' 条 · 已显示 ' + state.shown + '</div>';
  }
  $('list').innerHTML = html;
}

function loadMore() { state.shown += 50; renderList(); }
function clearDate() { state.date = null; state.shown = 50; render(); }

function renderCal() {
  const m = state.month;
  const y = m.getFullYear(), mo = m.getMonth();
  const first = new Date(y, mo, 1);
  const last = new Date(y, mo + 1, 0);
  const startDow = first.getDay();
  const days = last.getDate();
  const today = new Date();
  // 当前筛选类别下的条目按日期分组
  let items = DATA.items;
  if (state.cat !== 'all') items = items.filter(it => it.category === state.cat);
  const dateMap = {};
  items.forEach(it => {
    const d = new Date(it.pubDate);
    if (d.getFullYear() === y && d.getMonth() === mo) {
      const key = d.getDate();
      dateMap[key] = (dateMap[key] || 0) + 1;
    }
  });
  const dows = ['日','一','二','三','四','五','六'];
  let html = '<div class="cal-head"><button onclick="prevMonth()">‹</button><span class="ym">' + y + '年' + (mo+1) + '月</span><button onclick="nextMonth()">›</button></div>';
  html += '<div class="cal-grid">';
  dows.forEach(d => html += '<div class="dow">' + d + '</div>');
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day other"></div>';
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, mo, d);
    const has = dateMap[d];
    const isToday = sameDay(date, today);
    const isSel = state.date && sameDay(date, state.date);
    let cls = 'cal-day';
    if (has) cls += ' has';
    if (isToday) cls += ' today';
    if (isSel) cls += ' selected';
    html += '<div class="' + cls + '" onclick="selectDate(\\'' + y + '-' + (mo+1) + '-' + d + '\\')">' + d + '</div>';
  }
  html += '</div>';
  const total = Object.values(dateMap).reduce((a,b) => a+b, 0);
  html += '<div class="cal-info">本月 ' + total + ' 条 · 点击日期筛选</div>';
  $('cal').innerHTML = html;
}

function selectDate(s) {
  const parts = s.split('-');
  state.date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  state.shown = 50;
  render();
}
function prevMonth() { state.month = new Date(state.month.getFullYear(), state.month.getMonth()-1, 1); renderCal(); }
function nextMonth() { state.month = new Date(state.month.getFullYear(), state.month.getMonth()+1, 1); renderCal(); }

function setCat(cat) {
  state.cat = cat;
  state.date = null;
  state.shown = 50;
  render();
  location.hash = cat;
}

function render() {
  const items = filtered();
  // meta
  const total = DATA.items.length;
  $('meta').textContent = DATA.categories.length + ' 类 · ' + total + ' 条 · ' + DATA.updated;
  // nav active
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === state.cat);
  });
  renderList();
  renderCal();
}

// 事件绑定
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', () => setCat(a.dataset.cat));
});
$('search').addEventListener('input', (e) => { state.search = e.target.value; state.shown = 50; renderList(); });

// 初始化：从 hash 读类别
const hashCat = location.hash.slice(1);
if (hashCat && DATA.categories.some(c => c.id === hashCat)) state.cat = hashCat;
render();
</script>
</body>
</html>`;
}
