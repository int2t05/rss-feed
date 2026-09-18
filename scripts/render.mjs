// 单文件 SPA 渲染：内嵌 JSON 数据 + 客户端侧边栏分类 + 卡片式无限滚动 + 日历视图
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
        'github.blog': '#8b949e', 'int2t05.github.io': '#58a6ff',
        zhihu: '#0084ff', juejin: '#1e80ff',
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
        'ifanr.com': '#ce1126', 'huxiu.com': '#ff5b5b',
        'techcrunch.com': '#00c853', 'theverge.com': '#e91e63',
        'technologyreview.com': '#c8102e', 'linux.do': '#0066cc',
        'lobste.rs': '#ac2026', 'dev.to': '#0a0a0a', 'tldr.tech': '#000000',
        'react.dev': '#149eca', 'nextjs.org': '#ffffff', 'tailwindcss.com': '#38bdf8',
        'spring.io': '#6db33f', 'blog.rust-lang.org': '#dea584',
        'nodejs.org': '#5fa04e', 'tech.meituan.com': '#ffc300',
        'infoq.cn': '#1c6ad2', kubernetes: '#326ce5',
        'docker.com': '#2496ed', 'hashicorp.com': '#fff8d8',
        'databricks.com': '#ff3621', 'blog.google': '#4285f4',
        'uber.com': '#000000', 'stripe.com': '#635bff', 'discord.com': '#5865f2',
        'go.dev': '#00add8', 'blog.python.org': '#3776ab', 'figma.com': '#f24e1e',
        'shopify.engineering': '#7ab55c', 'postgresql.org': '#336791',
        'qbitai.com': '#1a1a2e', 'feeds.arstechnica.com': '#ff4e00',
        'research.google': '#4285f4', 'latent.space': '#7c3aed',
        'thegradient.pub': '#2266a5', 'aisnakeoil.substack.com': '#ff6719',
        'chiphuyen.com': '#e8590c', 'eugeneyan.com': '#0d7377',
        'aclanthology.org': '#b31b1b', 'jmlr.org': '#4a90d9',
        'nature.com': '#0a0a0a', 'science.org': '#0a6ebd',
        'news.mit.edu': '#8a1b1a', 'hai.stanford.edu': '#8c1515',
        'cacm.acm.org': '#00529b', 'pnas.org': '#0a6ebd',
        'reddit.com': '#ff4500', 'youtube.com': '#ff0000',
    };
    return map[tag] || '#6e7681';
}

