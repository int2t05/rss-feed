// B站直连：WBI 签名 + cookie/buvid + dm_img 指纹，纯 HTTP 无需浏览器
// 逻辑参考 RSSHub lib/routes/bilibili/{video,dynamic,utils,cache}.ts
// 作为 /bilibili/user/{video,dynamic}/:uid 路由的优化路径，避开公共实例对 B站的风控/限流
import crypto from 'node:crypto';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
// WBI mixin key 重排表（RSSHub cache.ts 注释确认的固定值）
const MIXIN = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const headers = (ref) => ({ 'User-Agent': UA, Referer: ref });

// 配置 cookie（GitHub Secrets 注入）：有则用登录态，无则匿名 buvid
// RSSHub cache.ts 确认配置 cookie 后纯 HTTP 可跑、风控大幅降低（热门 UP 匿名请求易触发 -352）
// 去除粘贴时可能带入的换行符，避免 Node fetch Headers 校验失败
const COOKIE_ENV = (process.env.BILIBILI_COOKIE || '').replace(/[\r\n]+/g, '').trim();

// dm_img 设备指纹生成（提取自 RSSHub utils.ts，纯计算）
function gauss(mean, std) {
    const u1 = Math.random(), u2 = Math.random();
    return Math.round(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std + mean);
}
function dmImgList() {
    const x = Math.max(gauss(1245, 5), 0), y = Math.max(gauss(1285, 5), 0);
    return JSON.stringify([{ x: 3 * x + 2 * y, y: 4 * x - 5 * y, z: 0, timestamp: Math.max(gauss(30, 5), 0), type: 0 }]);
}
const TAG_CODE = { a:4,article:29,button:7,div:2,em:27,form:17,h1:11,h2:12,h3:13,h4:14,h5:15,h6:16,img:5,input:6,label:25,li:10,ol:9,option:20,p:3,section:28,select:19,span:1,strong:26,table:21,td:23,textarea:18,th:24,tr:22,ul:8 };
function dmImgInter() {
    const of = (t, l) => { const s = Math.floor(514 * Math.random()); return [3*t+2*l+s, 4*t-4*l+2*s, s]; };
    const wh = (w, h) => { const s = Math.floor(114 * Math.random()); return [2*w+2*h+3*s, 4*w-h+s, s]; };
    const c = (cls) => Buffer.from(cls).toString('base64').slice(0, -2);
    const p1 = wh(274, 601), s1 = of(134, 30), p2 = wh(332, 64), s2 = of(1101, 338);
    return JSON.stringify({ ds: [
        { t: TAG_CODE.div, c: c('clearfix g-search search-container'), p: [p1[0], p1[2], p1[1]], s: [s1[2], s1[0], s1[1]] },
        { t: TAG_CODE.div, c: c('wrapper'), p: [p2[0], p2[2], p2[1]], s: [s2[2], s2[0], s2[1]] },
    ], wh: wh(1245, 1285), of: of(0, 0) });
}

// dm_img_str：WebGL 渲染信息（base64），随机选常见 GPU 避免固定 'no webgl' 被识别
const GPUS = [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)' },
];
function dmWebglStr() {
    const gpu = GPUS[Math.floor(Math.random() * GPUS.length)];
    return Buffer.from(JSON.stringify({ renderer: 'WebKit WebGL', vendor: gpu.vendor, version: 'WebGL 1.0', unmasked_vendor: gpu.vendor, unmasked_renderer: gpu.renderer })).toString('base64').slice(0, -2);
}

// 运行内缓存：mixin_key（B站偶尔换）与匿名 buvid（finger/spi）
let cachedMixin, cachedCookie;

async function getMixinKey() {
    if (cachedMixin) return cachedMixin;
    const nav = await fetch('https://api.bilibili.com/x/web-interface/nav', { headers: headers('https://www.bilibili.com/') }).then((r) => r.json());
    const { img_url, sub_url } = nav.data.wbi_img;
    const r = img_url.slice(img_url.lastIndexOf('/') + 1).split('.')[0] + sub_url.slice(sub_url.lastIndexOf('/') + 1).split('.')[0];
    return (cachedMixin = MIXIN.map((i) => r[i]).join('').slice(0, 32));
}

