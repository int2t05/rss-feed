// 通用 RSS 同步脚本：拉取 feed → rss-parser 解析 → 去重 → 生成多页面仪表盘
// 纯拉取架构：直链源直接 fetch，RSSHub 路由源走实例池轮换，B站路由直连 API
// 类别/源完全由 config.txt 驱动，新增/删除类别只需改 config.txt
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { renderSPA, platformColor } from './render.mjs';
import { fetchBilibiliVideos } from './bilibili.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
mkdirSync(DIST, { recursive: true });
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 RSS-Feed-Subscriber' } });
const DEFAULT_LIMIT = 10;

// 读取行式配置，忽略空行与 # 注释
function readLines(file) {
    return readFileSync(path.join(ROOT, file), 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
}

// 解析 config.txt：分类头 [id|标题|图标|主题色] + 源行 名称|URL|显示条数
// 返回 { categories: [{id,title,icon,color}], groups: {id: [源]} }
function parseConfig(file) {
    const lines = readLines(file);
    const categories = [];
    const groups = {};
    let current = null;
    for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
            const parts = line.slice(1, -1).split('|').map((s) => s.trim());
            const cat = { id: parts[0], title: parts[1] || parts[0], icon: parts[2] || 'default', color: parts[3] || '#6e7681' };
            categories.push(cat);
            current = cat.id;
            groups[current] = [];
            continue;
        }
        if (!current) continue;
        const [name, url, limit] = line.split('|').map((s) => s.trim());
        if (!name || !url) continue;
        groups[current].push({ name, url, limit: limit ? parseInt(limit, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT });
    }
    return { categories, groups };
}

const instances = readLines('instances.txt');
const { categories: CATEGORIES, groups } = parseConfig('config.txt');

// 读取去重状态：{ url: [条目ID...] }
const statePath = path.join(DIST, 'state.json');
let state = {};
try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
} catch {
    state = {};
}
const newState = { ...state };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 限流并发执行，保持结果顺序：最多 concurrency 个 fn 同时运行
async function pmap(items, concurrency, fn) {
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

// RSSHub 路由源：实例池轮换 fetch，实例间 500ms 冷却避免连续打挂
async function fetchFromRsshub(route) {
    for (const [i, base] of instances.entries()) {
        if (i > 0) await sleep(500);
        const url = base.replace(/\/$/, '') + route;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 RSS-Feed-Subscriber' } });
            if (!res.ok) continue;
            const text = await res.text();
            if (text.includes('<rss') || text.includes('<feed') || text.includes('<rdf')) return text;
        } catch {
            // 当前实例失败，尝试下一个
        }
    }
    throw new Error('RSSHub 实例池全部失败');
}

// 拉取单个源：三路分发，返回条目数组
async function fetchItems(source) {
    const biliMatch = source.url.match(/^\/bilibili\/user\/video\/(\w+)/);
    if (biliMatch) return await fetchBilibiliVideos(biliMatch[1]);
    let xml;
    if (source.url.startsWith('/')) {
        xml = await fetchFromRsshub(source.url);
    } else if (source.url.startsWith('http')) {
        // 直链源 1 次重试（网络抖动常见，非风控）
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await fetch(source.url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 RSS-Feed-Subscriber' } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                xml = await res.text();
                break;
            } catch (e) {
                if (attempt) throw e;
                await sleep(1000);
            }
        }
    } else {
        throw new Error('URL 必须以 / 或 http 开头');
    }
    const feed = await parser.parseString(xml);
    return feed.items
        .map((it) => ({
            title: it.title || '(无标题)',
            link: it.link || '',
            id: it.guid || it.link || it.title,
            pubDate: it.isoDate || it.pubDate || '',
            author: it.creator || it.author || '',
        }))
        .filter((it) => it.pubDate && !isNaN(new Date(it.pubDate).getTime()));
}

// 逐个拉取并去重，返回带 fresh 标记的结果
async function syncSource(s) {
    let items;
    try {
        items = await fetchItems(s);
    } catch (error) {
        newState[s.url] = state[s.url] || [];
        return { ...s, error: error.message, items: [], fresh: [] };
    }
    const seen = new Set(state[s.url] || []);
    const fresh = items.filter((it) => !seen.has(it.id));
    newState[s.url] = [...new Set([...fresh.map((i) => i.id), ...(state[s.url] || [])])].slice(0, 100);
    return { ...s, items, fresh };
}

// 直链源并发（不同服务器无风控），RSSHub/B站源顺序（避免触发实例/B站限流）
const allResults = {};
for (const cat of CATEGORIES) {
    const sources = groups[cat.id] || [];
    console.log(`拉取 [${cat.title}] ${sources.length} 源...`);
    const results = new Array(sources.length);
    const directIdx = [], throttledIdx = [];
    sources.forEach((s, i) => (s.url.startsWith('http') ? directIdx : throttledIdx).push(i));
    // 两组并行：直链 5 并发 + RSSHub/B站顺序
    await Promise.all([
        pmap(directIdx.map((i) => sources[i]), 5, syncSource).then((rs) => rs.forEach((r, j) => { results[directIdx[j]] = r; })),
        (async () => { for (const i of throttledIdx) results[i] = await syncSource(sources[i]); })(),
    ]);
    allResults[cat.id] = results;
}

const updated = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + ' · 每 30 分钟同步';

// 收集全量条目（按时间倒序），供客户端日历筛选与滚动加载
const categories = CATEGORIES.map((cat) => ({ ...cat, sources: allResults[cat.id] }));
const allItems = [];
for (const cat of categories) {
    for (const src of cat.sources) {
        if (src.error) continue;
        for (const it of src.items) {
            allItems.push({
                id: it.id, title: it.title, link: it.link,
                pubDate: it.pubDate, category: cat.id,
                source: src.name, sourceColor: platformColor(src.url),
            });
        }
    }
}
allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

const data = {
    updated,
    categories: CATEGORIES.map((c) => ({ id: c.id, title: c.title, icon: c.icon, color: c.color })),
    sources: categories.flatMap((c) => c.sources.map((s) => ({ name: s.name, url: s.url, category: c.id, error: s.error || null }))),
    items: allItems,
};

// 生成单文件 SPA（内嵌 JSON，客户端渲染日历 + 滚动加载）
writeFileSync(path.join(DIST, 'index.html'), renderSPA(data));
writeFileSync(statePath, JSON.stringify(newState, null, 2));

const totalSources = categories.reduce((s, c) => s + c.sources.length, 0);
const errors = categories.reduce((s, c) => s + c.sources.filter((b) => b.error).length, 0);
console.log(`同步完成：${totalSources} 个源，${allItems.length} 条条目，${errors} 个源失败`);