const RSS_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="18" r="2.4" fill="currentColor"/><path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 5.5A14 14 0 0 1 18.5 19.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 生成单文件 SPA：侧边栏分类 + 卡片式无限滚动 + 日历视图
export function renderSPA(data) {
    const dataJson = JSON.stringify(data).replace(/<\/script>/g, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSS 订阅</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(RSS_ICON.replace('currentColor', '%23f0883e'))}">
<style>
:root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2128;--border:#21262d;--border2:#30363d;--text:#e6edf3;--text2:#c9d1d9;--muted:#7d8590;--muted2:#6e7681;--accent:#f0883e;--blue:#58a6ff;--sidebar-w:240px}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text2);line-height:1.6;font-size:14px;-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh}

/* 侧边栏 */
.sidebar{width:var(--sidebar-w);flex-shrink:0;border-right:1px solid var(--border);background:var(--bg);display:flex;flex-direction:column;overflow:hidden;transition:transform .25s ease}
.sidebar-header{padding:14px 16px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0}
.sidebar-header .logo{width:18px;height:18px;color:var(--accent);flex-shrink:0}
.sidebar-header h1{font-size:.95rem;font-weight:600;color:var(--text)}
.search-wrap{padding:8px 12px;flex-shrink:0}
#search{width:100%;padding:6px 10px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:.8rem;outline:none}
#search:focus-visible{border-color:var(--blue)}
.cat-list{flex:1;overflow-y:auto;padding:4px 0}
.cat-item{display:flex;align-items:center;gap:8px;padding:6px 16px;width:100%;background:none;border:none;cursor:pointer;color:var(--muted);font-size:.84rem;transition:background .1s,color .1s;text-align:left;font-family:inherit}
.cat-item:hover{background:var(--surface);color:var(--text2)}
.cat-item:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.cat-item.active{background:var(--surface2);color:var(--text);font-weight:600}
.cat-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.cat-item .label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-item .count{font-size:.72rem;color:var(--muted2);font-variant-numeric:tabular-nums;flex-shrink:0}
.cat-item.active .count{color:var(--muted)}
.cat-item .err-badge{font-size:.64rem;color:var(--accent);flex-shrink:0;margin-left:2px}
.failed-sources{border-top:1px solid var(--border);padding:8px 12px;flex-shrink:0;max-height:180px;overflow-y:auto;display:none}
.failed-sources.show{display:block}
.failed-sources summary{font-size:.72rem;color:var(--accent);cursor:pointer;user-select:none;padding:2px 0}
.failed-sources ul{list-style:none;margin-top:6px}
.failed-sources li{font-size:.7rem;color:var(--muted2);padding:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.failed-sources li .err-src{color:var(--muted)}
.failed-sources li .err-msg{color:var(--accent);margin-left:4px}
.time-filter{padding:8px 12px;border-top:1px solid var(--border);display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap}
.time-filter button{flex:1;padding:4px 8px;background:var(--surface);border:1px solid var(--border2);border-radius:5px;color:var(--muted);font-size:.72rem;cursor:pointer;transition:background .1s,color .1s;font-family:inherit}
.time-filter button:hover{background:var(--surface2);color:var(--text2)}
.time-filter button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.time-filter button.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.time-filter button:disabled{opacity:.4;cursor:not-allowed}

/* 内容区 */
.content{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.content-header{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0}
.menu-toggle{display:none;background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:4px}
.content-header h2{font-size:.95rem;font-weight:600;color:var(--text)}
.content-header .updated{font-size:.72rem;color:var(--muted2);margin-left:auto}
.card-list{flex:1;overflow-y:auto;padding:4px 0}
.card{display:block;padding:10px 20px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:background .1s}
.card:hover{background:var(--surface)}
.card.fresh{border-left:3px solid var(--accent);padding-left:17px}
.card.unread{background:rgba(88,166,255,.06)}
.card-row1{display:flex;align-items:baseline;gap:6px;margin-bottom:2px}
.card-row1 .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;align-self:center}
.card-row1 .src{font-size:.74rem;color:var(--muted);flex-shrink:0;font-weight:500}
.card-row1 .title{color:var(--text2);font-size:.85rem;font-weight:500;flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card:hover .title{color:var(--blue)}
.card.fresh .title{color:var(--accent)}
.card:hover.fresh .title{color:var(--accent)}
.card-desc{font-size:.72rem;color:var(--muted2);padding-left:13px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card-row2{font-size:.7rem;color:var(--muted2);padding-left:13px;display:flex;gap:6px;align-items:center;margin-top:2px}
.card-row2 .cat-tag{padding:1px 6px;background:var(--surface2);border-radius:3px;font-size:.66rem}
.card-row2 .unread-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);flex-shrink:0}
.sentinel{height:1px;min-height:1px}
.empty{padding:60px 20px;text-align:center;color:var(--muted2);font-size:.85rem}

/* 视图切换 */
.view-toggle{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:2px;flex-shrink:0}
.view-toggle button{background:none;border:none;color:var(--muted);font-size:.76rem;padding:3px 10px;border-radius:4px;cursor:pointer;transition:background .1s,color .1s;font-family:inherit}
.view-toggle button:hover{color:var(--text2)}
.view-toggle button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.view-toggle button.active{background:var(--surface2);color:var(--text)}

/* 视图面板 */
.view-pane{flex:1;display:flex;flex-direction:column;overflow:hidden}
.view-pane.hidden{display:none}

/* 日历视图 */
.cal-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.cal-toolbar{display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid var(--border);flex-shrink:0}
.cal-toolbar button{background:var(--surface);border:1px solid var(--border2);color:var(--muted);font-size:.78rem;padding:3px 10px;border-radius:5px;cursor:pointer;transition:background .1s,color .1s;font-family:inherit}
.cal-toolbar button:hover{background:var(--surface2);color:var(--text2)}
.cal-toolbar button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.cal-toolbar .cal-month-label{font-size:.88rem;font-weight:600;color:var(--text);margin:0 auto}
.cal-search-hint{font-size:.7rem;color:var(--muted2);margin-left:8px}
.cal-search-hint button{background:none;border:none;color:var(--accent);cursor:pointer;font-size:.7rem;padding:0;font-family:inherit}
.cal-grid-wrap{padding:12px 20px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;max-width:640px;margin:0 auto}
.cal-dow{text-align:center;font-size:.72rem;color:var(--muted2);padding:4px 0;font-weight:500}
.cal-day{aspect-ratio:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 5px;cursor:pointer;display:flex;flex-direction:column;gap:2px;transition:background .1s,border-color .1s;overflow:hidden;font-family:inherit;text-align:left}
.cal-day:hover{background:var(--surface2);border-color:var(--border2)}
.cal-day:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.cal-day.outside{opacity:.4}
.cal-day.today{border-color:var(--accent)}
.cal-day.sel{background:var(--surface2);border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}
.cal-day.empty{cursor:default}
.cal-day.empty:hover{background:var(--surface);border-color:var(--border)}
.cal-dnum{font-size:.76rem;color:var(--text2);font-weight:500}
.cal-day.today .cal-dnum{color:var(--accent);font-weight:700}
.cal-count{font-size:.64rem;color:var(--muted);font-variant-numeric:tabular-nums}
.cal-dots{display:flex;gap:2px;flex-wrap:wrap;margin-top:auto}
.cal-dots span{width:5px;height:5px;border-radius:50%}
.cal-day-section{flex:1;display:flex;flex-direction:column;overflow:hidden}
.cal-day-label{padding:8px 20px;border-bottom:1px solid var(--border);font-size:.8rem;color:var(--muted);flex-shrink:0}
.cal-day-list{flex:1;overflow-y:auto;padding:4px 0}
@media(max-width:860px){
  .cal-grid{max-width:none}
  .cal-day{padding:2px 3px}
  .cal-dots span{width:3px;height:3px}
  .cal-grid-wrap{padding:8px 12px}
  .cal-toolbar{padding:8px 12px;gap:4px}
  .cal-toolbar button{padding:3px 8px;font-size:.72rem}
  .cal-month-label{font-size:.8rem}
}

/* 移动端 */
.menu-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40}
@media(max-width:860px){
  .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .menu-toggle{display:block}
  .menu-overlay.show{display:block}
}
@media(prefers-color-scheme:light){:root{--bg:#fff;--surface:#f6f8fa;--surface2:#eef1f4;--border:#eaeef2;--border2:#d0d7de;--text:#1f2328;--text2:#1f2328;--muted:#57606a;--muted2:#57606a;--blue:#0969da;--accent:#d97706}}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar" id="sidebar" aria-label="分类导航">
  <div class="sidebar-header">
    <span class="logo">${RSS_ICON}</span>
    <h1>RSS 订阅</h1>
  </div>
  <div class="search-wrap">
    <input id="search" placeholder="搜索标题、源名" type="search" aria-label="搜索条目">
  </div>
  <nav class="cat-list" id="cat-list" aria-label="分类列表"></nav>
  <details class="failed-sources" id="failed-sources">
    <summary></summary>
    <ul id="failed-list"></ul>
  </details>
  <div class="time-filter" id="time-filter" role="group" aria-label="时间筛选">
    <button data-time="all" class="active" type="button">全部</button>
    <button data-time="today" type="button">24h</button>
    <button data-time="week" type="button">7天</button>
    <button data-time="month" type="button">30天</button>
  </div>
</aside>
<div class="menu-overlay" id="overlay"></div>
<main class="content">
  <div class="content-header">
    <button class="menu-toggle" id="menu-toggle" aria-label="切换菜单">☰</button>
    <h2 id="header-title">全部</h2>
    <span class="updated" id="updated"></span>
    <div class="view-toggle" id="view-toggle" role="group" aria-label="视图切换">
      <button data-view="list" class="active" type="button">列表</button>
      <button data-view="calendar" type="button">日历</button>
    </div>
  </div>
  <div class="view-pane" id="list-pane">
    <div class="card-list" id="list"></div>
  </div>
  <div class="view-pane hidden" id="cal-pane">
    <div class="cal-wrap" id="cal-wrap">
      <div class="cal-toolbar">
        <button id="cal-prev" type="button" aria-label="上一月">‹</button>
        <span class="cal-month-label" id="cal-month-label"></span>
        <span class="cal-search-hint" id="cal-search-hint" style="display:none"></span>
        <button id="cal-next" type="button" aria-label="下一月">›</button>
        <button id="cal-today" type="button">今天</button>
      </div>
      <div class="cal-grid-wrap">
        <div class="cal-grid" id="cal-grid" role="grid" aria-label="日历"></div>
      </div>
      <div class="cal-day-section">
        <div class="cal-day-label" id="cal-day-label">点击日期查看条目</div>
        <div class="cal-day-list" id="cal-day-list"></div>
      </div>
    </div>
  </div>
</main>
</div>
<script>
const DATA = ${dataJson};
const BATCH = 50;
const FRESH_SET = new Set(DATA.freshIds || []);
// 分类查表：渲染时按 id 取标题/主题色，模块级常量避免每次渲染重建
const CAT_NAMES = {}; for (const c of DATA.categories) CAT_NAMES[c.id] = c.title;
const CAT_COLOR = {}; for (const c of DATA.categories) CAT_COLOR[c.id] = c.color;
const READ_KEY = 'rss-read-ids';
const READ_MAX = 2000;

// 已读状态：localStorage 持久化，点击卡片标记已读
let readSet = new Set();
try { readSet = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch {}
function markRead(id) {
    if (readSet.has(id)) return;
    readSet.add(id);
    if (readSet.size > READ_MAX) { const arr = [...readSet].slice(-READ_MAX); readSet = new Set(arr); }
    try { localStorage.setItem(READ_KEY, JSON.stringify([...readSet])); } catch {}
}

let state = { cat: 'all', time: 'all', search: '', shown: BATCH, view: 'list', calMonth: new Date(), calDay: new Date(), scrollPositions: {} };
const $ = id => document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// 时间工具
function pad(n){return n<10?'0'+n:n}
function fmtTime(d){const dt=new Date(d);if(isNaN(dt))return'';return pad(dt.getHours())+':'+pad(dt.getMinutes())}
function fmtDate(d){const dt=new Date(d);if(isNaN(dt))return'';return pad(dt.getMonth()+1)+'-'+pad(dt.getDate())+' '+pad(dt.getHours())+':'+pad(dt.getMinutes())}
function dayKey(d){const dt=new Date(d);if(isNaN(dt))return'';return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())}

// 时间范围过滤
function inTimeRange(d,range){
  if(range==='all')return true;
  const ts=new Date(d).getTime();if(isNaN(ts))return false;
  const now=Date.now();
  if(range==='today')return now-ts<86400000;
  if(range==='week')return now-ts<604800000;
  if(range==='month')return now-ts<2592000000;
  return true;
}

// 过滤条目
function filtered(){
  let items=DATA.items;
  if(state.cat!=='all')items=items.filter(it=>it.category===state.cat);
  if(state.search){const q=state.search.toLowerCase();items=items.filter(it=>it.title.toLowerCase().includes(q)||it.source.toLowerCase().includes(q))}
  items=items.filter(it=>inTimeRange(it.pubDate,state.time));
  return items;
}

// 渲染侧边栏分类列表 + 失败源折叠区
function renderSidebar(){
  const counts={all:DATA.items.length};
  const errCounts={all:0};
  for(const c of DATA.categories){counts[c.id]=0;errCounts[c.id]=0}
  for(const it of DATA.items)if(counts[it.category]!==undefined)counts[it.category]++;
  for(const s of DATA.sources)if(s.error&&errCounts[s.category]!==undefined)errCounts[s.category]++;

  let html='<button class="cat-item'+(state.cat==='all'?' active':'')+'" data-cat="all" type="button"'+(state.cat==='all'?' aria-current="true"':'')+'><span class="dot" style="background:var(--accent)"></span><span class="label">全部</span><span class="count">'+counts.all+'</span></button>';
  for(const c of DATA.categories){
    const errBadge=errCounts[c.id]>0?'<span class="err-badge" title="'+errCounts[c.id]+' 个源失败">⚠'+errCounts[c.id]+'</span>':'';
    html+='<button class="cat-item'+(state.cat===c.id?' active':'')+'" data-cat="'+c.id+'" type="button"'+(state.cat===c.id?' aria-current="true"':'')+'><span class="dot" style="background:'+esc(c.color)+'"></span><span class="label">'+esc(c.title)+'</span><span class="count">'+(counts[c.id]||0)+'</span>'+errBadge+'</button>';
  }
  $('cat-list').innerHTML=html;
  $('cat-list').querySelectorAll('.cat-item').forEach(el=>{
    el.addEventListener('click',()=>{
      const prev=state.cat;
      saveScroll(prev);
      state.cat=el.dataset.cat;state.shown=BATCH;render();
      location.hash=state.cat==='all'?'':state.cat;
      closeSidebar();
    });
  });

  // 失败源折叠区
  const failed=DATA.sources.filter(s=>s.error);
  const fs=$('failed-sources');
  if(failed.length){
    fs.classList.add('show');
    fs.querySelector('summary').textContent=failed.length+' 个源失败';
    $('failed-list').innerHTML=failed.map(s=>'<li><span class="err-src">'+esc(s.name)+'</span><span class="err-msg">'+esc(s.error.slice(0,60))+'</span></li>').join('');
  }else{
    fs.classList.remove('show');
  }
}

// 渲染卡片列表（无限滚动）
let scrollObserver=null;
function renderList(){
  const items=filtered();
  const catTitle=state.cat==='all'?'全部':(DATA.categories.find(c=>c.id===state.cat)||{}).title||'全部';
  const timeLabel={all:'',today:'24h · ',week:'7天 · ',month:'30天 · '}[state.time];
  $('header-title').textContent=timeLabel+catTitle+' · '+items.length+' 条';
  $('updated').textContent=DATA.items.length+' 条 · '+DATA.updated;

  if(items.length===0){$('list').innerHTML='<div class="empty">无匹配条目</div>';return}
  const visible=items.slice(0,state.shown);
  const now=Date.now();
  let html='';
  for(const it of visible){
    const isFresh=(now-new Date(it.pubDate).getTime())<86400000;
    const isUnread=FRESH_SET.has(it.id)&&!readSet.has(it.id);
    const t=new Date(it.pubDate);
    const timeStr=now-t.getTime()<86400000?fmtTime(it.pubDate):fmtDate(it.pubDate);
    const cls=['card'];
    if(isFresh)cls.push('fresh');
    if(isUnread)cls.push('unread');
    const desc=it.description?'<div class="card-desc">'+esc(it.description)+'</div>':'';
    html+='<a class="'+cls.join(' ')+'" href="'+esc(it.link)+'" target="_blank" rel="noopener" data-id="'+esc(it.id)+'">'+
      '<div class="card-row1"><span class="dot" style="background:'+(it.sourceColor||'#6e7681')+'"></span><span class="src">'+esc(it.source)+'</span><span class="title">'+esc(it.title)+'</span></div>'+
      desc+
      '<div class="card-row2"><span>'+timeStr+'</span>'+(isUnread?'<span class="unread-dot" title="未读"></span>':'')+(CAT_NAMES[it.category]?'<span class="cat-tag">'+esc(CAT_NAMES[it.category])+'</span>':'')+'</div></a>';
  }
  if(state.shown<items.length)html+='<div class="sentinel" id="sentinel"></div>';
  $('list').innerHTML=html;

  // 点击标记已读
  $('list').querySelectorAll('.card[data-id]').forEach(el=>{
    el.addEventListener('click',()=>markRead(el.dataset.id));
  });

  // 无限滚动：观察哨兵元素
  if(scrollObserver)scrollObserver.disconnect();
  const sentinel=$('sentinel');
  if(sentinel){
    scrollObserver=new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting){state.shown+=BATCH;renderList()}
    },{root:$('list'),rootMargin:'400px'});
    scrollObserver.observe(sentinel);
  }
}

