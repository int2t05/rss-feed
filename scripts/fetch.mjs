// 通用 RSS 同步脚本：拉取 feed → rss-parser 解析 → 去重 → 生成静态仪表盘
// 纯拉取架构：直链源直接 fetch，RSSHub 路由源走实例池轮换，零服务
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { renderHTML } from './render.mjs';
import { fetchBilibiliVideos } from './bilibili.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 RSS-Feed-Subscriber' } });

// 读取行式配置，忽略空行与 # 注释
function readLines(file) {
    return readFileSync(path.join(ROOT, file), 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
}

// 解析订阅列表：名称 | URL
const sources = readLines('config.txt').map((line) => {
    const [name, ...urlParts] = line.split('|');
    return { name: name.trim(), url: urlParts.join('|').trim() };
});

const instances = readLines('instances.txt');

// 读取去重状态：{ url: [条目ID...] }
const statePath = path.join(ROOT, 'state.json');
let state = {};
try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
} catch {
    state = {};
}
const newState = { ...state };

// RSSHub 路由源：实例池轮换 fetch，返回 RSS XML 文本
async function fetchFromRsshub(route) {
    for (const base of instances) {
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
    // B站路由直连 B站 API（避开公共 RSSHub 实例对 B站的风控/限流）
    const biliMatch = source.url.match(/^\/bilibili\/user\/video\/(\w+)/);
    if (biliMatch) {
        return await fetchBilibiliVideos(biliMatch[1]);
    }
    let xml;
    if (source.url.startsWith('/')) {
        xml = await fetchFromRsshub(source.url);
    } else if (source.url.startsWith('http')) {
        const res = await fetch(source.url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 RSS-Feed-Subscriber' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        xml = await res.text();
    } else {
        throw new Error('URL 必须以 / 或 http 开头');
    }
    const feed = await parser.parseString(xml);
    return feed.items.map((it) => ({
        title: it.title || '(无标题)',
        link: it.link || '',
        id: it.guid || it.link || it.title,
        pubDate: it.isoDate || it.pubDate || '',
        author: it.creator || it.author || '',
    }));
}

// 逐个拉取并去重
const results = [];
for (const s of sources) {
    let items;
    try {
        items = await fetchItems(s);
    } catch (error) {
        // 源失败时保留旧状态，不丢失历史
        newState[s.url] = state[s.url] || [];
        results.push({ ...s, error: error.message, items: [], fresh: [] });
        continue;
    }
    const seen = new Set(state[s.url] || []);
    const fresh = items.filter((it) => !seen.has(it.id));
    // 新条目 ID 置前，合并历史，保留最近 100 条避免无限增长
    newState[s.url] = [...new Set([...fresh.map((i) => i.id), ...(state[s.url] || [])])].slice(0, 100);
    results.push({ ...s, items, fresh });
}

const updated = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + ' · 每 30 分钟同步';

writeFileSync(path.join(ROOT, 'index.html'), renderHTML(results, updated));
writeFileSync(statePath, JSON.stringify(newState, null, 2));

const totalFresh = results.reduce((s, c) => s + (c.fresh?.length || 0), 0);
const errors = results.filter((c) => c.error).length;
console.log(`同步完成：${results.length} 个源，${totalFresh} 条新条目，${errors} 个源失败`);