async function getCookie() {
    if (COOKIE_ENV) return COOKIE_ENV;
    if (cachedCookie) return cachedCookie;
    const spi = await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: headers('https://www.bilibili.com/') }).then((r) => r.json());
    return (cachedCookie = `buvid3=${spi.data.b_3}; buvid4=${spi.data.b_4}`);
}

// WBI 签名：参数排序 + wts + md5(verifyParam + '&wts=' + wts + mixinKey)
function sign(params, mixinKey) {
    const wts = Math.floor(Date.now() / 1000);
    const sorted = new URLSearchParams(params);
    sorted.sort();
    const w_rid = md5(sorted.toString() + '&wts=' + wts + mixinKey);
    return `${params}&w_rid=${w_rid}&wts=${wts}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 带重试的 B站 API 请求：每次重试重新生成 dm_img 指纹并重签名，失败时 console.warn 暴露真实错误码
// buildUrl 接收 mixinKey 返回签名后的完整 URL；parseItems 从 data 提取条目数组
async function fetchWithRetry(uid, buildUrl, parseItems) {
    const mixinKey = await getMixinKey();
    const cookie = await getCookie();
    const h = { ...headers(`https://space.bilibili.com/${uid}`), Cookie: cookie };

    let lastErr = '未知错误';
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await sleep(1500 * attempt);
        try {
            const url = buildUrl(mixinKey);
            const res = JSON.parse(await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) }).then((r) => r.text()));
            if (res.code === 0) return parseItems(res.data ?? {});
            lastErr = `code ${res.code}: ${res.message}`;
            console.warn(`[bilibili uid=${uid}] attempt ${attempt + 1}/3 失败: ${lastErr}`);
        } catch (e) {
            lastErr = e.message;
            console.warn(`[bilibili uid=${uid}] attempt ${attempt + 1}/3 异常: ${lastErr}`);
        }
    }
    throw new Error(`B站风控，3 次重试失败（${lastErr}）`);
}

// UP 主投稿视频列表：/bilibili/user/video/:uid
export async function fetchBilibiliVideos(uid) {
    const dmStr = dmWebglStr();
    return fetchWithRetry(uid, (mixinKey) => {
        const params = `mid=${uid}&ps=30&tid=0&pn=1&keyword=&order=pubdate&platform=web&web_location=1550101&order_avoided=true&dm_img_list=${dmImgList()}&dm_img_str=${dmStr}&dm_cover_img_str=${dmStr}&dm_img_inter=${dmImgInter()}`;
        return 'https://api.bilibili.com/x/space/wbi/arc/search?' + sign(params, mixinKey);
    }, (data) => {
        const vlist = data.list?.vlist ?? [];
        return vlist.map((v) => ({
            title: v.title,
            link: v.bvid ? `https://www.bilibili.com/video/${v.bvid}` : `https://www.bilibili.com/video/av${v.aid}`,
            id: v.bvid || String(v.aid),
            pubDate: new Date(v.created * 1000).toUTCString(),
            author: v.author,
        }));
    });
}

// UP 主动态列表（图文/转发/视频投稿动态）：/bilibili/user/dynamic/:uid
// 走 polymer web-dynamic v1 feed space API，需 cookie（匿名对热门 UP 易 -352）
export async function fetchBilibiliDynamics(uid) {
    return fetchWithRetry(uid, (mixinKey) => {
        const params = `host_mid=${uid}&offset=&features=itemOpusStyle`;
        return 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?' + sign(params, mixinKey);
    }, (data) => {
        const items = data.items ?? [];
        return items.map((it) => {
            const mod = it.modules || {};
            const author = mod.module_author || {};
            const dyn = mod.module_dynamic || {};
            const major = dyn.major || {};
            // 动态类型多样：视频投稿取 archive.title，图文取 desc.text，专栏取 opus.summary.text
            const title = major.archive?.title || dyn.desc?.text || major.opus?.summary?.text || '动态';
            return {
                title: title.length > 60 ? title.slice(0, 60) + '…' : title,
                link: `https://t.bilibili.com/${it.id_str}`,
                id: it.id_str,
                pubDate: new Date((author.pub_ts || 0) * 1000).toUTCString(),
                author: author.name || '',
            };
        });
    });
}