// 日历视图：按天聚合计数 + 选中日期条目列表
function calFiltered(){
  let items=DATA.items;
  if(state.cat!=='all')items=items.filter(it=>it.category===state.cat);
  if(state.search){const q=state.search.toLowerCase();items=items.filter(it=>it.title.toLowerCase().includes(q)||it.source.toLowerCase().includes(q))}
  return items;
}

function renderCalendar(){
  const items=calFiltered();
  const month=state.calMonth;
  const y=month.getFullYear(),m=month.getMonth();
  const byDay={};
  for(const it of items){const k=dayKey(it.pubDate);if(!k)continue;(byDay[k]||(byDay[k]=[])).push(it)}
  $('cal-month-label').textContent=y+'年'+(m+1)+'月';
  // 搜索状态指示
  const hint=$('cal-search-hint');
  if(state.search){
    hint.style.display='inline';
    hint.innerHTML='搜索: "'+esc(state.search)+'" <button type="button" id="cal-clear-search">清除</button>';
    $('cal-clear-search').addEventListener('click',()=>{$('search').value='';state.search='';renderCalendar();renderSidebar();});
  }else{hint.style.display='none'}
  const startOff=(new Date(y,m,1).getDay()+6)%7;
  const gridStart=new Date(y,m,1-startOff);
  const todayK=dayKey(new Date());
  const selK=state.calDay?dayKey(state.calDay):'';
  let html='';
  for(const w of ['一','二','三','四','五','六','日'])html+='<div class="cal-dow">'+w+'</div>';
  for(let i=0;i<42;i++){
    const d=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i);
    const k=dayKey(d);
    const dayItems=byDay[k]||[];
    const colors=[...new Set(dayItems.map(it=>CAT_COLOR[it.category]).filter(Boolean))].slice(0,5);
    let cls='cal-day';
    if(d.getMonth()!==m)cls+=' outside';
    if(k===todayK)cls+=' today';
    if(k===selK)cls+=' sel';
    if(!dayItems.length)cls+=' empty';
    html+='<button class="'+cls+'" data-day="'+k+'" type="button"'+(k===selK?' aria-current="true"':'')+'><div class="cal-dnum">'+d.getDate()+'</div>'+
      (dayItems.length?'<div class="cal-count">'+dayItems.length+'</div>':'')+
      (colors.length?'<div class="cal-dots">'+colors.map(c=>'<span style="background:'+c+'"></span>').join('')+'</div>':'')+
      '</button>';
  }
  $('cal-grid').innerHTML=html;
  $('cal-grid').querySelectorAll('.cal-day').forEach(el=>{
    el.addEventListener('click',()=>{
      if(el.classList.contains('empty'))return;
      const dayDate=new Date(el.dataset.day+'T00:00:00');
      // 点击 outside 日期自动跳转到对应月份
      if(el.classList.contains('outside')){
        state.calMonth=new Date(dayDate.getFullYear(),dayDate.getMonth(),1);
      }
      state.calDay=dayDate;
      renderCalendar();
    });
    el.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();
        const dir=e.key==='ArrowLeft'?-1:1;
        state.calMonth=new Date(state.calMonth.getFullYear(),state.calMonth.getMonth()+dir,1);
        renderCalendar();
      }
    });
  });
  renderDayList();
}

function renderDayList(){
  if(!state.calDay){$('cal-day-label').textContent='点击日期查看条目';$('cal-day-list').innerHTML='';return}
  const k=dayKey(state.calDay);
  const items=calFiltered().filter(it=>dayKey(it.pubDate)===k);
  const d=state.calDay;
  $('cal-day-label').textContent=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' · '+items.length+' 条';
  if(!items.length){$('cal-day-list').innerHTML='<div class="empty">该日无条目</div>';return}
  const now=Date.now();
  let html='';
  for(const it of items){
    const isFresh=(now-new Date(it.pubDate).getTime())<86400000;
    const isUnread=FRESH_SET.has(it.id)&&!readSet.has(it.id);
    const t=new Date(it.pubDate);
    const cls=['card'];
    if(isFresh)cls.push('fresh');
    if(isUnread)cls.push('unread');
    html+='<a class="'+cls.join(' ')+'" href="'+esc(it.link)+'" target="_blank" rel="noopener" data-id="'+esc(it.id)+'">'+
      '<div class="card-row1"><span class="dot" style="background:'+(it.sourceColor||'#6e7681')+'"></span><span class="src">'+esc(it.source)+'</span><span class="title">'+esc(it.title)+'</span></div>'+
      '<div class="card-row2"><span>'+pad(t.getHours())+':'+pad(t.getMinutes())+'</span>'+(isUnread?'<span class="unread-dot" title="未读"></span>':'')+(CAT_NAMES[it.category]?'<span class="cat-tag">'+esc(CAT_NAMES[it.category])+'</span>':'')+'</div></a>';
  }
  $('cal-day-list').innerHTML=html;
  $('cal-day-list').querySelectorAll('.card[data-id]').forEach(el=>{
    el.addEventListener('click',()=>markRead(el.dataset.id));
  });
}

// 滚动位置记忆
function saveScroll(cat){
  const list=$('list');
  if(list&&state.view==='list')state.scrollPositions[cat]=list.scrollTop;
}
function restoreScroll(){
  if(state.view!=='list')return;
  const pos=state.scrollPositions[state.cat];
  if(pos!==undefined){
    requestAnimationFrame(()=>{const list=$('list');if(list)list.scrollTop=pos;});
  }
}

function render(){
  document.querySelectorAll('.cat-item').forEach(el=>{el.classList.toggle('active',el.dataset.cat===state.cat);if(el.dataset.cat===state.cat)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current')});
  document.querySelectorAll('.time-filter button').forEach(b=>b.classList.toggle('active',b.dataset.time===state.time));
  document.querySelectorAll('.view-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  // 时间筛选在日历视图下禁用而非隐藏
  const tf=$('time-filter');
  const inCal=state.view==='calendar';
  tf.querySelectorAll('button').forEach(b=>{b.disabled=inCal});
  if(inCal){
    const listPane=$('list-pane'),calPane=$('cal-pane');
    listPane.classList.add('hidden');calPane.classList.remove('hidden');
    const catTitle=state.cat==='all'?'全部':(DATA.categories.find(c=>c.id===state.cat)||{}).title||'全部';
    $('header-title').textContent=catTitle+' · '+calFiltered().length+' 条';
    $('updated').textContent=DATA.items.length+' 条 · '+DATA.updated;
    renderCalendar();
  }else{
    const listPane=$('list-pane'),calPane=$('cal-pane');
    calPane.classList.add('hidden');listPane.classList.remove('hidden');
    renderList();
    restoreScroll();
  }
}

// 移动端侧边栏
function closeSidebar(){$('sidebar').classList.remove('open');$('overlay').classList.remove('show')}
function toggleSidebar(){$('sidebar').classList.toggle('open');$('overlay').classList.toggle('show')}

// 搜索防抖
let searchTimer=null;
$('search').addEventListener('input',e=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{
    state.search=e.target.value;state.shown=BATCH;
    if(state.view==='calendar')renderCalendar();else renderList();
  },180);
});
document.querySelectorAll('.time-filter button').forEach(b=>{
  b.addEventListener('click',()=>{if(b.disabled)return;saveScroll(state.cat);state.time=b.dataset.time;state.shown=BATCH;render()});
});
document.querySelectorAll('.view-toggle button').forEach(b=>{
  b.addEventListener('click',()=>{saveScroll(state.cat);state.view=b.dataset.view;render()});
});
$('cal-prev').addEventListener('click',()=>{state.calMonth=new Date(state.calMonth.getFullYear(),state.calMonth.getMonth()-1,1);renderCalendar()});
$('cal-next').addEventListener('click',()=>{state.calMonth=new Date(state.calMonth.getFullYear(),state.calMonth.getMonth()+1,1);renderCalendar()});
$('cal-today').addEventListener('click',()=>{state.calMonth=new Date();state.calDay=new Date();renderCalendar()});
$('menu-toggle').addEventListener('click',toggleSidebar);
$('overlay').addEventListener('click',closeSidebar);

// 键盘快捷键：/ 聚焦搜索，Esc 关闭侧边栏
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'){
    e.preventDefault();$('search').focus();
  }
  if(e.key==='Escape')closeSidebar();
});

// 移动端左滑关闭侧边栏
let touchStartX=0;
$('overlay').addEventListener('touchstart',e=>{touchStartX=e.touches[0].clientX});
$('overlay').addEventListener('touchend',e=>{
  if(touchStartX-e.changedTouches[0].clientX>50)closeSidebar();
});

const hashCat=location.hash.slice(1);
if(hashCat&&DATA.categories.some(c=>c.id===hashCat))state.cat=hashCat;
renderSidebar();
render();
</script>
</body>
</html>`;
}
